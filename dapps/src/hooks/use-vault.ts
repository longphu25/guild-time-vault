import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { useSearchParams } from "react-router";
import {
  fetchVault,
  fetchCapsules,
  fetchHeartbeat,
  fetchHeartbeatByVaultId,
  detectUserVaultObjects,
  fetchGuildMembers,
  type CapsuleData,
  type VaultData,
  type HeartbeatData,
  type UserRole,
  type GuildMember,
} from "@/lib/vault-reader";

export interface VaultState {
  vault: VaultData | null;
  vaultId?: string;
  capsules: CapsuleData[];
  heartbeat: HeartbeatData | null;
  heartbeatId?: string;
  members: GuildMember[];
  role: UserRole;
  capId?: string;
  memberCapId?: string;
  officerCapId?: string;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVault(): VaultState {
  const account = useCurrentAccount();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // Vault ID from URL param or session or auto-detect from user's heartbeat
  const urlVaultId = searchParams.get("id") ?? undefined;

  // Persist selected vault across navigation
  useEffect(() => {
    if (urlVaultId) sessionStorage.setItem("selectedVaultId", urlVaultId);
  }, [urlVaultId]);

  const savedVaultId = typeof window !== "undefined" ? sessionStorage.getItem("selectedVaultId") ?? undefined : undefined;

  useEffect(() => {
    queryClient.invalidateQueries();
  }, [account?.address, queryClient]);

  // Auto-detect user's owned objects
  const userObjQuery = useQuery({
    queryKey: ["userObjects", account?.address],
    queryFn: () => detectUserVaultObjects(account!.address),
    enabled: !!account?.address,
    staleTime: 60_000,
  });

  // Determine vault ID: URL param > saved session > user's heartbeat vault
  const vaultId = urlVaultId ?? savedVaultId ?? userObjQuery.data?.heartbeatVaultId;

  const vaultQuery = useQuery({
    queryKey: ["vault", vaultId],
    queryFn: () => fetchVault(vaultId!),
    enabled: !!vaultId,
    staleTime: 30_000,
  });

  const capsulesQuery = useQuery({
    queryKey: ["capsules", vaultId],
    queryFn: () => fetchCapsules(vaultId!),
    enabled: !!vaultId,
    staleTime: 30_000,
  });

  const heartbeatId = userObjQuery.data?.heartbeatId;
  const heartbeatQuery = useQuery({
    queryKey: ["heartbeat", heartbeatId ?? vaultId],
    queryFn: async () => {
      // Try owned heartbeat first, fallback to GraphQL by vault_id
      if (heartbeatId) return fetchHeartbeat(heartbeatId);
      if (vaultId) return fetchHeartbeatByVaultId(vaultId);
      return null;
    },
    enabled: !!(heartbeatId || vaultId),
    staleTime: 30_000,
  });

  const guildId = vaultQuery.data?.guild_id;
  const membersQuery = useQuery({
    queryKey: ["members", guildId],
    queryFn: () => fetchGuildMembers(guildId!),
    enabled: !!guildId,
    staleTime: 60_000,
  });

  const refetch = useCallback(() => {
    userObjQuery.refetch();
    vaultQuery.refetch();
    capsulesQuery.refetch();
    heartbeatQuery.refetch();
    membersQuery.refetch();
  }, [userObjQuery, vaultQuery, capsulesQuery, heartbeatQuery, membersQuery]);

  // Filter caps by current vault's guild_id
  const vaultGuildId = vaultQuery.data?.guild_id;
  const userObj = userObjQuery.data;
  const matchedOfficerCap = userObj?.officerCaps.find((c) => c.guildId === vaultGuildId);
  const matchedMemberCap = userObj?.memberCaps.find((c) => c.guildId === vaultGuildId);
  const effectiveRole: UserRole = matchedOfficerCap ? "officer" : matchedMemberCap ? "member" : "guest";
  const effectiveCapId = matchedOfficerCap?.id ?? matchedMemberCap?.id;

  return {
    vault: vaultQuery.data ?? null,
    vaultId,
    capsules: capsulesQuery.data ?? [],
    heartbeat: heartbeatQuery.data ?? null,
    heartbeatId: heartbeatId ?? heartbeatQuery.data?.id,
    members: membersQuery.data ?? [],
    role: effectiveRole,
    capId: effectiveCapId,
    memberCapId: matchedMemberCap?.id,
    officerCapId: matchedOfficerCap?.id,
    loading: (!!vaultId && vaultQuery.isLoading) || (!!vaultId && capsulesQuery.isLoading),
    error: vaultQuery.error?.message ?? null,
    refetch,
  };
}
