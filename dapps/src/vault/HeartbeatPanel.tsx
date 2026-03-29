import { useEffect, useState } from "react";
import { Flex, Text } from "@radix-ui/themes";
import { useDAppKit, useCurrentAccount } from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";
import { VAULT_CONFIG, VAULT_MODULES, CLOCK_OBJECT_ID } from "./config";
import { findOwnedHeartbeat } from "@/lib/vault-reader";

export function HeartbeatPanel() {
    const dAppKit = useDAppKit();
    const account = useCurrentAccount();
    const [status, setStatus] = useState("");
    const [heartbeatId, setHeartbeatId] = useState<string | null>(null);

    useEffect(() => {
        if (!account?.address) return;
        findOwnedHeartbeat(account.address).then(setHeartbeatId);
    }, [account?.address]);

    const handlePing = async () => {
        if (!heartbeatId) {
            setStatus("No Heartbeat object found in your wallet");
            return;
        }

        try {
            setStatus("Signing...");
            const tx = new Transaction();
            tx.moveCall({
                target: `${VAULT_CONFIG.packageId}::${VAULT_MODULES.VAULT_HEARTBEAT_API}::heartbeat`,
                arguments: [
                    tx.object(heartbeatId),
                    tx.object(CLOCK_OBJECT_ID),
                ],
            });

            const result = await dAppKit.signAndExecute({
                transaction: tx,
            });
            setStatus(`Pinged! Digest: ${result.digest}`);
        } catch (err) {
            setStatus(
                `Error: ${err instanceof Error ? err.message : err}`,
            );
        }
    };

    return (
        <Flex direction="column" gap="3" style={{ maxWidth: 400 }}>
            <Text size="3" weight="bold">
                Heartbeat (Dead Man Switch)
            </Text>
            <Text size="2">
                Ping periodically to keep the dead-man switch alive.
                If you stop pinging past the timeout, officers can
                trigger dead-man capsules.
            </Text>
            {heartbeatId && (
                <Text size="1">Heartbeat: {heartbeatId.slice(0, 16)}...</Text>
            )}
            <button
                onClick={handlePing}
                type="button"
                style={{ padding: "8px 16px", cursor: "pointer", width: "fit-content" }}
            >
                Ping Now
            </button>
            {status && (
                <Text
                    size="2"
                    color={status.startsWith("Error") ? "red" : undefined}
                >
                    {status}
                </Text>
            )}
        </Flex>
    );
}
