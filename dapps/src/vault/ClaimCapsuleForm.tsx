import { useState } from "react";
import { Flex, Text } from "@radix-ui/themes";
import { useDAppKit } from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";
import { VAULT_CONFIG, VAULT_MODULES, CLOCK_OBJECT_ID } from "./config";

type ClaimMode = "archive" | "private_inherit" | "dead_man";

export function ClaimCapsuleForm({ onSuccess }: { onSuccess: () => void }) {
    const dAppKit = useDAppKit();
    const [capsuleId, setCapsuleId] = useState("");
    const [claimMode, setClaimMode] = useState<ClaimMode>("archive");
    const [memberCapId, setMemberCapId] = useState("");
    const [officerCapId, setOfficerCapId] = useState("");
    const [status, setStatus] = useState("");

    const handleClaim = async () => {
        if (!capsuleId) { setStatus("Enter capsule ID"); return; }

        const { packageId, vaultObjectId, heartbeatObjectId } = VAULT_CONFIG;
        const tx = new Transaction();

        try {
            setStatus("Signing transaction...");

            if (claimMode === "archive") {
                if (!memberCapId) { setStatus("MemberCap ID required"); return; }
                tx.moveCall({
                    target: `${packageId}::${VAULT_MODULES.VAULT_CAPSULE_API}::claim_archive`,
                    arguments: [
                        tx.object(vaultObjectId),
                        tx.object(memberCapId),
                        tx.pure.u64(Number(capsuleId)),
                        tx.object(CLOCK_OBJECT_ID),
                    ],
                });
            } else if (claimMode === "private_inherit") {
                tx.moveCall({
                    target: `${packageId}::${VAULT_MODULES.VAULT_CAPSULE_API}::claim_private_inherit`,
                    arguments: [
                        tx.object(vaultObjectId),
                        tx.pure.u64(Number(capsuleId)),
                        tx.object(CLOCK_OBJECT_ID),
                    ],
                });
            } else if (claimMode === "dead_man") {
                if (!officerCapId) { setStatus("OfficerCap ID required"); return; }
                if (!heartbeatObjectId) { setStatus("VITE_HEARTBEAT_OBJECT_ID not set"); return; }
                tx.moveCall({
                    target: `${packageId}::${VAULT_MODULES.VAULT_HEARTBEAT_API}::trigger_dead_man`,
                    arguments: [
                        tx.object(vaultObjectId),
                        tx.object(heartbeatObjectId),
                        tx.object(officerCapId),
                        tx.pure.u64(Number(capsuleId)),
                        tx.object(CLOCK_OBJECT_ID),
                    ],
                });
            }

            const result = await dAppKit.signAndExecute({ transaction: tx });
            setStatus(`Claimed! Digest: ${result.digest}`);
            onSuccess();
        } catch (err) {
            setStatus(`Error: ${err instanceof Error ? err.message : err}`);
        }
    };

    return (
        <Flex direction="column" gap="3" style={{ maxWidth: 400 }}>
            <Text size="3" weight="bold">Claim Capsule</Text>

            <label>
                Claim mode:
                <select
                    value={claimMode}
                    onChange={(e) => setClaimMode(e.target.value as ClaimMode)}
                    style={{ marginLeft: 8, padding: "4px 8px" }}
                >
                    <option value="archive">Archive (member)</option>
                    <option value="private_inherit">Private Inherit (beneficiary)</option>
                    <option value="dead_man">Dead Man (officer trigger)</option>
                </select>
            </label>

            <label>
                Capsule ID:
                <input
                    type="number"
                    value={capsuleId}
                    onChange={(e) => setCapsuleId(e.target.value)}
                    placeholder="0"
                    style={{ marginLeft: 8, padding: "4px", width: 80 }}
                />
            </label>

            {claimMode === "archive" && (
                <label>
                    MemberCap ID:
                    <input
                        type="text"
                        value={memberCapId}
                        onChange={(e) => setMemberCapId(e.target.value)}
                        placeholder="0x..."
                        style={{ width: "100%", padding: "4px", marginTop: 4 }}
                    />
                </label>
            )}

            {claimMode === "dead_man" && (
                <label>
                    OfficerCap ID:
                    <input
                        type="text"
                        value={officerCapId}
                        onChange={(e) => setOfficerCapId(e.target.value)}
                        placeholder="0x..."
                        style={{ width: "100%", padding: "4px", marginTop: 4 }}
                    />
                </label>
            )}

            <button type="button" onClick={handleClaim} style={{ padding: "8px 16px", cursor: "pointer" }}>
                Claim
            </button>

            {status && <Text size="2" color={status.startsWith("Error") ? "red" : undefined}>{status}</Text>}
        </Flex>
    );
}
