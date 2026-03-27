/**
 * Walrus storage for Guild Time Vault.
 * Uses @mysten/walrus SDK with CurrentAccountSigner from dapp-kit.
 */

import { SuiGrpcClient } from "@mysten/sui/grpc";
import { walrus } from "@mysten/walrus";
import type { Signer } from "@mysten/sui/cryptography";

function getWalrusClient() {
  return new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(walrus());
}

/**
 * Upload data to Walrus. Signer pays storage fees.
 * In dApp: `const signer = new CurrentAccountSigner(dAppKit)`
 */
export async function walrusUpload(
  data: Uint8Array,
  signer: Signer,
  opts?: { epochs?: number; deletable?: boolean },
) {
  const client = getWalrusClient();
  const result = await client.walrus.writeBlob({
    blob: data,
    deletable: opts?.deletable ?? true,
    epochs: opts?.epochs ?? 5,
    signer,
  });
  return { blobId: result.blobId, blobObjectId: result.blobObject.id };
}

/**
 * Download data from Walrus by blob ID.
 */
export async function walrusDownload(blobId: string): Promise<Uint8Array> {
  const client = getWalrusClient();
  const [file] = await client.walrus.getFiles({ ids: [blobId] });
  return file.bytes();
}
