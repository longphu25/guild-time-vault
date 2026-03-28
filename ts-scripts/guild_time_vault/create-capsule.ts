/// Create a capsule in the Guild Vault.
/// Usage: MODE=0 UNLOCK_TIME_MS=... bun ts-scripts/guild_time_vault/create-capsule.ts
///
/// Modes: 0=ARCHIVE, 1=PRIVATE_INHERIT, 2=DEAD_MAN
/// For PRIVATE_INHERIT, set BENEFICIARY_ADDRESS=0x...
/// WALRUS_BLOB_ID and SEAL_POLICY_ID are hex-encoded bytes from off-chain Walrus+Seal flow.
import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { getEnvConfig, handleError, initializeContext, requireEnv } from "../utils/helper";
import { resolveVaultObjects } from "./vault-ids";
import { MODULE } from "./modules";
import { CLOCK_OBJECT_ID } from "../utils/constants";

async function main() {
    console.log("============= Create Capsule ==============\n");

    try {
        const env = getEnvConfig();
        const ctx = initializeContext(env.network, env.adminExportedKey);
        const { client, keypair, address } = ctx;
        const { packageId, vaultId, officerCapId, memberCapId } = resolveVaultObjects();

        const mode = Number(requireEnv("MODE"));
        const unlockTimeMs = Number(requireEnv("UNLOCK_TIME_MS"));
        const beneficiary = process.env.BENEFICIARY_ADDRESS || "0x0000000000000000000000000000000000000000000000000000000000000000";
        const walrusBlobId = process.env.WALRUS_BLOB_ID || "";
        const sealPolicyId = process.env.SEAL_POLICY_ID || "";

        const modeNames = ["ARCHIVE", "PRIVATE_INHERIT", "DEAD_MAN"];
        console.log("Mode:", modeNames[mode] || mode);
        console.log("Unlock time:", new Date(unlockTimeMs).toISOString());
        console.log("Beneficiary:", beneficiary);

        const tx = new Transaction();

        // Use officer cap if available, otherwise member cap
        const useOfficer = !!officerCapId;
        const target = useOfficer
            ? `${packageId}::${MODULE.VAULT_CAPSULE_API}::create_capsule_as_officer`
            : `${packageId}::${MODULE.VAULT_CAPSULE_API}::create_capsule`;
        const capId = useOfficer ? officerCapId : memberCapId;

        if (!capId) {
            throw new Error("Either OFFICER_CAP_ID or MEMBER_CAP_ID is required");
        }

        const blobBytes = walrusBlobId ? Array.from(Buffer.from(walrusBlobId.replace(/^0x/, ""), "hex")) : [];
        const sealBytes = sealPolicyId ? Array.from(Buffer.from(sealPolicyId.replace(/^0x/, ""), "hex")) : [];

        tx.moveCall({
            target,
            arguments: [
                tx.object(vaultId),
                tx.object(capId),
                tx.pure.u8(mode),
                tx.pure.u64(unlockTimeMs),
                tx.pure.address(beneficiary),
                tx.pure("vector<u8>", blobBytes),
                tx.pure("vector<u8>", sealBytes),
                tx.object(CLOCK_OBJECT_ID),
            ],
        });

        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: { showEffects: true, showEvents: true },
        });

        console.log("\nCapsule created!");
        console.log("Transaction digest:", result.digest);

        // Extract capsule_id from CapsuleCreated event
        const events = result.events || [];
        for (const event of events) {
            if (event.type.includes("CapsuleCreated")) {
                const parsed = event.parsedJson as any;
                console.log("  Capsule ID:", parsed?.capsule_id);
                console.log("  Guild ID:", parsed?.guild_id);
            }
        }
    } catch (error) {
        handleError(error);
    }
}

main();
