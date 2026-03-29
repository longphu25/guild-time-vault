# Builder Scaffold

Templates and tools for building on EVE Frontier.

## Prerequisites

- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Docker](https://docs.docker.com/get-docker/) (for Docker path) **or** [Sui CLI](https://docs.sui.io/guides/developer/getting-started) + Node.js (for Host path)
- [Bun](https://bun.sh/) (`curl -fsSL https://bun.sh/install | bash`)
- `make` (pre-installed on macOS/Linux)

## Quickstart

```bash
# 1. Clone the repo (with submodules)
mkdir -p workspace && cd workspace
git clone --recurse-submodules https://github.com/evefrontier/builder-scaffold.git
cd builder-scaffold
# If already cloned: git submodule update --init

# 2. Install all dependencies
make install-all

# 3. See all available commands
make help
```

## Full Setup Guide (Step by Step)

### Step 1 — Start Sui Environment

**Option A: Docker (recommended for local testing)**

```bash
# Full auto: start node → deploy world → update .env (one command)
make docker-local

# Or step by step:
make docker-up             # Start Sui localnet container
make docker-shell          # Open shell inside container
```

`make docker-local` automatically:
1. Starts the Sui dev container
2. Waits for RPC to be ready (port 9009, with countdown)
3. Deploys world-contracts, configures, seeds test resources
4. Updates `world-contracts/.env` and `builder-scaffold/.env` with keys + `WORLD_PACKAGE_ID`

```bash
# With PostgreSQL indexer + GraphQL (port 9125)
make docker-up-indexer
```

On first run the container creates 3 funded keypairs (`ADMIN`, `PLAYER_A`, `PLAYER_B`) and writes them to `docker/.env.sui`.

**Option B: Host (Sui CLI on your machine)**

```bash
# Start local node
sui start --with-faucet --force-regenesis

# In another terminal, configure CLI
sui client new-env --alias localnet --rpc http://127.0.0.1:9009
sui client switch --env localnet

# Create and fund accounts
sui client new-address ed25519 --alias admin
sui client new-address ed25519 --alias player-a
sui client new-address ed25519 --alias player-b
sui client switch --address admin
sui client faucet
```

For testnet, switch to `sui client switch --env testnet` and fund via [faucet.sui.io](https://faucet.sui.io/).

### Step 2 — Deploy World Contracts

**Automated (recommended):**

```bash
# One command does everything: clone, generate .env, deploy, copy artifacts
make deploy-world

# Or for testnet:
make deploy-world-testnet
```

This script automatically:
1. Initializes `world-contracts` git submodule (pinned at v0.0.18)
2. Generates `world-contracts/.env` from `docker/.env.sui` or Sui keytool
3. Runs `deploy-world`, `configure-world`, `create-test-resources`
4. Copies artifacts (`deployments/`, `test-resources.json`) back to builder-scaffold
5. Fills `builder-scaffold/.env` with keys and `WORLD_PACKAGE_ID`

> ADMIN_PRIVATE_KEY must have at least 5 SUI.

**Manual (if you need more control):**

<details>
<summary>Click to expand manual steps</summary>

```bash
cd world-contracts
cp env.example .env
```

Fill in `world-contracts/.env`:

```env
SUI_NETWORK=localnet                    # or testnet
ADMIN_ADDRESS=<your-admin-address>
SPONSOR_ADDRESSES=<your-admin-address>  # can be same as ADMIN_ADDRESS
ADMIN_PRIVATE_KEY=<suiprivkey1...>
GOVERNOR_PRIVATE_KEY=<suiprivkey1...>   # optional, can be same as ADMIN_PRIVATE_KEY
PLAYER_A_PRIVATE_KEY=<suiprivkey1...>
PLAYER_B_PRIVATE_KEY=<suiprivkey1...>
```

> If using Docker, run `/workspace/scripts/generate-world-env.sh` inside the container to auto-fill from `docker/.env.sui`.

Deploy:

```bash
bun install
bun run deploy-world localnet          # or testnet
bun run configure-world localnet       # or testnet
bun run create-test-resources localnet  # or testnet
```

Copy artifacts:

```bash
NETWORK=localnet   # or testnet
mkdir -p ../builder-scaffold/deployments/$NETWORK/
cp -r deployments/* ../builder-scaffold/deployments/
cp test-resources.json ../builder-scaffold/test-resources.json
cp "contracts/world/Pub.localnet.toml" "../builder-scaffold/deployments/localnet/Pub.localnet.toml"
```

</details>

### Step 3 — Build & Publish Custom Contract

```bash
cd ../builder-scaffold

# Build
make build-move
# → or: sui move build --path move-contracts/smart_gate_extension -e testnet

# Publish
# Localnet:
cd move-contracts/smart_gate_extension
sui client test-publish --build-env testnet --pubfile-path ../../deployments/localnet/Pub.localnet.toml

# Testnet:
# sui client publish -e testnet
```

From the publish output, note:
- `BUILDER_PACKAGE_ID` = objectId where objectType === `"package"`
- `EXTENSION_CONFIG_ID` = objectId where objectType ends with `config::ExtensionConfig`

### Step 4 — Configure .env

If you used `make deploy-world`, most fields are already filled. You only need to add `BUILDER_PACKAGE_ID` and `EXTENSION_CONFIG_ID` after publishing:

```bash
# Edit .env — add these from publish output:
BUILDER_PACKAGE_ID=<from publish output>
EXTENSION_CONFIG_ID=<from publish output>
```

If you deployed manually, also fill in the full `.env`:

```bash
cp .env.example .env
```

Fill in `.env`:

```env
SUI_NETWORK=localnet
# SUI_RPC_URL=http://127.0.0.1:9009   # optional, defaults based on network

ADMIN_ADDRESS=<your-admin-address>
ADMIN_PRIVATE_KEY=<suiprivkey1...>
PLAYER_A_PRIVATE_KEY=<suiprivkey1...>
PLAYER_B_PRIVATE_KEY=<suiprivkey1...>

WORLD_PACKAGE_ID=<from deployments/<network>/extracted-object-ids.json → world.packageId>
BUILDER_PACKAGE_ID=<from publish output>
EXTENSION_CONFIG_ID=<from publish output>
TENANT=dev
```

### Step 5 — Run Interaction Scripts

```bash
make configure-rules       # Set tribe + bounty config (admin)
make authorise-gate        # Authorize XAuth on gates
make authorise-storage     # Authorize XAuth on storage unit
make issue-permit          # Issue tribe jump permit
make jump                  # Jump with permit (sponsored tx)
make collect-bounty        # Collect corpse bounty
```

Or using bun directly:

```bash
bun run configure-rules
bun run authorise-gate-extension
bun run authorise-storage-unit-extension
bun run issue-tribe-jump-permit
bun run jump-with-permit
bun run collect-corpse-bounty
```

### Step 6 — (Optional) Guild Time Vault

Guild Time Vault provides time-locked capsules with role-based access control and a dead-man switch for guild asset protection.

**Deploy to testnet:**

```bash
# Publish contract (VaultRegistry auto-created via init)
sui client publish move-contracts/guild_time_vault --gas-budget 200000000
# → Note VAULT_PACKAGE_ID + VAULT_REGISTRY_ID (shared VaultRegistry) from output

# Init vault (registry = shared VaultRegistry, guild_id = your address, timeout = 14 days)
sui client call \
  --package <VAULT_PACKAGE_ID> \
  --module vault_roles \
  --function init_guild_vault \
  --args <VAULT_REGISTRY_ID> <YOUR_ADDRESS> 1209600000 0x6 \
  --gas-budget 10000000
# → Note GuildVault (shared), Heartbeat, GuildOfficerCap IDs
```

**Testnet deployment (already deployed):**

```
# v3 — with VaultRegistry
VAULT_PACKAGE_ID=0x18f44ac73ab4c150c38e4f156ca26188805366ff818078237f9105d7477a06f6
VAULT_REGISTRY_ID=0x50cf0531d668df9706814f2abf9d7fc632e1babfd35af0247953e8d5350a39e3
```

Modules: `vault_core`, `vault_roles`, `vault_capsule_api`, `vault_heartbeat_api`, `vault_views`, `vault_registry`, `vault_seal`

**Interact via scripts:**

```bash
# Add to .env
VAULT_PACKAGE_ID=0x18f44ac73ab4c150c38e4f156ca26188805366ff818078237f9105d7477a06f6
VAULT_REGISTRY_ID=0x50cf0531d668df9706814f2abf9d7fc632e1babfd35af0247953e8d5350a39e3
VAULT_OBJECT_ID=<from init-vault output>
HEARTBEAT_OBJECT_ID=<from init-vault output>
OFFICER_CAP_ID=<from init-vault output>

# Grant member
MEMBER_ADDRESS=0x... bun run vault:grant-member

# Create capsule (MODE: 0=Archive, 1=Private Inherit, 2=Dead Man)
MODE=0 UNLOCK_TIME_MS=1735689600000 bun run vault:create-capsule

# Claim capsule
CAPSULE_ID=0 CLAIM_MODE=archive bun run vault:claim-capsule

# Ping heartbeat
bun run vault:heartbeat
```

**Connect dApp with Utopia (EVE Vault):**

```bash
# 1. Update dapps/.env (heartbeat + caps auto-detected from wallet)
VITE_VAULT_PACKAGE_ID=0x18f44ac73ab4c150c38e4f156ca26188805366ff818078237f9105d7477a06f6
VITE_VAULT_REGISTRY_ID=0x50cf0531d668df9706814f2abf9d7fc632e1babfd35af0247953e8d5350a39e3
VITE_VAULT_OBJECT_ID=<from init-vault output>

# 2. Start dApp
cd dapps && bun run dev

# 3. Open with Utopia tenant
# http://localhost:5173/?tenant=utopia
```

Install EVE Vault browser extension, connect wallet, then use the Vault Dashboard tabs to create/claim capsules and ping heartbeat.

> Note: Sui CLI wallet (Ed25519) and EVE Vault wallet (zkLogin) have different addresses. After connecting EVE Vault, grant member/officer cap to the zkLogin address.

### Step 7 — (Optional) Start dApp Frontend

```bash
make dev
# → opens Vite dev server at http://localhost:5173
```

To connect a wallet on localnet, you need a Sui-compatible wallet that supports custom RPC. [Nightly Wallet](https://nightly.app/) is recommended.

<details>
<summary>Nightly Wallet setup for localnet</summary>

1. Install [Nightly Wallet](https://nightly.app/download) browser extension (Chrome / Firefox / Edge)
2. Create or import a wallet
3. Open Nightly → Settings → Network → Add Custom Network:
   - Name: `localnet`
   - RPC URL: `http://localhost:9009`
4. Switch to the `localnet` network
5. Import a funded key from `docker/.env.sui` (ADMIN, PLAYER_A, or PLAYER_B private key)
6. Open `http://localhost:5173` and click Connect Wallet

</details>

### Step 8 — (Optional) zkLogin CLI

```bash
make zklogin
# → interactive OAuth flow: login → JWT → ZK proof → execute transaction
```

Note: zkLogin prover only works on devnet. Testnet/mainnet require [Enoki](https://portal.enoki.mystenlabs.com/).

## Makefile Commands

```
make help                  Show all commands
make install-all           Install all dependencies (root + dapps + zklogin)
make dev                   Start dApp dev server
make docker-up             Start Sui localnet container
make docker-up-indexer     Start with PostgreSQL indexer + GraphQL
make docker-down           Stop all containers
make docker-shell          Open shell in container
make docker-local          Full local flow: start node → deploy world → update .env
make fmt                   Format Move files
make fmt-ts                Format TypeScript files
make lint                  Lint all Move packages
make build-move            Build Move package (MOVE_PKG=path ENV=testnet)
make publish-move          Publish Move package
make configure-rules       Configure tribe + bounty rules
make authorise-gate        Authorize XAuth on gates
make authorise-storage     Authorize XAuth on storage unit
make issue-permit          Issue tribe jump permit
make jump                  Jump with permit
make collect-bounty        Collect corpse bounty
make vault-init            Init Guild Vault (bun run vault:init)
make vault-grant-member    Grant MemberCap (bun run vault:grant-member)
make vault-create-capsule  Create capsule (bun run vault:create-capsule)
make vault-claim-capsule   Claim capsule (bun run vault:claim-capsule)
make vault-heartbeat       Ping heartbeat (bun run vault:heartbeat)
make setup-world           Deploy + configure world-contracts (legacy)
make deploy-world          Clone, deploy world, auto-fill .env (full auto)
make deploy-world-testnet  Deploy world on testnet
make zklogin               Run zkLogin CLI
make clean                 Remove node_modules and build artifacts
```

## What's in this repo

| Area | Purpose |
|------|---------|
| [docker/](./docker/readme.md) | Dev container (Sui CLI + Node.js) — used by the Docker flow. |
| [move-contracts/](./move-contracts/readme.md) | Custom Smart Assembly examples (e.g. [smart_gate_extension](./move-contracts/smart_gate_extension/)); build & publish. |
| move-contracts/guild_time_vault/ | Guild Time Vault — time-locked capsules, role-based access, dead-man switch. |
| [ts-scripts/](./ts-scripts/readme.md) | TypeScript scripts to call your contracts; run after publishing. |
| [setup-world/](./setup-world/readme.md) | What "deploy world" does and what gets created. |
| [dapps/](./dapps/readme.md) | Reference dApp template with Guild Vault UI (optional). |
| [zklogin/](./zklogin/readme.md) | zkLogin CLI for OAuth-based signing (optional). |
| [docs/](./docs/) | Detailed flow guides (Docker, Host, existing world). |

## Detailed Flow Guides

| Path | When to use |
|------|-------------|
| [Docker](./docs/builder-flow-docker.md) | No Sui/Node on host; run everything in a container. Recommended for local testing. |
| [Host](./docs/builder-flow-host.md) | Sui CLI + Node.js on your machine; target local or testnet. |
| [Building on existing world](./docs/building-on-existing-world.md) | World already deployed; you don't deploy it yourself. *(WIP)* |

## Workspace Layout

```
builder-scaffold/
├── world-contracts/      # git submodule (v0.0.18)
├── move-contracts/
├── ts-scripts/
├── dapps/
└── ...
```

`world-contracts` is a git submodule inside the repo. No need to clone separately.

## Troubleshooting

- **Move.lock wrong env?** → `rm Move.lock && sui move build -e testnet`
- **"Unpublished dependencies: World"?** → Deploy world-contracts first, then pass pubfile:
  ```bash
  sui client test-publish --build-env testnet --pubfile-path ../../deployments/localnet/Pub.localnet.toml
  ```
- **Docker fresh start** → `docker compose down && docker system prune -a --volumes`
- **Check explorers**: [localnet](https://custom.suiscan.xyz/custom/checkpoints?network=http%3A%2F%2Flocalhost%3A9009) · [testnet](https://suiscan.xyz/testnet/) · [mainnet](https://suiscan.xyz/)

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and open an issue or feature request before submitting PRs.
