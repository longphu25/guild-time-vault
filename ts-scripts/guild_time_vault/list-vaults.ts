/**
 * Query VaultRegistry on-chain to list all registered vaults.
 * Usage: bun run vault:list
 */
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { resolveVaultIds } from "./vault-ids";

const NETWORK_URL = process.env.SUI_RPC_URL || "https://fullnode.testnet.sui.io:443";
// devInspect needs a valid-looking sender (any 32-byte hex address works)
const DUMMY_SENDER = "0x0000000000000000000000000000000000000000000000000000000000000000";

async function main() {
    const { packageId, registryId } = resolveVaultIds();

    if (!registryId) {
        console.error("❌ VAULT_REGISTRY_ID not set in .env");
        process.exit(1);
    }

    console.log("📋 Querying VaultRegistry...");
    console.log(`   Package:  ${packageId}`);
    console.log(`   Registry: ${registryId}`);
    console.log(`   RPC:      ${NETWORK_URL}\n`);

    const client = new SuiJsonRpcClient({ url: NETWORK_URL, network: "testnet" });

    // 1. Get vault count
    const countTx = new Transaction();
    countTx.moveCall({
        target: `${packageId}::vault_registry::vault_count`,
        arguments: [countTx.object(registryId)],
    });

    const countResult = await client.devInspectTransactionBlock({
        sender: DUMMY_SENDER,
        transactionBlock: countTx,
    });

    if (countResult.effects?.status?.status !== "success") {
        console.error("❌ Failed to query vault count");
        console.error(countResult.effects?.status);
        process.exit(1);
    }

    const countBytes = countResult.results?.[0]?.returnValues?.[0]?.[0];
    if (!countBytes) {
        console.error("❌ No return value from vault_count");
        process.exit(1);
    }
    const vaultCount = bcs.u64().parse(Uint8Array.from(countBytes));
    console.log(`✅ Total vaults registered: ${vaultCount}\n`);

    if (vaultCount === 0n) {
        console.log("No vaults found. Run `bun run vault:init` to create one.");
        return;
    }

    // 2. List all vaults
    const listTx = new Transaction();
    listTx.moveCall({
        target: `${packageId}::vault_registry::list_vaults`,
        arguments: [
            listTx.object(registryId),
            listTx.pure.u64(0),
            listTx.pure.u64(Number(vaultCount)),
        ],
    });

    const listResult = await client.devInspectTransactionBlock({
        sender: DUMMY_SENDER,
        transactionBlock: listTx,
    });

    if (listResult.effects?.status?.status !== "success") {
        console.error("❌ Failed to list vaults");
        process.exit(1);
    }

    const listBytes = listResult.results?.[0]?.returnValues?.[0]?.[0];
    if (!listBytes) {
        console.error("❌ No return value from list_vaults");
        process.exit(1);
    }

    const vaultAddresses = bcs.vector(bcs.Address).parse(Uint8Array.from(listBytes));

    console.log("─── Registered Vaults ───");
    for (let i = 0; i < vaultAddresses.length; i++) {
        const addr = vaultAddresses[i];
        console.log(`\n  [${i}] Vault: ${addr}`);

        // 3. Get vault details (creator, guild_id, created_at)
        const detailTx = new Transaction();
        detailTx.moveCall({
            target: `${packageId}::vault_registry::vault_creator`,
            arguments: [detailTx.object(registryId), detailTx.pure.address(addr)],
        });
        detailTx.moveCall({
            target: `${packageId}::vault_registry::vault_guild_id`,
            arguments: [detailTx.object(registryId), detailTx.pure.address(addr)],
        });
        detailTx.moveCall({
            target: `${packageId}::vault_registry::vault_created_at`,
            arguments: [detailTx.object(registryId), detailTx.pure.address(addr)],
        });

        const detailResult = await client.devInspectTransactionBlock({
            sender: DUMMY_SENDER,
            transactionBlock: detailTx,
        });

        if (detailResult.effects?.status?.status === "success" && detailResult.results) {
            const creatorBytes = detailResult.results[0]?.returnValues?.[0]?.[0];
            const guildBytes = detailResult.results[1]?.returnValues?.[0]?.[0];
            const tsBytes = detailResult.results[2]?.returnValues?.[0]?.[0];

            if (creatorBytes) {
                const creator = bcs.Address.parse(Uint8Array.from(creatorBytes));
                console.log(`       Creator:    ${creator}`);
            }
            if (guildBytes) {
                const guildId = bcs.Address.parse(Uint8Array.from(guildBytes));
                console.log(`       Guild ID:   ${guildId}`);
            }
            if (tsBytes) {
                const createdAt = bcs.u64().parse(Uint8Array.from(tsBytes));
                console.log(`       Created at: ${new Date(Number(createdAt)).toISOString()}`);
            }
        }

        console.log(`\n  👉 Use this as VAULT_OBJECT_ID: ${addr}`);
    }

    console.log("\n─────────────────────────");
    console.log("\nTo use in dApp, set in dapps/.env:");
    console.log(`  VITE_VAULT_OBJECT_ID=${vaultAddresses[0]}`);
}

main().catch(console.error);
