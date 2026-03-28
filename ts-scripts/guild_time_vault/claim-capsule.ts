/// Claim a capsule from the Guild Vault.
/// Usage: CAPSULE_ID=0 CLAIM_MODE=archive bun ts-scripts/guild_time_vault/claim-capsule.ts
///
/// CLAIM_MODE: "archive" | "private_inherit" | "dead_man"
/// For dead_man, HEARTBEAT_OBJECT_ID and OFFICER_CAP_ID are required.
import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { getEnvConfig, handleError, initializeContext, requireEnv } from "../utils/helper";
import { resolveVaultObjects } from "./vault-ids";
import { MODULE } from "./modules";
import { CLOCK_OBJECT_ID } from "../utils/constants";

async function main() {
    console.log("============= Claim Capsule ==============\n");

    try {
        const env = getEnvConfig();
        const ctx = initializeContext(env.network, env.adminExportedKey);
        const { client, keypair } = ctx;
        const ids = resolveVaultObjects();

        const capsuleId = Number(requireEnv("CAPSULE_ID"));
        const claimMode = requireEnv("CLAIM_MODE"); // archive | private_inherit | dead_man

        console.log("Capsule ID:", capsuleId);
        console.log("Claim mode:", claimMode);

        const tx = new Transaction();

        if (claimMode === "archive") {
            if (!ids.memberCapId) throw new Error("MEMBER_CAP_ID required for archive claim");
            tx.moveCall({
                target: `${ids.packageId}::${MODULE.VAULT_CAPSULE_API}::claim_archive`,
                arguments: [
                    tx.object(ids.vaultId),
                    tx.object(ids.memberCapId),
                    tx.pure.u64(capsuleId),
                    tx.object(CLOCK_OBJECT_ID),
                ],
            });
        } else if (claimMode === "private_inherit") {
            tx.moveCall({
                target: `${ids.packageId}::${MODULE.VAULT_CAPSULE_API}::claim_private_inherit`,
                arguments: [
                    tx.object(ids.vaultId),
                    tx.pure.u64(capsuleId),
                    tx.object(CLOCK_OBJECT_ID),
                ],
            });
        } else if (claimMode === "dead_man") {
            if (!ids.heartbeatId) throw new Error("HEARTBEAT_OBJECT_ID required for dead_man claim");
            if (!ids.officerCapId) throw new Error("OFFICER_CAP_ID required for dead_man claim");
            tx.moveCall({
                target: `${ids.packageId}::${MODULE.VAULT_HEARTBEAT_API}::trigger_dead_man`,
                arguments: [
                    tx.object(ids.vaultId),
                    tx.object(ids.heartbeatId),
                    tx.object(ids.officerCapId),
                    tx.pure.u64(capsuleId),
                    tx.object(CLOCK_OBJECT_ID),
                ],
            });
        } else {
            throw new Error(`Unknown CLAIM_MODE: ${claimMode}. Use: archive, private_inherit, dead_man`);
        }

        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: { showEffects: true, showEvents: true },
        });

        console.log("\nCapsule claimed!");
        console.log("Transaction digest:", result.digest);

        const events = result.events || [];
        for (const event of events) {
            if (event.type.includes("CapsuleClaimed")) {
                const parsed = event.parsedJson as any;
                console.log("  Claimant:", parsed?.claimant);
                console.log("  Time:", parsed?.time_ms);
            }
            if (event.type.includes("DeadManTriggered")) {
                const parsed = event.parsedJson as any;
                console.log("  Dead man triggered for capsule:", parsed?.capsule_id);
            }
        }
    } catch (error) {
        handleError(error);
    }
}

main();
