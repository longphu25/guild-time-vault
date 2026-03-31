---
description: EVE Frontier Builder Scaffold — overview, tech stack, design patterns
inclusion: auto
---

# Project Context — EVE Frontier Builder Scaffold

## Tổng quan

Builder Scaffold là bộ template và công cụ phát triển cho **EVE Frontier** — game/metaverse blockchain trên **Sui**. Framework end-to-end: Move contracts → TypeScript scripts → React dApp → zkLogin.

## Tech Stack

| Layer | Tech |
|-------|------|
| Blockchain | Sui (Layer 1) |
| Smart Contract | Move 2024, depends on `world-contracts` |
| Wallet | EVE Vault (zkLogin), Slush |
| Scripts | TypeScript, `@mysten/sui` SDK, Bun |
| Frontend | React 19, Vite, `@evefrontier/dapp-kit`, `@mysten/dapp-kit-react` |
| DevOps | Docker, PostgreSQL (indexer), Bun |

## Key Design Patterns

1. **Typed Witness**: `XAuth`/`VaultAuth` — package-restricted witness authorizes extension on assembly
2. **Capability Pattern**: `GuildMemberCap`/`GuildOfficerCap` — role-based access, no address mapping
3. **Dynamic Fields**: Config/links stored as dynamic fields on shared objects
4. **Table Collections**: `GuildVault.capsules` uses `Table<u64, Capsule>`
5. **Sponsored Tx**: Admin pays gas (dual signature: player + admin)
6. **Object ID Derivation**: Game item ID → Sui object ID via BCS `TenantItemId`
7. **Seal Access Control**: `seal_approve*` entry functions, IBE identity `[mode][capsule_id][addr]`
8. **On-chain Registry**: `VaultRegistry` auto-created on publish, tracks all vaults
9. **Wallet Object Detection**: Frontend auto-detects owned objects by type

## Testnet Deployment (Utopia v4)

```
VAULT_PACKAGE_ID=0x05411bd9cd51106bb13834f17a77bdc1f454b6d48be1cfe0ebf52c5383f46fc6
VAULT_REGISTRY_ID=0x3b57a62f7ae1e79174fc2ee748f238a154e82709bad1130b7ea2911bbe83c801
EVE_WORLD_PACKAGE_ID=0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75
```

## Related Steering Files

- `move-contracts.md` — Move contract details (modules, functions, Seal)
- `dapps-frontend.md` — dApp frontend (components, hooks, dapp-kit)
- `deployment.md` — Docker, env vars, deploy flow, scripts
