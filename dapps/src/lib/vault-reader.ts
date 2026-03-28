import { SuiGrpcClient } from "@mysten/sui/grpc";
import { vaultConfig } from "./vault-config";
import { TYPES } from "./contract";

const GQL = "https://graphql.testnet.sui.io/graphql";

const client = new SuiGrpcClient({
  network: "testnet",
  baseUrl: "https://fullnode.testnet.sui.io:443",
});

export { client };

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

// ── Helpers ──

/** Decode base64 string to byte array (for walrus_blob_id / seal_policy_id) */
function b64ToBytes(b64: string): number[] {
  try {
    return Array.from(atob(b64), (c) => c.charCodeAt(0));
  } catch {
    return [];
  }
}

// ── Read functions ──

export async function fetchVault(): Promise<VaultData | null> {
  const res = await client.getObject({ objectId: vaultConfig.vaultObjectId, include: { json: true } });
  const json = res.object?.json as Record<string, any> | undefined;
  if (!json) return null;
  return {
    id: vaultConfig.vaultObjectId,
    guild_id: json.guild_id,
    next_capsule_id: Number(json.next_capsule_id),
    capsules_table_id: json.capsules?.id ?? "",
  };
}

export async function fetchHeartbeat(): Promise<HeartbeatData | null> {
  const res = await client.getObject({ objectId: vaultConfig.heartbeatObjectId, include: { json: true } });
  const json = res.object?.json as Record<string, any> | undefined;
  if (!json) return null;
  return {
    id: vaultConfig.heartbeatObjectId,
    vault_id: json.vault_id,
    last_ping_ms: Number(json.last_ping_ms),
    timeout_ms: Number(json.timeout_ms),
  };
}

export async function fetchCapsules(): Promise<CapsuleData[]> {
  const vault = await fetchVault();
  if (!vault?.capsules_table_id) return [];

  const dyn = await client.listDynamicFields({ parentId: vault.capsules_table_id });
  const capsules: CapsuleData[] = [];

  for (const field of dyn.dynamicFields ?? []) {
    try {
      const obj = await client.getObject({ objectId: field.fieldId, include: { json: true } });
      const json = obj.object?.json as Record<string, any> | undefined;
      const f = json?.value ?? json;
      if (f && f.mode !== undefined) {
        capsules.push({
          id: field.fieldId,
          capsule_id: Number(json?.name ?? 0),
          guild_id: f.guild_id ?? vault.guild_id,
          creator: f.creator,
          mode: Number(f.mode),
          unlock_time_ms: Number(f.unlock_time_ms),
          beneficiary: f.beneficiary,
          walrus_blob_id: typeof f.walrus_blob_id === "string" ? b64ToBytes(f.walrus_blob_id) : (f.walrus_blob_id ?? []),
          seal_policy_id: typeof f.seal_policy_id === "string" ? b64ToBytes(f.seal_policy_id) : (f.seal_policy_id ?? []),
          claimed: f.claimed === true || f.claimed === "true",
        });
      }
    } catch { /* skip */ }
  }
  return capsules.sort((a, b) => a.unlock_time_ms - b.unlock_time_ms);
}

export type UserRole = "leader" | "officer" | "member" | "guest";

export async function detectUserRole(address: string): Promise<{ role: UserRole; capId?: string; memberCapId?: string; officerCapId?: string }> {
  let officerCapId: string | undefined;
  let memberCapId: string | undefined;

  const officerRes = await client.listOwnedObjects({ owner: address, type: TYPES.officerCap, limit: 1 });
  if (officerRes.objects?.length > 0) officerCapId = officerRes.objects[0].objectId;

  const memberRes = await client.listOwnedObjects({ owner: address, type: TYPES.memberCap, limit: 1 });
  if (memberRes.objects?.length > 0) memberCapId = memberRes.objects[0].objectId;

  const role: UserRole = officerCapId ? "officer" : memberCapId ? "member" : "guest";
  return { role, capId: officerCapId ?? memberCapId, memberCapId, officerCapId };
}

export interface GuildMember {
  address: string;
  role: "member" | "officer";
  capId: string;
  guildId: string;
}

async function queryCapsByType(type: string): Promise<GuildMember[]> {
  const role = type.includes("Officer") ? "officer" as const : "member" as const;
  const res = await fetch(GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `{ objects(filter: { type: "${type}" }) { nodes { address owner { ... on AddressOwner { address { address } } } asMoveObject { contents { json } } } } }`,
    }),
  });
  const json = await res.json();
  return (json.data?.objects?.nodes ?? []).map((n: any) => ({
    address: n.owner?.address?.address ?? "",
    role,
    capId: n.address,
    guildId: n.asMoveObject?.contents?.json?.guild_id ?? "",
  }));
}

export async function fetchGuildMembers(): Promise<GuildMember[]> {
  const [members, officers] = await Promise.all([
    queryCapsByType(TYPES.memberCap),
    queryCapsByType(TYPES.officerCap),
  ]);
  // Filter by current vault's guild_id
  const vaultData = await fetchVault();
  const guildId = vaultData?.guild_id ?? "";
  return [...officers, ...members].filter((m) => m.guildId === guildId);
}
