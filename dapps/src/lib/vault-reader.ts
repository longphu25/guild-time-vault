import { vaultConfig } from "./vault-config";
import { TYPES } from "./contract";

const RPC = "https://fullnode.testnet.sui.io:443";

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  return json.result;
}

// ── Types ──

export interface CapsuleData {
  id: string;
  capsule_id: number;
  guild_id: string;
  creator: string;
  mode: number;
  unlock_time_ms: number;
  beneficiary: string;
  walrus_blob_id: number[];
  seal_policy_id: number[];
  claimed: boolean;
}

export interface VaultData {
  id: string;
  guild_id: string;
  next_capsule_id: number;
  capsules_table_id: string;
}

export interface HeartbeatData {
  id: string;
  vault_id: string;
  last_ping_ms: number;
  timeout_ms: number;
}

// ── Read functions ──

export async function fetchVault(): Promise<VaultData | null> {
  const res = await rpc("sui_getObject", [vaultConfig.vaultObjectId, { showContent: true }]);
  const fields = res?.data?.content?.fields;
  if (!fields) return null;
  return {
    id: vaultConfig.vaultObjectId,
    guild_id: fields.guild_id,
    next_capsule_id: Number(fields.next_capsule_id),
    capsules_table_id: fields.capsules?.fields?.id?.id ?? "",
  };
}

export async function fetchHeartbeat(): Promise<HeartbeatData | null> {
  const res = await rpc("sui_getObject", [vaultConfig.heartbeatObjectId, { showContent: true }]);
  const fields = res?.data?.content?.fields;
  if (!fields) return null;
  return {
    id: vaultConfig.heartbeatObjectId,
    vault_id: fields.vault_id,
    last_ping_ms: Number(fields.last_ping_ms),
    timeout_ms: Number(fields.timeout_ms),
  };
}

export async function fetchCapsules(): Promise<CapsuleData[]> {
  // First get the table ID from vault
  const vault = await fetchVault();
  if (!vault?.capsules_table_id) return [];

  // Dynamic fields are on the Table object, not the vault
  let cursor: string | null = null;
  const capsules: CapsuleData[] = [];

  do {
    const res = await rpc("suix_getDynamicFields", [vault.capsules_table_id, cursor, 50]);
    for (const field of res?.data ?? []) {
      try {
        const obj = await rpc("suix_getDynamicFieldObject", [
          vault.capsules_table_id,
          { type: field.name.type, value: field.name.value },
        ]);
        const f = obj?.data?.content?.fields?.value?.fields ?? obj?.data?.content?.fields;
        if (f && f.mode !== undefined) {
          capsules.push({
            id: field.objectId,
            capsule_id: Number(field.name.value),
            guild_id: f.guild_id ?? vault.guild_id,
            creator: f.creator,
            mode: Number(f.mode),
            unlock_time_ms: Number(f.unlock_time_ms),
            beneficiary: f.beneficiary,
            walrus_blob_id: f.walrus_blob_id ?? [],
            seal_policy_id: f.seal_policy_id ?? [],
            claimed: f.claimed === true || f.claimed === "true",
          });
        }
      } catch { /* skip */ }
    }
    cursor = res?.nextCursor ?? null;
  } while (cursor);

  return capsules.sort((a, b) => a.unlock_time_ms - b.unlock_time_ms);
}

export type UserRole = "leader" | "officer" | "member" | "guest";

export async function detectUserRole(address: string): Promise<{ role: UserRole; capId?: string }> {
  // Check officer cap
  const officerRes = await rpc("suix_getOwnedObjects", [
    address, { filter: { StructType: TYPES.officerCap } }, null, 1,
  ]);
  if (officerRes?.data?.length > 0) {
    return { role: "officer", capId: officerRes.data[0].data?.objectId };
  }

  // Check member cap
  const memberRes = await rpc("suix_getOwnedObjects", [
    address, { filter: { StructType: TYPES.memberCap } }, null, 1,
  ]);
  if (memberRes?.data?.length > 0) {
    return { role: "member", capId: memberRes.data[0].data?.objectId };
  }

  return { role: "guest" };
}
