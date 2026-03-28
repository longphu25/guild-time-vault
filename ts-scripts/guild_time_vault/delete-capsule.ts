/// Officer deletes a capsule (cleanup / error correction).
/// Usage: CAPSULE_ID=0 bun ts-scripts/guild_time_vault/delete-capsule.ts
import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { getEnvConfig, handleError, initializeContext, requireEnv } from "../utils/helper";
import { resolveVaultObjects } from "./vault-ids";
import { MODULE } from "./modules";

async function main() {
    console.log("============= Delete Capsule ==============\n");

    try {
        const env = getEnvConfig();
        const ctx = initializeContext(env.network, env.adminExportedKey);
        const { client, keypair } = ctx;
        const { packageId, vaultId, officerCapId } = resolveVaultObjects();

        if (!officerCapId) throw new Error("OFFICER_CAP_ID required");
        const capsuleId = Number(requireEnv("CAPSULE_ID"));

        console.log("Deleting capsule:", capsuleId);

        const tx = new Transaction();

        tx.moveCall({
            target: `${packageId}::${MODULE.VAULT_CAPSULE_API}::delete_capsule`,
            arguments: [
                tx.object(officerCapId),
                tx.object(vaultId),
                tx.pure.u64(capsuleId),
            ],
        });

        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: { showEffects: true },
        });

        console.log("Capsule deleted!");
        console.log("Transaction digest:", result.digest);
    } catch (error) {
        handleError(error);
    }
}

main();
