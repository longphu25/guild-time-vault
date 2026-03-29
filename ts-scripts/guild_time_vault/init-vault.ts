/// Init Guild Vault — Leader creates vault + receives OfficerCap + Heartbeat.
/// Usage: bun ts-scripts/guild_time_vault/init-vault.ts
import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { getEnvConfig, handleError, initializeContext } from "../utils/helper";
import { resolveVaultIds } from "./vault-ids";
import { MODULE } from "./modules";
import { CLOCK_OBJECT_ID } from "../utils/constants";

async function main() {
    console.log("============= Init Guild Vault ==============\n");

    try {
        const env = getEnvConfig();
        const ctx = initializeContext(env.network, env.adminExportedKey);
        const { client, keypair, address } = ctx;
        const { packageId, registryId } = resolveVaultIds();

        if (!registryId) {
            console.error("VAULT_REGISTRY_ID not set. Publish the package first — the VaultRegistry is created automatically on publish (init).");
            process.exit(1);
        }

        const guildId = process.env.GUILD_ID || address;
        const timeoutMs = Number(process.env.HEARTBEAT_TIMEOUT_MS || 1_209_600_000); // 14 days default

        console.log("Leader address:", address);
        console.log("Guild ID:", guildId);
        console.log("Registry ID:", registryId);
        console.log("Heartbeat timeout:", timeoutMs, "ms");

        const tx = new Transaction();

        tx.moveCall({
            target: `${packageId}::${MODULE.VAULT_ROLES}::init_guild_vault`,
            arguments: [
                tx.object(registryId),
                tx.pure.address(guildId),
                tx.pure.u64(timeoutMs),
                tx.object(CLOCK_OBJECT_ID),
            ],
        });

        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: { showEffects: true, showObjectChanges: true },
        });

        console.log("\nVault initialized!");
        console.log("Transaction digest:", result.digest);

        // Extract created objects
        const changes = result.objectChanges || [];
        for (const change of changes) {
            if (change.type === "created") {
                const objType = (change as any).objectType || "";
                if (objType.includes("GuildVault")) {
                    console.log("\n  VAULT_OBJECT_ID=", change.objectId);
                } else if (objType.includes("Heartbeat")) {
                    console.log("  HEARTBEAT_OBJECT_ID=", change.objectId);
                } else if (objType.includes("GuildOfficerCap")) {
                    console.log("  OFFICER_CAP_ID=", change.objectId);
                }
            }
        }

        console.log("\nAdd these to your .env file.");
    } catch (error) {
        handleError(error);
    }
}

main();
