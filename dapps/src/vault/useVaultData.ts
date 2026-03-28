/// Hook to fetch vault capsule data via GraphQL.
import { useEffect, useState } from "react";
import { getObjectWithJson, getOwnedObjectsByType } from "@evefrontier/dapp-kit";
import { VAULT_CONFIG, MODE_LABELS } from "./config";

export type CapsuleInfo = {
    capsuleId: number;
    creator: string;
    mode: number;
    modeLabel: string;
    unlockTimeMs: number;
    beneficiary: string;
    claimed: boolean;
};

export type VaultData = {
    guildId: string;
    capsuleCount: number;
    capsules: CapsuleInfo[];
};

export function useVaultData() {
    const [vaultData, setVaultData] = useState<VaultData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchVault = async () => {
        if (!VAULT_CONFIG.vaultObjectId) {
            setError("VITE_VAULT_OBJECT_ID not configured");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await getObjectWithJson(VAULT_CONFIG.vaultObjectId);
            const json = result.data?.object?.asMoveObject?.contents?.json as any;

            if (!json) {
                setError("Vault object not found");
                return;
            }

            setVaultData({
                guildId: json.guild_id || "",
                capsuleCount: Number(json.next_capsule_id || 0),
                capsules: [], // Capsules are in Table (dynamic fields), need separate queries
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch vault");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVault();
    }, []);

    return { vaultData, loading, error, refetch: fetchVault };
}
