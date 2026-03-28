/// Grant GuildOfficerCap to a target address.
/// Usage: NEW_OFFICER_ADDRESS=0x... bun ts-scripts/guild_time_vault/grant-officer.ts
import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { getEnvConfig, handleError, initializeContext, requireEnv } from "../utils/helper";
import { resolveVaultObjects } from "./vault-ids";
import { MODULE } from "./modules";

async function main() {
    console.log("============= Grant Officer ==============\n");

    try {
        const env = getEnvConfig();
        const ctx = initializeContext(env.network, env.adminExportedKey);
        const { client, keypair } = ctx;
        const { packageId, vaultId, officerCapId } = resolveVaultObjects();
        const newOfficerAddress = requireEnv("NEW_OFFICER_ADDRESS");

        console.log("Granting OfficerCap to:", newOfficerAddress);

        const tx = new Transaction();

        tx.moveCall({
            target: `${packageId}::${MODULE.VAULT_ROLES}::grant_officer`,
            arguments: [
                tx.object(officerCapId),
                tx.object(vaultId),
                tx.pure.address(newOfficerAddress),
            ],
        });

        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: { showEffects: true, showObjectChanges: true },
        });

        console.log("Officer granted!");
        console.log("Transaction digest:", result.digest);

        const changes = result.objectChanges || [];
        for (const change of changes) {
            if (change.type === "created" && ((change as any).objectType || "").includes("GuildOfficerCap")) {
                console.log("  NEW_OFFICER_CAP_ID=", change.objectId);
            }
        }
    } catch (error) {
        handleError(error);
    }
}

main();
