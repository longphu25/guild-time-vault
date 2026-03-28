/// Ping heartbeat to keep dead-man switch alive.
/// Usage: bun ts-scripts/guild_time_vault/heartbeat.ts
import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { getEnvConfig, handleError, initializeContext, requireEnv } from "../utils/helper";
import { MODULE } from "./modules";
import { CLOCK_OBJECT_ID } from "../utils/constants";

async function main() {
    console.log("============= Heartbeat Ping ==============\n");

    try {
        const env = getEnvConfig();
        const ctx = initializeContext(env.network, env.adminExportedKey);
        const { client, keypair } = ctx;

        const packageId = requireEnv("VAULT_PACKAGE_ID");
        const heartbeatId = requireEnv("HEARTBEAT_OBJECT_ID");

        const tx = new Transaction();

        tx.moveCall({
            target: `${packageId}::${MODULE.VAULT_HEARTBEAT_API}::heartbeat`,
            arguments: [
                tx.object(heartbeatId),
                tx.object(CLOCK_OBJECT_ID),
            ],
        });

        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: { showEffects: true },
        });

        console.log("Heartbeat pinged!");
        console.log("Transaction digest:", result.digest);
    } catch (error) {
        handleError(error);
    }
}

main();
