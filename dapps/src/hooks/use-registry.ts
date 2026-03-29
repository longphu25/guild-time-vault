/// Hook to fetch VaultRegistry data via GraphQL.
import { useCallback, useEffect, useState } from "react";
import { getObjectWithJson } from "@evefrontier/dapp-kit";
import { VAULT_CONFIG } from "../vault/config";

export type RegistryVaultEntry = {
    vaultAddr: string;
    guildId: string;
    creator: string;
    createdAtMs: number;
};

export type RegistryData = {
    vaultCount: number;
    entries: RegistryVaultEntry[];
};

export function useRegistryData() {
    const [data, setData] = useState<RegistryData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRegistry = useCallback(async () => {
        if (!VAULT_CONFIG.registryObjectId) {
            setError("VITE_VAULT_REGISTRY_ID not configured");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await getObjectWithJson(VAULT_CONFIG.registryObjectId);
            const json = (result.data?.object as Record<string, unknown>)?.asMoveObject as
                | { contents?: { json?: Record<string, unknown> } }
                | undefined;
            const fields = json?.contents?.json;

            if (!fields) {
                setError("VaultRegistry object not found");
                return;
            }

            const vaultList = (fields.vault_list as string[] | undefined) ?? [];
            const entries: RegistryVaultEntry[] = vaultList.map((addr) => ({
                vaultAddr: addr,
                guildId: "",
                creator: "",
                createdAtMs: 0,
            }));

            setData({ vaultCount: vaultList.length, entries });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch registry");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRegistry();
    }, [fetchRegistry]);

    return { data, loading, error, refetch: fetchRegistry };
}
