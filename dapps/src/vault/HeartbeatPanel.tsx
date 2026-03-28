import { useState } from "react";
import { Flex, Text } from "@radix-ui/themes";
import { useDAppKit } from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";
import { VAULT_CONFIG, VAULT_MODULES, CLOCK_OBJECT_ID } from "./config";

export function HeartbeatPanel() {
    const dAppKit = useDAppKit();
    const [status, setStatus] = useState("");

    const { packageId, heartbeatObjectId } = VAULT_CONFIG;

    const handlePing = async () => {
        if (!heartbeatObjectId) {
            setStatus("VITE_HEARTBEAT_OBJECT_ID not configured");
            return;
        }

        try {
            setStatus("Signing...");
            const tx = new Transaction();
            tx.moveCall({
                target: `${packageId}::${VAULT_MODULES.VAULT_HEARTBEAT_API}::heartbeat`,
                arguments: [
                    tx.object(heartbeatObjectId),
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
