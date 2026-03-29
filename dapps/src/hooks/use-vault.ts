import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import {
  fetchVault,
  fetchCapsules,
  fetchHeartbeatById,
  findOwnedHeartbeat,
  detectUserRole,
  fetchGuildMembers,
  type CapsuleData,
  type VaultData,
  type HeartbeatData,
  type UserRole,
  type GuildMember,
} from "@/lib/vault-reader";

export interface VaultState {
  vault: VaultData | null;
  capsules: CapsuleData[];
  heartbeat: HeartbeatData | null;
  members: GuildMember[];
  role: UserRole;
  capId?: string;
  memberCapId?: string;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVault(): VaultState {
  const account = useCurrentAccount();
  const queryClient = useQueryClient();

  // Clear all cache when account changes
  useEffect(() => {
    queryClient.invalidateQueries();
  }, [account?.address, queryClient]);

  const vaultQuery = useQuery({
    queryKey: ["vault"],
    queryFn: fetchVault,
    staleTime: 30_000,
  });

  const capsulesQuery = useQuery({
    queryKey: ["capsules"],
    queryFn: fetchCapsules,
    staleTime: 30_000,
  });

  const heartbeatQuery = useQuery({
    queryKey: ["heartbeat", account?.address],
    queryFn: async () => {
      if (!account?.address) return null;
      const hbId = await findOwnedHeartbeat(account.address);
      if (!hbId) return null;
      return fetchHeartbeatById(hbId);
    },
    enabled: !!account?.address,
    staleTime: 30_000,
  });

  const roleQuery = useQuery({
    queryKey: ["role", account?.address],
    queryFn: () => detectUserRole(account!.address),
    enabled: !!account?.address,
    staleTime: 60_000,
  });

  const membersQuery = useQuery({
    queryKey: ["members"],
    queryFn: fetchGuildMembers,
    staleTime: 60_000,
  });

  const refetch = useCallback(() => {
    vaultQuery.refetch();
    capsulesQuery.refetch();
    heartbeatQuery.refetch();
    roleQuery.refetch();
    membersQuery.refetch();
  }, [vaultQuery, capsulesQuery, heartbeatQuery, roleQuery, membersQuery]);

  return {
    vault: vaultQuery.data ?? null,
    capsules: capsulesQuery.data ?? [],
    heartbeat: heartbeatQuery.data ?? null,
    members: membersQuery.data ?? [],
    role: roleQuery.data?.role ?? "guest",
    capId: roleQuery.data?.capId,
    memberCapId: roleQuery.data?.memberCapId,
    loading: !vaultQuery.data && vaultQuery.isLoading,
    error: vaultQuery.error?.message ?? capsulesQuery.error?.message ?? null,
    refetch,
  };
}
