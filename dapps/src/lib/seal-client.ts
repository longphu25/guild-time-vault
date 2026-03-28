/**
 * Seal encryption for Guild Time Vault.
 *
 * Uses vault_seal module on-chain:
 * - build_identity(mode, unlock_time_ms, guild_id) → Seal identity
 * - seal_approve_archive(id, vault, member_cap, clock)
 * - seal_approve_private_inherit(id, vault, clock, ctx)
 * - seal_approve_dead_man(id, vault, heartbeat, clock)
 */

import { SealClient, SessionKey, type SealCompatibleClient } from "@mysten/seal";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { toHex } from "@mysten/sui/utils";
import { vaultConfig } from "./vault-config";
import { TX, CAPSULE_MODE } from "./contract";

const SEAL_KEY_SERVERS = [
  { objectId: "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75", weight: 1 },
  { objectId: "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8", weight: 1 },
];

const SUI_CLOCK = "0x6";

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

/**
 * Build Seal identity matching on-chain build_identity(mode, unlock_time_ms, guild_id).
 * Format: BCS(mode as u8) + BCS(unlock_time_ms as u64) + BCS(guild_id as address)
 */
function buildIdentityHex(mode: number, unlockTimeMs: number, guildId: string): string {
  const modeBytes = bcs.u8().serialize(mode).toBytes();
  const timeBytes = bcs.u64().serialize(BigInt(unlockTimeMs)).toBytes();
  const addrBytes = bcs.Address.serialize(guildId).toBytes();
  const combined = new Uint8Array(modeBytes.length + timeBytes.length + addrBytes.length);
  combined.set(modeBytes, 0);
  combined.set(timeBytes, modeBytes.length);
  combined.set(addrBytes, modeBytes.length + timeBytes.length);
  return toHex(combined);
}

/** Encrypt data using Seal with vault_seal identity. */
export async function sealEncrypt(
  data: Uint8Array,
  mode: number,
  unlockTimeMs: number,
  guildId: string,
): Promise<Uint8Array> {
  const client = getSealClient();
  const result = await client.encrypt({
    threshold: 2,
    packageId: vaultConfig.packageId,
    id: buildIdentityHex(mode, unlockTimeMs, guildId),
    data,
  });
  return result.encryptedObject;
}

/**
 * Decrypt data using Seal. Builds correct seal_approve_* tx based on mode.
 * User signs session key via wallet popup.
 */
export async function sealDecrypt(
  encryptedData: Uint8Array,
  mode: number,
  unlockTimeMs: number,
  guildId: string,
  userAddress: string,
  signPersonalMessage: (args: { message: Uint8Array }) => Promise<{ signature: string }>,
  opts?: { memberCapId?: string },
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

  // Build seal_approve tx based on mode
  const idHex = buildIdentityHex(mode, unlockTimeMs, guildId);
  const idBytes = Array.from(new Uint8Array(Buffer.from(idHex, "hex")));
  const tx = new Transaction();

  if (mode === CAPSULE_MODE.ARCHIVE) {
    if (!opts?.memberCapId) throw new Error("MemberCap required to decrypt archive capsule");
    tx.moveCall({
      target: TX.sealApproveArchive,
      arguments: [
        tx.pure.vector("u8", idBytes),
        tx.object(vaultConfig.vaultObjectId),
        tx.object(opts.memberCapId),
        tx.object(SUI_CLOCK),
      ],
    });
  } else if (mode === CAPSULE_MODE.PRIVATE_INHERIT) {
    tx.moveCall({
      target: TX.sealApprovePrivateInherit,
      arguments: [
        tx.pure.vector("u8", idBytes),
        tx.object(vaultConfig.vaultObjectId),
        tx.object(SUI_CLOCK),
      ],
    });
  } else if (mode === CAPSULE_MODE.DEAD_MAN) {
    tx.moveCall({
      target: TX.sealApproveDeadMan,
      arguments: [
        tx.pure.vector("u8", idBytes),
        tx.object(vaultConfig.vaultObjectId),
        tx.object(vaultConfig.heartbeatObjectId),
        tx.object(SUI_CLOCK),
      ],
    });
  }

  const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
  return client.decrypt({ data: encryptedData, sessionKey, txBytes });
}
