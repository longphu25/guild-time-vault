import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import {
  fetchVault,
  fetchCapsules,
  fetchHeartbeat,
  detectUserRole,
  type CapsuleData,
  type VaultData,
  type HeartbeatData,
  type UserRole,
} from "@/lib/vault-reader";

export interface VaultState {
  vault: VaultData | null;
  capsules: CapsuleData[];
  heartbeat: HeartbeatData | null;
  role: UserRole;
  capId?: string;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVault(): VaultState {
  const account = useCurrentAccount();

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
    queryKey: ["heartbeat"],
    queryFn: fetchHeartbeat,
    staleTime: 30_000,
  });

  const roleQuery = useQuery({
    queryKey: ["role", account?.address],
    queryFn: () => detectUserRole(account!.address),
    enabled: !!account?.address,
    staleTime: 60_000,
  });

  const refetch = useCallback(() => {
    vaultQuery.refetch();
    capsulesQuery.refetch();
    heartbeatQuery.refetch();
    roleQuery.refetch();
  }, [vaultQuery, capsulesQuery, heartbeatQuery, roleQuery]);

  return {
    vault: vaultQuery.data ?? null,
    capsules: capsulesQuery.data ?? [],
    heartbeat: heartbeatQuery.data ?? null,
    role: roleQuery.data?.role ?? "guest",
    capId: roleQuery.data?.capId,
    loading: vaultQuery.isLoading || capsulesQuery.isLoading || heartbeatQuery.isLoading,
    error: vaultQuery.error?.message ?? capsulesQuery.error?.message ?? null,
    refetch,
  };
}
