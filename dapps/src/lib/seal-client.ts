/**
 * Seal encryption for Guild Time Vault.
 * Encrypt with packageId + id (BCS-encoded unlock_time_ms).
 * Decrypt requires SessionKey + seal_approve tx proving time has passed.
 */

import { SealClient, SessionKey } from "@mysten/seal";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { vaultConfig } from "./vault-config";

const SEAL_KEY_SERVERS = [
  { objectId: "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75", weight: 1 },
  { objectId: "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8", weight: 1 },
  { objectId: "0x6a0726a1ea3d62ba2f2ae51104f2c3633c003fb75621d06fde47f04dc930ba06", weight: 1 },
];

const suiClient = new SuiGrpcClient({ network: "testnet", baseUrl: "https://fullnode.testnet.sui.io:443" });

let _sealClient: SealClient | null = null;
function getSealClient(): SealClient {
  if (!_sealClient) {
    _sealClient = new SealClient({
      suiClient: suiClient as any,
      serverConfigs: SEAL_KEY_SERVERS,
      verifyKeyServers: false,
    });
  }
  return _sealClient;
}

function unlockTimeToIdHex(unlockTimeMs: number): string {
  const bytes = bcs.u64().serialize(BigInt(unlockTimeMs)).toBytes();
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Encrypt data — only decryptable after unlockTimeMs. */
export async function sealEncrypt(data: Uint8Array, unlockTimeMs: number): Promise<Uint8Array> {
  const client = getSealClient();
  const result = await client.encrypt({
    threshold: 2,
    packageId: vaultConfig.packageId,
    id: unlockTimeToIdHex(unlockTimeMs),
    data,
  });
  return result.encryptedObject;
}

/** Decrypt data — requires time >= unlockTimeMs (enforced by key servers). */
export async function sealDecrypt(encryptedData: Uint8Array, unlockTimeMs: number): Promise<Uint8Array> {
  const client = getSealClient();
  const sessionKp = new Ed25519Keypair();

  const sessionKey = await SessionKey.create({
    address: sessionKp.getPublicKey().toSuiAddress(),
    packageId: vaultConfig.packageId,
    ttlMin: 10,
    signer: sessionKp,
    suiClient: suiClient as any,
  });

  const idBytes = bcs.u64().serialize(BigInt(unlockTimeMs)).toBytes();
  const tx = new Transaction();
  tx.moveCall({
    target: `${vaultConfig.packageId}::seal_timelock::seal_approve` as `${string}::${string}::${string}`,
    arguments: [tx.pure.vector("u8", Array.from(idBytes)), tx.object("0x6")],
  });
  const txBytes = await tx.build({ client: suiClient as any, onlyTransactionKind: true });

  return client.decrypt({ data: encryptedData, sessionKey, txBytes });
}
