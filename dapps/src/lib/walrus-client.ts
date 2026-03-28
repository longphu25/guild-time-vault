/**
 * Walrus storage for Guild Time Vault.
 * Uses writeBlobFlow to avoid needing raw Signer (zkLogin wallets don't expose keypair).
 * Auto-swaps SUI→WAL if balance insufficient.
 */

import { SuiGrpcClient } from "@mysten/sui/grpc";
import { walrus } from "@mysten/walrus";
import { Transaction } from "@mysten/sui/transactions";

const WAL_COIN_TYPE = "0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL";
const WAL_EXCHANGE_PACKAGE = "0x82593828ed3fcb8c6a235eac9abd0adbe9c5f9bbffa9b1e7a45cdd884481ef9f";
const EXCHANGE_ID = "0xf4d164ea2def5fe07dc573992a029e010dba09b1a8dcbc44c5c2e79567f39073";

const suiClient = new SuiGrpcClient({ network: "testnet", baseUrl: "https://fullnode.testnet.sui.io:443" });

function getWalrusClient() {
  return suiClient.$extend(walrus({ wasmUrl: "/walrus_wasm_bg.wasm" }));
}

async function getWalBalance(owner: string): Promise<bigint> {
  const resp = await suiClient.getBalance({ owner, coinType: WAL_COIN_TYPE });
  const b = (resp as any)?.balance;
  const val = typeof b === "object" ? (b.coinBalance ?? b.balance ?? "0") : (b ?? "0");
  return BigInt(val);
}

function buildSwapTx(sender: string, amount: bigint): Transaction {
  const tx = new Transaction();
  tx.setSender(sender);
  const [suiCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);
  const walCoin = tx.moveCall({
    target: `${WAL_EXCHANGE_PACKAGE}::wal_exchange::exchange_all_for_wal`,
    arguments: [tx.object(EXCHANGE_ID), suiCoin],
  });
  tx.transferObjects([walCoin], sender);
  return tx;
}

export interface UploadProgress {
  step: "checking" | "swapping" | "registering" | "uploading" | "certifying";
  detail?: string;
}

type SignAndExecute = (args: { transaction: Transaction }) => Promise<any>;

/**
 * Upload data to Walrus using writeBlobFlow (no raw Signer needed).
 * User signs register + certify txs via wallet popup.
 * Auto-swaps SUI→WAL if balance insufficient.
 */
export async function walrusUpload(
  data: Uint8Array,
  sender: string,
  signAndExecute: SignAndExecute,
  opts?: { epochs?: number; deletable?: boolean; onProgress?: (p: UploadProgress) => void },
) {
  const client = getWalrusClient();
  const epochs = opts?.epochs ?? 5;
  const onProgress = opts?.onProgress;

  // Step 1: Encode blob
  const flow = client.walrus.writeBlobFlow({ blob: data });
  const encoded = await flow.encode();

  // Step 2: Check WAL balance vs cost
  onProgress?.({ step: "checking", detail: "Checking WAL balance..." });
  const cost = await client.walrus.storageCost(data.length, epochs);
  const walBalance = await getWalBalance(sender);

  // Step 3: Auto-swap if needed
  if (walBalance < cost.totalCost) {
    const shortage = cost.totalCost - walBalance;
    onProgress?.({ step: "swapping", detail: `Swapping ${(Number(shortage) / 1e9).toFixed(4)} SUI → WAL...` });
    const swapTx = buildSwapTx(sender, shortage);
    await signAndExecute({ transaction: swapTx });
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Step 4: Register blob (user signs)
  onProgress?.({ step: "registering", detail: "Registering blob on Walrus..." });
  const registerTx = flow.register({ deletable: opts?.deletable ?? true, epochs, owner: sender });
  registerTx.setSender(sender);
  const registerResult = await signAndExecute({ transaction: registerTx });
  const registerDigest = (registerResult as any)?.Transaction?.digest ?? (registerResult as any)?.digest;

  // Step 5: Upload blob data to storage nodes
  onProgress?.({ step: "uploading", detail: "Uploading to storage nodes..." });
  await flow.upload({ digest: registerDigest });

  // Step 6: Certify blob (user signs)
  onProgress?.({ step: "certifying", detail: "Certifying blob..." });
  const certifyTx = flow.certify();
  certifyTx.setSender(sender);
  await signAndExecute({ transaction: certifyTx });

  return { blobId: encoded.blobId };
}

/**
 * Download data from Walrus by blob ID.
 */
export async function walrusDownload(blobId: string): Promise<Uint8Array> {
  const client = getWalrusClient();
  const [file] = await client.walrus.getFiles({ ids: [blobId] });
  return file.bytes();
}
