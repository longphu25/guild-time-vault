import { SuiGrpcClient } from "@mysten/sui/grpc";
import { vaultConfig } from "./vault-config";
import { TYPES } from "./contract";

const client = new SuiGrpcClient({
  network: "testnet",
  baseUrl: "https://fullnode.testnet.sui.io:443",
});

export { client };

// ── Types matching on-chain structs ──

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
}

export interface HeartbeatData {
  id: string;
  owner: string;
  last_ping_ms: number;
  timeout_ms: number;
}

// ── Read functions ──

export async function fetchVault(): Promise<VaultData | null> {
  const res = await client.getObject({ objectId: vaultConfig.vaultObjectId, include: { content: true } });
  const fields = (res as any)?.content?.fields;
  if (!fields) return null;
  return {
    id: vaultConfig.vaultObjectId,
    guild_id: fields.guild_id,
    next_capsule_id: Number(fields.next_capsule_id),
  };
}

export async function fetchHeartbeat(): Promise<HeartbeatData | null> {
  const res = await client.getObject({ objectId: vaultConfig.heartbeatObjectId, include: { content: true } });
  const fields = (res as any)?.content?.fields;
  if (!fields) return null;
  return {
    id: vaultConfig.heartbeatObjectId,
    owner: fields.owner,
    last_ping_ms: Number(fields.last_ping_ms),
    timeout_ms: Number(fields.timeout_ms),
  };
}

export async function fetchCapsules(): Promise<CapsuleData[]> {
  const dynFields = await client.listDynamicFields({ parentId: vaultConfig.vaultObjectId });
  const capsules: CapsuleData[] = [];

  for (const field of (dynFields as any).objects ?? (dynFields as any).data ?? []) {
    try {
      const obj = await client.getObject({ objectId: field.objectId, include: { content: true } });
      const fields = (obj as any)?.content?.fields?.value?.fields ?? (obj as any)?.content?.fields;
      if (fields && fields.mode !== undefined) {
        capsules.push({
          id: field.objectId,
          capsule_id: Number(field.name?.value ?? 0),
          guild_id: fields.guild_id,
          creator: fields.creator,
          mode: Number(fields.mode),
          unlock_time_ms: Number(fields.unlock_time_ms),
          beneficiary: fields.beneficiary,
          walrus_blob_id: fields.walrus_blob_id ?? [],
          seal_policy_id: fields.seal_policy_id ?? [],
          claimed: fields.claimed === true || fields.claimed === "true",
        });
      }
    } catch { /* skip */ }
  }
  return capsules.sort((a, b) => a.unlock_time_ms - b.unlock_time_ms);
}

export type UserRole = "leader" | "officer" | "member" | "guest";

export async function detectUserRole(address: string): Promise<{ role: UserRole; capId?: string }> {
  // Check officer cap
  const officerRes = await client.listOwnedObjects({ owner: address, type: TYPES.officerCap, limit: 1 });
  const officerObjs = (officerRes as any).objects ?? [];
  if (officerObjs.length > 0) {
    return { role: "officer", capId: officerObjs[0].objectId };
  }

  // Check member cap
  const memberRes = await client.listOwnedObjects({ owner: address, type: TYPES.memberCap, limit: 1 });
  const memberObjs = (memberRes as any).objects ?? [];
  if (memberObjs.length > 0) {
    return { role: "member", capId: memberObjs[0].objectId };
  }

  return { role: "guest" };
}
