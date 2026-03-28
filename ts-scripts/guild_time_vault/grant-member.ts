/// Grant GuildMemberCap to a target address.
/// Usage: MEMBER_ADDRESS=0x... bun ts-scripts/guild_time_vault/grant-member.ts
import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { getEnvConfig, handleError, initializeContext, requireEnv } from "../utils/helper";
import { resolveVaultObjects } from "./vault-ids";
import { MODULE } from "./modules";

async function main() {
    console.log("============= Grant Member ==============\n");

    try {
        const env = getEnvConfig();
        const ctx = initializeContext(env.network, env.adminExportedKey);
        const { client, keypair } = ctx;
        const { packageId, vaultId, officerCapId } = resolveVaultObjects();
        const memberAddress = requireEnv("MEMBER_ADDRESS");

        console.log("Granting MemberCap to:", memberAddress);

        const tx = new Transaction();

        tx.moveCall({
            target: `${packageId}::${MODULE.VAULT_ROLES}::grant_member`,
            arguments: [
                tx.object(officerCapId),
                tx.object(vaultId),
                tx.pure.address(memberAddress),
            ],
        });

        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: { showEffects: true, showObjectChanges: true },
        });

        console.log("Member granted!");
        console.log("Transaction digest:", result.digest);

        const changes = result.objectChanges || [];
        for (const change of changes) {
            if (change.type === "created" && ((change as any).objectType || "").includes("GuildMemberCap")) {
                console.log("  MEMBER_CAP_ID=", change.objectId);
            }
        }
    } catch (error) {
        handleError(error);
    }
}

main();
