/**
 * Seal encryption for Guild Time Vault.
 * Based on https://seal-docs.wal.app/UsingSeal
 */

import { SealClient, SessionKey, type SealCompatibleClient } from "@mysten/seal";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { toHex } from "@mysten/sui/utils";
import { vaultConfig } from "./vault-config";

const SEAL_KEY_SERVERS = [
  { objectId: "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75", weight: 1 },
  { objectId: "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8", weight: 1 },
];

const suiClient: SealCompatibleClient = new SuiGrpcClient({
  network: "testnet",
  baseUrl: "https://fullnode.testnet.sui.io:443",
});

let _sealClient: SealClient | null = null;
function getSealClient(): SealClient {
  if (!_sealClient) {
    _sealClient = new SealClient({
      suiClient,
      serverConfigs: SEAL_KEY_SERVERS,
      verifyKeyServers: false,
    });
  }
  return _sealClient;
}

function unlockTimeToIdHex(unlockTimeMs: number): string {
  return toHex(bcs.u64().serialize(BigInt(unlockTimeMs)).toBytes());
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

/**
 * Decrypt data — user signs session key via wallet popup.
 * @param signPersonalMessage - from useDAppKit()
 */
export async function sealDecrypt(
  encryptedData: Uint8Array,
  unlockTimeMs: number,
  userAddress: string,
  signPersonalMessage: (args: { message: Uint8Array }) => Promise<{ signature: string }>,
): Promise<Uint8Array> {
  const client = getSealClient();

  const sessionKey = await SessionKey.create({
    address: userAddress,
    packageId: vaultConfig.packageId,
    ttlMin: 10,
    suiClient,
  });

  const message = sessionKey.getPersonalMessage();
  const { signature } = await signPersonalMessage({ message });
  sessionKey.setPersonalMessageSignature(signature);

  const idBytes = bcs.u64().serialize(BigInt(unlockTimeMs)).toBytes();
  const tx = new Transaction();
  tx.moveCall({
    target: `${vaultConfig.packageId}::seal_timelock::seal_approve` as `${string}::${string}::${string}`,
    arguments: [tx.pure.vector("u8", Array.from(idBytes)), tx.object("0x6")],
  });
  const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });

  return client.decrypt({ data: encryptedData, sessionKey, txBytes });
}
