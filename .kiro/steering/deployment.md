---
description: Deployment — Docker, env vars, scripts, testnet IDs
inclusion: fileMatch
fileMatchPattern: "**/.env*,**/Makefile,**/Dockerfile,**/compose*,**/deploy*,**/setup*,**/*.sh,**/Published.toml"
---

# Deployment & Infrastructure

## Docker

- **Dockerfile**: Ubuntu 24.04 + Sui CLI + Node.js 24 + Bun
- **compose.yml**: `sui-dev` service, port 9009
- **docker-compose.override.yml**: PostgreSQL 16 indexer + GraphQL port 9125
- **entrypoint.sh**: Creates 3 keypairs, starts Sui node, funds accounts
- `make docker-local` — full auto: start → deploy world → update .env

## Environment Variables

### Root .env
```
SUI_NETWORK=localnet|testnet
ADMIN_PRIVATE_KEY=suiprivkey1...
WORLD_PACKAGE_ID=<from world deploy>
VAULT_PACKAGE_ID=0x05411bd9cd51106bb13834f17a77bdc1f454b6d48be1cfe0ebf52c5383f46fc6
VAULT_REGISTRY_ID=0x3b57a62f7ae1e79174fc2ee748f238a154e82709bad1130b7ea2911bbe83c801
```

### dapps/.env
```
VITE_EVE_WORLD_PACKAGE_ID=0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75
VITE_VAULT_PACKAGE_ID=0x05411bd9cd51106bb13834f17a77bdc1f454b6d48be1cfe0ebf52c5383f46fc6
VITE_VAULT_REGISTRY_ID=0x3b57a62f7ae1e79174fc2ee748f238a154e82709bad1130b7ea2911bbe83c801
VITE_VAULT_OBJECT_ID=0xcedb883794aef569928ffee9b208d4d7f9ec199c949200ec76c3717412988d7f
VITE_TENANT=utopia
VITE_OBJECT_ID=              # Sui object ID of assembly (for useSmartObject)
```

### Utopia On-chain IDs (https://docs.evefrontier.com/tools/resources)
```
World Package:              0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75
Object Registry:            0xc2b969a72046c47e24991d69472afb2216af9e91caf802684514f39706d7dc57
Killmail Registry:          0xa92de75fde403a6ccfcb1d5a380f79befaed9f1a2210e10f1c5867a4cd82b84e
Server Address Registry:    0x9a9f2f7d1b8cf100feb532223aa6c38451edb05406323af5054f9d974555708b
Location Registry:          0x62e6ec4caea639e21e4b8c3cf0104bace244b3f1760abed340cc3285905651cf
Energy Config:              0x9285364e8104c04380d9cc4a001bbdfc81a554aad441c2909c2d3bd52a0c9c62
Fuel Config:                0x0f354c803af170ac0d1ac9068625c6321996b3013dc67bdaf14d06f93fa1671f
Gate Config:                0x69a392c514c4ca6d771d8aa8bf296d4d7a021e244e792eb6cd7a0c61047fc62b
AdminACL:                   0xa8655c6721967e631d8fd157bc88f7943c5e1263335c4ab553247cd3177d4e86
```

## Scripts (bun run)

| Script | Action |
|--------|--------|
| `vault:init` | Init vault → VaultRegistry + GuildVault + Heartbeat + OfficerCap |
| `vault:grant-member` | Grant MemberCap |
| `vault:create-capsule` | Create capsule (MODE=0\|1\|2) |
| `vault:claim-capsule` | Claim capsule |
| `vault:heartbeat` | Ping heartbeat |
| `vault:list` | Query VaultRegistry, list all vaults |
| `configure-rules` | Set tribe + bounty config |
| `authorise-gate-extension` | Authorize XAuth on gates |

## Deploy Flow

```
1. SETUP    → Clone + Docker/Host Sui CLI + deploy world-contracts
2. DEVELOP  → Edit .move → sui move build → sui client publish
3. CONFIGURE → .env with package IDs
4. INTERACT → bun run vault:init / vault:create-capsule / etc.
5. FRONTEND → cd dapps && bun run dev → http://localhost:5173/?tenant=utopia
```

## Publish guild_time_vault

```bash
sui client publish move-contracts/guild_time_vault --gas-budget 500000000 --with-unpublished-dependencies
# Note: VAULT_PACKAGE_ID + VAULT_REGISTRY_ID from output
```

## EVE Vault Notes
- zkLogin wallet — needs EVE Frontier account + character on tenant
- JWT vend error = user not provisioned on tenant → create character in-game first
- Sui CLI (Ed25519) ≠ EVE Vault (zkLogin) addresses — grant caps to zkLogin address
- Alternative: use Slush wallet (standard Sui keypair, no zkLogin)
