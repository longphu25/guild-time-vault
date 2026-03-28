import { useState } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { useDAppKit } from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";
import {
    VAULT_CONFIG,
    VAULT_MODULES,
    CAPSULE_MODES,
    MODE_LABELS,
    CLOCK_OBJECT_ID,
} from "./config";

export function CreateCapsuleForm({ onSuccess }: { onSuccess: () => void }) {
    const dAppKit = useDAppKit();
    const [mode, setMode] = useState(CAPSULE_MODES.ARCHIVE);
    const [unlockDate, setUnlockDate] = useState("");
    const [beneficiary, setBeneficiary] = useState("");
    const [capObjectId, setCapObjectId] = useState("");
    const [isOfficer, setIsOfficer] = useState(true);
    const [status, setStatus] = useState("");

    const handleSubmit = async () => {
        if (!capObjectId) {
            setStatus("Enter your OfficerCap or MemberCap object ID");
            return;
        }
        if (!unlockDate) {
            setStatus("Select unlock date");
            return;
        }

        const unlockTimeMs = new Date(unlockDate).getTime();
        const { packageId, vaultObjectId } = VAULT_CONFIG;

        const target = isOfficer
            ? `${packageId}::${VAULT_MODULES.VAULT_CAPSULE_API}::create_capsule_as_officer`
            : `${packageId}::${VAULT_MODULES.VAULT_CAPSULE_API}::create_capsule`;

        const benefAddr =
            beneficiary ||
            "0x0000000000000000000000000000000000000000000000000000000000000000";

        try {
            setStatus("Signing transaction...");
            const tx = new Transaction();

            tx.moveCall({
                target,
                arguments: [
                    tx.object(vaultObjectId),
                    tx.object(capObjectId),
                    tx.pure.u8(mode),
                    tx.pure.u64(unlockTimeMs),
                    tx.pure.address(benefAddr),
                    tx.pure("vector<u8>", []),  // walrus_blob_id placeholder
                    tx.pure("vector<u8>", []),  // seal_policy_id placeholder
                    tx.object(CLOCK_OBJECT_ID),
                ],
            });

            const result = await dAppKit.signAndExecute({ transaction: tx });
            setStatus(`Capsule created! Digest: ${result.digest}`);
            onSuccess();
        } catch (err) {
            setStatus(`Error: ${err instanceof Error ? err.message : err}`);
        }
    };

    return (
        <Flex direction="column" gap="3" style={{ maxWidth: 400 }}>
            <Text size="3" weight="bold">Create Capsule</Text>

            <label>
                Mode:
                <select
                    value={mode}
                    onChange={(e) => setMode(Number(e.target.value))}
                    style={{ marginLeft: 8, padding: "4px 8px" }}
                >
                    {Object.entries(MODE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                    ))}
                </select>
            </label>

            <label>
                Unlock date:
                <input
                    type="datetime-local"
                    value={unlockDate}
                    onChange={(e) => setUnlockDate(e.target.value)}
                    style={{ marginLeft: 8, padding: "4px" }}
                />
            </label>

            {mode === CAPSULE_MODES.PRIVATE_INHERIT && (
                <label>
                    Beneficiary address:
                    <input
                        type="text"
                        value={beneficiary}
                        onChange={(e) => setBeneficiary(e.target.value)}
                        placeholder="0x..."
                        style={{ width: "100%", padding: "4px", marginTop: 4 }}
                    />
                </label>
            )}

            <label>
                Cap Object ID:
                <input
                    type="text"
                    value={capObjectId}
                    onChange={(e) => setCapObjectId(e.target.value)}
                    placeholder="Your OfficerCap or MemberCap ID"
                    style={{ width: "100%", padding: "4px", marginTop: 4 }}
                />
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                    type="checkbox"
                    checked={isOfficer}
                    onChange={(e) => setIsOfficer(e.target.checked)}
                />
                Using OfficerCap
            </label>

            <button onClick={handleSubmit} style={{ padding: "8px 16px", cursor: "pointer" }}>
                Create Capsule
            </button>

            {status && <Text size="2" color={status.startsWith("Error") ? "red" : undefined}>{status}</Text>}
        </Flex>
    );
}
