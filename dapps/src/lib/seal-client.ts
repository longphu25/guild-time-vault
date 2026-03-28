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
 * Build Seal identity matching on-chain build_identity(mode, capsule_id, context_addr).
 * Format: [mode:u8][capsule_id:u64_bcs][context_addr:address_bcs]
 *
 * context_addr depends on mode:
 *   ARCHIVE:         guild_id
 *   PRIVATE_INHERIT: beneficiary
 *   DEAD_MAN:        vault_id (object address)
 */
function buildIdentityHex(mode: number, capsuleId: number, contextAddr: string): string {
  const modeBytes = bcs.u8().serialize(mode).toBytes();
  const idBytes = bcs.u64().serialize(BigInt(capsuleId)).toBytes();
  const addrBytes = bcs.Address.serialize(contextAddr).toBytes();
  const combined = new Uint8Array(modeBytes.length + idBytes.length + addrBytes.length);
  combined.set(modeBytes, 0);
  combined.set(idBytes, modeBytes.length);
  combined.set(addrBytes, modeBytes.length + idBytes.length);
  return toHex(combined);
}

/** Encrypt data using Seal with vault_seal identity. */
export async function sealEncrypt(
  data: Uint8Array,
  mode: number,
  capsuleId: number,
  contextAddr: string,
): Promise<Uint8Array> {
  const client = getSealClient();
  const result = await client.encrypt({
    threshold: 2,
    packageId: vaultConfig.packageId,
    id: buildIdentityHex(mode, capsuleId, contextAddr),
    data,
  });
  return result.encryptedObject;
}

/**
 * Decrypt data using Seal. Builds correct seal_approve_* tx based on mode.
 */
export async function sealDecrypt(
  encryptedData: Uint8Array,
  mode: number,
  capsuleId: number,
  contextAddr: string,
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
  const idHex = buildIdentityHex(mode, capsuleId, contextAddr);
  const idBytes: number[] = [];
  for (let i = 0; i < idHex.length; i += 2) {
    idBytes.push(parseInt(idHex.substring(i, i + 2), 16));
  }
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

  tx.setSender(userAddress);
  const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
  return client.decrypt({ data: encryptedData, sessionKey, txBytes });
}
