import { useState } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { abbreviateAddress } from "@evefrontier/dapp-kit";
import { useVaultData } from "./useVaultData";
import { VAULT_CONFIG } from "./config";
import { CreateCapsuleForm } from "./CreateCapsuleForm";
import { ClaimCapsuleForm } from "./ClaimCapsuleForm";
import { HeartbeatPanel } from "./HeartbeatPanel";

export function VaultDashboard() {
    const account = useCurrentAccount();
    const { vaultData, loading, error, refetch } = useVaultData();
    const [activeTab, setActiveTab] = useState<
        "overview" | "create" | "claim" | "heartbeat"
    >("overview");

    if (!VAULT_CONFIG.packageId) {
        return (
            <Box p="4">
                <Text color="red">
                    Set VITE_VAULT_PACKAGE_ID and VITE_VAULT_OBJECT_ID
                    in dapps/.env
                </Text>
            </Box>
        );
    }

    if (!account) {
        return (
            <Box p="4">
                <Text>Connect wallet to use Guild Time Vault</Text>
            </Box>
        );
    }

    const tabs = [
        { key: "overview", label: "Overview" },
        { key: "create", label: "Create Capsule" },
        { key: "claim", label: "Claim Capsule" },
        { key: "heartbeat", label: "Heartbeat" },
    ] as const;

    return (
        <Box p="4">
            <Text size="5" weight="bold" mb="3" style={{ display: "block" }}>
                Guild Time Vault
            </Text>

            {/* Tab navigation */}
            <Flex gap="2" mb="4">
                {tabs.map((tab) => (
                    <button
                        type="button"
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            padding: "8px 16px",
                            background:
                                activeTab === tab.key
                                    ? "#FAFAE5"
                                    : "transparent",
                            color:
                                activeTab === tab.key ? "#0B0B0B" : "#FAFAE5",
                            border: "1px solid #FAFAE5",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </Flex>

            {/* Tab content */}
            {activeTab === "overview" && (
                <Box>
                    {loading && <Text>Loading vault...</Text>}
                    {error && <Text color="red">{error}</Text>}
                    {vaultData && (
                        <Flex direction="column" gap="2">
                            <Text>
                                Vault:{" "}
                                {abbreviateAddress(
                                    VAULT_CONFIG.vaultObjectId,
                                )}
                            </Text>
                            <Text>Guild ID: {abbreviateAddress(vaultData.guildId)}</Text>
                            <Text>
                                Total capsules: {vaultData.capsuleCount}
                            </Text>
                            <button type="button" onClick={refetch} style={{ width: "fit-content", padding: "4px 12px", cursor: "pointer" }}>
                                Refresh
                            </button>
                        </Flex>
                    )}
                </Box>
            )}

            {activeTab === "create" && (
                <CreateCapsuleForm onSuccess={refetch} />
            )}

            {activeTab === "claim" && (
                <ClaimCapsuleForm onSuccess={refetch} />
            )}

            {activeTab === "heartbeat" && <HeartbeatPanel />}
        </Box>
    );
}
