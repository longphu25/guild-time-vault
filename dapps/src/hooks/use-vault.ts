import { useEffect, useState, useCallback } from "react";
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
  const [vault, setVault] = useState<VaultData | null>(null);
  const [capsules, setCapsules] = useState<CapsuleData[]>([]);
  const [heartbeat, setHeartbeat] = useState<HeartbeatData | null>(null);
  const [role, setRole] = useState<UserRole>("guest");
  const [capId, setCapId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [v, c, h] = await Promise.all([
        fetchVault(),
        fetchCapsules(),
        fetchHeartbeat(),
      ]);
      setVault(v);
      setCapsules(c);
      setHeartbeat(h);

      if (account?.address) {
        const r = await detectUserRole(account.address);
        setRole(r.role);
        setCapId(r.capId);
      } else {
        setRole("guest");
        setCapId(undefined);
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to load vault");
    } finally {
      setLoading(false);
    }
  }, [account?.address]);

  useEffect(() => {
    load();
  }, [load]);

  return { vault, capsules, heartbeat, role, capId, loading, error, refetch: load };
}
