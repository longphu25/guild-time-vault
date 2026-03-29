import { SuiGrpcClient } from "@mysten/sui/grpc";
import { vaultConfig } from "./vault-config";
import { TYPES } from "./contract";

const GQL = "https://graphql.testnet.sui.io/graphql";

export const client = new SuiGrpcClient({
  network: "testnet",
  baseUrl: "https://fullnode.testnet.sui.io:443",
});

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

export interface GuildVaultInfo {
  vaultId: string;
  guildId: string;
  creator: string;
  createdAt: number;
  capsuleCount: number;
}

export interface GuildMember {
  address: string;
  role: "member" | "officer";
  capId: string;
  guildId: string;
}

export type UserRole = "leader" | "officer" | "member" | "guest";

export interface UserVaultObjects {
  role: UserRole;
  capId?: string;
  memberCapId?: string;
  officerCapId?: string;
  heartbeatId?: string;
  heartbeatVaultId?: string;
}

// ── Helpers ──

function b64ToBytes(b64: string): number[] {
  try { return Array.from(atob(b64), (c) => c.charCodeAt(0)); } catch { return []; }
}

// ── Read functions ──

export async function fetchVault(vaultId: string): Promise<VaultData | null> {
  const res = await client.getObject({ objectId: vaultId, include: { json: true } });
  const json = res.object?.json as Record<string, any> | undefined;
  if (!json) return null;
  return {
    id: vaultId,
    guild_id: json.guild_id,
    next_capsule_id: Number(json.next_capsule_id),
    capsules_table_id: json.capsules?.id ?? "",
  };
}

export async function fetchHeartbeat(heartbeatId: string): Promise<HeartbeatData | null> {
  const res = await client.getObject({ objectId: heartbeatId, include: { json: true } });
  const json = res.object?.json as Record<string, any> | undefined;
  if (!json) return null;
  return {
    id: heartbeatId,
    vault_id: json.vault_id,
    last_ping_ms: Number(json.last_ping_ms),
    timeout_ms: Number(json.timeout_ms),
  };
}

export async function fetchCapsules(vaultId: string): Promise<CapsuleData[]> {
  const vault = await fetchVault(vaultId);
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

/** Auto-detect user's owned vault objects (OfficerCap, MemberCap, Heartbeat) */
export async function detectUserVaultObjects(address: string): Promise<UserVaultObjects> {
  let officerCapId: string | undefined;
  let memberCapId: string | undefined;
  let heartbeatId: string | undefined;
  let heartbeatVaultId: string | undefined;

  const officerRes = await client.listOwnedObjects({ owner: address, type: TYPES.officerCap, limit: 1, include: { json: true } });
  if (officerRes.objects?.length > 0) {
    officerCapId = officerRes.objects[0].objectId;
  }

  const memberRes = await client.listOwnedObjects({ owner: address, type: TYPES.memberCap, limit: 1 });
  if (memberRes.objects?.length > 0) {
    memberCapId = memberRes.objects[0].objectId;
  }

  const hbRes = await client.listOwnedObjects({ owner: address, type: TYPES.heartbeat, limit: 1, include: { json: true } });
  if (hbRes.objects?.length > 0) {
    heartbeatId = hbRes.objects[0].objectId;
    heartbeatVaultId = (hbRes.objects[0] as any).json?.vault_id;
  }

  const role: UserRole = officerCapId ? "officer" : memberCapId ? "member" : "guest";
  return { role, capId: officerCapId ?? memberCapId, memberCapId, officerCapId, heartbeatId, heartbeatVaultId };
}

/** Fetch all vaults — from VaultRegistry if populated, fallback GraphQL */
export async function fetchAllVaults(): Promise<GuildVaultInfo[]> {
  // Try registry first
  try {
    const registryId = vaultConfig.registryId;
    if (registryId) {
      const res = await client.getObject({ objectId: registryId, include: { json: true } });
      const json = res.object?.json as Record<string, any> | undefined;
      const vaultAddrs: string[] = json?.vault_list ?? [];
      const entriesTableId: string = json?.entries?.id ?? "";

      if (vaultAddrs.length > 0 && entriesTableId) {
        const vaults: GuildVaultInfo[] = [];
        for (const addr of vaultAddrs) {
          try {
            const vaultRes = await client.getObject({ objectId: addr, include: { json: true } });
            const vj = vaultRes.object?.json as Record<string, any> | undefined;
            // Read entry from table via dynamic field
            let creator = "", createdAt = 0;
            try {
              const dyn = await client.listDynamicFields({ parentId: entriesTableId });
              for (const f of dyn.dynamicFields ?? []) {
                const obj = await client.getObject({ objectId: f.fieldId, include: { json: true } });
                const entry = (obj.object?.json as any)?.value;
                if (entry?.vault_addr === addr) {
                  creator = entry.creator ?? "";
                  createdAt = Number(entry.created_at_ms ?? 0);
                  break;
                }
              }
            } catch { /* skip */ }
            vaults.push({
              vaultId: addr,
              guildId: vj?.guild_id ?? "",
              creator,
              createdAt,
              capsuleCount: Number(vj?.capsules?.size ?? 0),
            });
          } catch { /* skip */ }
        }
        return vaults;
      }
    }
  } catch { /* fallback */ }

  // Fallback: GraphQL
  const type = `${vaultConfig.packageId}::vault_core::GuildVault`;
  const res = await fetch(GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `{ objects(filter: { type: "${type}" }) { nodes { address asMoveObject { contents { json } } } } }`,
    }),
  });
  const json = await res.json();
  return (json.data?.objects?.nodes ?? []).map((n: any) => ({
    vaultId: n.address,
    guildId: n.asMoveObject?.contents?.json?.guild_id ?? "",
    creator: "",
    createdAt: 0,
    capsuleCount: Number(n.asMoveObject?.contents?.json?.capsules?.size ?? 0),
  }));
}

/** Fetch heartbeat by vault ID via GraphQL (public, no ownership needed) */
export async function fetchHeartbeatByVaultId(vaultId: string): Promise<HeartbeatData | null> {
  const type = `${vaultConfig.packageId}::vault_core::Heartbeat`;
  const res = await fetch(GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `{ objects(filter: { type: "${type}" }) { nodes { address asMoveObject { contents { json } } } } }`,
    }),
  });
  const json = await res.json();
  const nodes = json.data?.objects?.nodes ?? [];
  for (const n of nodes) {
    const hb = n.asMoveObject?.contents?.json;
    if (hb?.vault_id === vaultId) {
      return {
        id: n.address,
        vault_id: hb.vault_id,
        last_ping_ms: Number(hb.last_ping_ms),
        timeout_ms: Number(hb.timeout_ms),
      };
    }
  }
  return null;
}

/** Fetch guild members via GraphQL */
export async function fetchGuildMembers(guildId: string): Promise<GuildMember[]> {
  async function queryCapsByType(type: string): Promise<GuildMember[]> {
    const r = type.includes("Officer") ? "officer" as const : "member" as const;
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
      role: r,
      capId: n.address,
      guildId: n.asMoveObject?.contents?.json?.guild_id ?? "",
    }));
  }

  const [members, officers] = await Promise.all([
    queryCapsByType(TYPES.memberCap),
    queryCapsByType(TYPES.officerCap),
  ]);
  return [...officers, ...members].filter((m) => m.guildId === guildId);
}
