---
description: EVE Frontier Builder Scaffold project context — structure, tech stack, contracts, scripts, dApp, and deployment flows
inclusion: auto
---

# Project Context — EVE Frontier Builder Scaffold

## Tổng quan

Builder Scaffold là bộ template và công cụ phát triển cho **EVE Frontier** — một game/metaverse blockchain chạy trên **Sui**. Project cung cấp framework end-to-end để:

- Viết và deploy smart contract (Move) mở rộng các assembly của EVE Frontier
- Tương tác với contract qua TypeScript scripts
- Xây dựng dApp frontend kết nối hệ sinh thái EVE Frontier
- Xác thực qua zkLogin (OAuth → Sui transaction)

---

## Cấu trúc thư mục

```
builder-scaffold/
├── move-contracts/              # Smart contracts (Move language)
│   ├── smart_gate_extension/    # Extension mẫu: kiểm soát gate access (tribe/bounty)
│   │   ├── sources/
│   │   │   ├── config.move              # Shared config, AdminCap, XAuth witness
│   │   │   ├── tribe_permit.move        # Cấp JumpPermit theo tribe
│   │   │   └── corpse_gate_bounty.move  # Thu bounty → cấp JumpPermit
│   │   ├── tests/gate_tests.move        # Test placeholder (commented out)
│   │   ├── Move.toml                    # Package config, dependency world-contracts
│   │   └── Published.toml               # Metadata deploy testnet
│   ├── guild_time_vault/        # Guild Time Vault — time-locked capsules + dead-man switch
│   │   ├── sources/
│   │   │   ├── vault_core.move          # Core structs, events, internal helpers
│   │   │   ├── vault_roles.move         # GuildMemberCap/GuildOfficerCap, grant/revoke
│   │   │   ├── vault_capsule_api.move   # Create/claim/delete capsule (3 modes)
│   │   │   ├── vault_heartbeat_api.move # Heartbeat ping, dead-man trigger
│   │   │   └── vault_views.move         # View functions cho UI/indexer
│   │   ├── tests/vault_tests.move       # 17 tests covering all user flows
│   │   └── Move.toml                    # Package: guild address, Sui dependency
│   └── storage_unit_extension/  # Template trống cho storage unit extension
│       ├── sources/storage_unit_extension.move
│       ├── tests/storage_unit_extension_tests.move
│       └── Move.toml
├── ts-scripts/                  # TypeScript scripts tương tác contract
│   ├── smart_gate_extension/    # Scripts cho smart_gate_extension
│   │   ├── configure-rules.ts           # Admin: set tribe + bounty config
│   │   ├── authorise-gate-extension.ts  # Authorize XAuth trên 2 gate
│   │   ├── authorise-storage-unit-extension.ts  # Authorize XAuth trên storage unit
│   │   ├── issue-tribe-jump-permit.ts   # Cấp JumpPermit cho character đúng tribe
│   │   ├── jump-with-permit.ts          # Nhảy gate bằng permit (sponsored tx)
│   │   ├── collect-corpse-bounty.ts     # Thu bounty + nhận permit (sponsored tx)
│   │   ├── extension-ids.ts             # Resolve builder package/config IDs
│   │   └── modules.ts                   # Tên module Move constants
│   ├── guild_time_vault/        # Scripts cho guild_time_vault
│   │   ├── init-vault.ts               # Leader init vault + OfficerCap + Heartbeat
│   │   ├── grant-member.ts             # Cấp GuildMemberCap
│   │   ├── grant-officer.ts            # Cấp GuildOfficerCap
│   │   ├── create-capsule.ts           # Tạo capsule (ARCHIVE/PRIVATE_INHERIT/DEAD_MAN)
│   │   ├── claim-capsule.ts            # Claim capsule theo mode
│   │   ├── heartbeat.ts                # Ping heartbeat (dead-man switch)
│   │   ├── delete-capsule.ts           # Officer xóa capsule
│   │   ├── vault-ids.ts                # Resolve vault object IDs từ env
│   │   └── modules.ts                  # Module name constants
│   ├── helpers/
│   │   ├── gate.ts                      # Query gate OwnerCap
│   │   ├── character.ts                 # Query character OwnerCap
│   │   └── storage-unit-extension.ts    # Query storage unit OwnerCap
│   └── utils/
│       ├── config.ts                    # Network config, RPC URLs, world object IDs
│       ├── constants.ts                 # Load test-resources.json (character/gate/item IDs)
│       ├── helper.ts                    # Context init, keypair, env, hydrate config
│       ├── transaction.ts               # Sponsored transaction (player + admin sign)
│       ├── derive-object-id.ts          # Derive Sui object ID từ game item ID
│       └── dev-inspect.ts               # Dev inspect cho read-only contract calls
├── dapps/                       # React frontend template
│   ├── src/
│   │   ├── main.tsx                     # Entry: EveFrontierProvider wraps App
│   │   ├── App.tsx                      # Header + wallet connect/disconnect
│   │   ├── WalletStatus.tsx             # Hiển thị trạng thái wallet
│   │   ├── AssemblyInfo.tsx             # Hiển thị assembly data (GraphQL)
│   │   ├── queries.ts                   # GraphQL helper functions
│   │   └── main.css                     # Dark theme, custom fonts
│   ├── package.json                     # React 19, Vite, Radix UI, EVE dapp-kit
│   ├── vite.config.mts
│   ├── tsconfig.json
│   └── tsconfig.node.json
├── zklogin/                     # zkLogin CLI (OAuth → Sui transaction)
│   ├── zkLoginTransaction.ts            # Interactive flow: ephemeral key → OAuth → ZK proof → tx
│   ├── package.json
│   └── tsconfig.json
├── docker/                      # Dev container
│   ├── Dockerfile                       # Ubuntu 24.04 + Sui CLI + Node.js 24 + Bun
│   ├── compose.yml                      # sui-dev service, port 9009
│   ├── docker-compose.override.yml      # PostgreSQL indexer + GraphQL (port 9125)
│   ├── scripts/
│   │   ├── entrypoint.sh                # Init keys, start node, fund accounts, write .env.sui
│   │   └── generate-world-env.sh        # Populate world-contracts .env từ docker keys
│   └── env.testnet.example
├── setup-world/
│   └── setup-world.sh                   # Deploy + configure + seed world-contracts
├── scripts/
│   └── lint-move.sh                     # Lint tất cả Move packages
├── docs/
│   ├── builder-flow.md                  # Hướng dẫn chọn Docker vs Host path
│   ├── builder-flow-docker.md
│   ├── builder-flow-host.md
│   └── building-on-existing-world.md
├── package.json                         # Root: bun scripts (fmt, lint, run ts-scripts)
├── tsconfig.json                        # Root TS config (ES2022, strict)
├── .env.example                         # Template biến môi trường
└── .prettierrc / .prettierignore
```

---

## Technology Stack

| Layer | Công nghệ |
|-------|-----------|
| Blockchain | Sui (Layer 1) |
| Smart Contract | Move 2024 edition |
| Core dependency | `world-contracts` (EVE Frontier core) |
| Wallet & Identity | EVE Vault (zkLogin, browser extension) |
| Backend scripts | TypeScript, `@mysten/sui` SDK, `tsx` runner |
| Frontend | React 19, Vite, Radix UI, `@evefrontier/dapp-kit`, `@mysten/dapp-kit-react` |
| Auth | zkLogin (OAuth → ZK proof → Sui signature) |
| DevOps | Docker (Ubuntu 24.04), PostgreSQL (indexer), Bun |
| Formatting | Prettier (Move + TypeScript) |

---

## Smart Contracts (Move)

### smart_gate_extension

3 module chính, sử dụng **typed witness pattern** (`XAuth`) để authorize extension trên gate/storage unit của world-contracts.

#### config.move
- `ExtensionConfig` — shared object lưu config dưới dạng dynamic fields
- `AdminCap` — capability cho admin operations
- `XAuth` — witness type, chỉ mint được trong package (`public(package)`)
- Helper functions: `has_rule`, `borrow_rule`, `set_rule`, `add_rule`, `remove_rule`

#### tribe_permit.move
- `TribeConfig { tribe: u32, expiry_duration_ms: u64 }` — lưu trong ExtensionConfig
- `issue_jump_permit()` — kiểm tra character thuộc tribe đúng → gọi `gate::issue_jump_permit<XAuth>` cấp permit có thời hạn
- `set_tribe_config()` — admin function cấu hình tribe + expiry

#### corpse_gate_bounty.move
- `BountyConfig { bounty_type_id: u64, expiry_duration_ms: u64 }`
- `collect_corpse_bounty<T>()` — withdraw item từ player storage → validate type → deposit vào owner storage → issue JumpPermit
- Tương tác cross-assembly: StorageUnit + Gate + Character

### storage_unit_extension
- Template trống (`public fun template() {}`) — điểm bắt đầu cho extension mới

### guild_time_vault

5 module, sử dụng **capability pattern** cho role-based access control. Package address: `guild`.

#### vault_core.move
- `GuildVault` (shared) — lưu capsules trong `Table<u64, Capsule>`, auto-increment ID
- `Capsule` — metadata: creator, mode (u8), unlock_time_ms, beneficiary, walrus_blob_id, seal_policy_id, claimed
- `Heartbeat` — dead-man switch: vault_id, last_ping_ms, timeout_ms
- Events: `CapsuleCreated`, `CapsuleClaimed`, `DeadManTriggered`
- Modes: `ARCHIVE=0`, `PRIVATE_INHERIT=1`, `DEAD_MAN=2`
- Internal helpers: `new_vault`, `new_capsule`, `new_heartbeat`, `share_vault`, `transfer_heartbeat`, `destroy_capsule`

#### vault_roles.move
- `GuildMemberCap { guild_id }` — cấp cho member
- `GuildOfficerCap { guild_id }` — superset quyền, cấp cho officer/leader
- `init_guild_vault()` — tạo vault (shared) + heartbeat + officer cap cho leader
- `grant_member()` / `grant_officer()` — officer cấp cap cho address
- `revoke_member()` / `revoke_officer()` — officer thu hồi cap

#### vault_capsule_api.move
- `create_capsule()` — member tạo capsule (kiểm tra guild_id match + unlock_time > now)
- `create_capsule_as_officer()` — officer tạo capsule
- `claim_archive()` — member claim ARCHIVE capsule sau unlock time
- `claim_private_inherit()` — chỉ beneficiary claim sau unlock time
- `delete_capsule()` — officer xóa capsule

#### vault_heartbeat_api.move
- `heartbeat()` — owner ping cập nhật last_ping_ms
- `set_heartbeat_timeout()` — thay đổi timeout duration
- `trigger_dead_man()` — officer trigger khi heartbeat timeout → claim DEAD_MAN capsule

#### vault_views.move
- View functions cho UI/indexer: `vault_guild_id`, `vault_capsule_count`, `get_capsule_mode`, `get_capsule_unlock_time`, `is_capsule_claimed`, `is_capsule_unlockable`, `is_heartbeat_timed_out`

### Dependency
- `world-contracts` (local path hoặc git tag) — cung cấp `Gate`, `Character`, `StorageUnit`, `OwnerCap`, access control

---

## TypeScript Scripts

### Flow thực thi (thứ tự)

#### smart_gate_extension
```
1. configure-rules        → Admin set tribe config + bounty config
2. authorise-gate-extension → Player A authorize XAuth trên 2 gate
3. authorise-storage-unit-extension → Player A authorize XAuth trên storage unit
4. issue-tribe-jump-permit → Player B request JumpPermit (tribe check)
5. jump-with-permit        → Player B nhảy gate (sponsored tx, admin trả gas)
6. collect-corpse-bounty   → Player B nộp bounty item → nhận JumpPermit (sponsored tx)
```

#### guild_time_vault
```
1. vault:init              → Leader tạo vault, nhận OfficerCap + Heartbeat
2. vault:grant-member      → Officer cấp MemberCap cho member
3. vault:grant-officer     → Officer cấp OfficerCap cho officer mới
4. vault:create-capsule    → Member/Officer tạo capsule (MODE=0|1|2)
5. vault:claim-capsule     → Claim capsule (CLAIM_MODE=archive|private_inherit|dead_man)
6. vault:heartbeat         → Leader ping heartbeat giữ dead-man switch alive
7. vault:delete-capsule    → Officer xóa capsule (cleanup)
```

### Utilities

- **config.ts**: Network types (`localnet|testnet|devnet|mainnet`), default RPC URLs, `createClient()`, `keypairFromPrivateKey()`, world module names
- **constants.ts**: Load `test-resources.json` → export game IDs (character, gate, storage unit, item, location hash)
- **helper.ts**: `getEnvConfig()`, `initializeContext()`, `hydrateWorldConfig()` (load extracted-object-ids.json), `extractEvent()`, hex utils
- **transaction.ts**: `executeSponsoredTransaction()` — player ký tx, admin trả gas (dual signature)
- **derive-object-id.ts**: `deriveObjectId()` — từ registry + itemId + packageId → Sui object ID (dùng BCS serialize `TenantItemId`)
- **dev-inspect.ts**: `devInspectMoveCallFirstReturnValueBytes()` — read-only contract call

### Helpers
- **gate.ts / character.ts / storage-unit-extension.ts**: Query `owner_cap_id` qua dev inspect

---

## DApp Frontend

React app template kết nối EVE Frontier.

### @evefrontier/dapp-kit (v0.1.7)

React SDK for building EVE Frontier dApps on Sui blockchain.
- Full API docs: http://sui-docs.evefrontier.com/
- Install: `bun add @evefrontier/dapp-kit @tanstack/react-query react`

#### Subpath Imports
| Subpath | Nội dung |
|---------|----------|
| `@evefrontier/dapp-kit` | Default: providers, hooks, types, utils |
| `@evefrontier/dapp-kit/graphql` | GraphQL client, queries, response types |
| `@evefrontier/dapp-kit/types` | Type definitions only |
| `@evefrontier/dapp-kit/utils` | Utilities (parsing, transforms, config) |
| `@evefrontier/dapp-kit/hooks` | Hooks only |
| `@evefrontier/dapp-kit/providers` | Providers only |
| `@evefrontier/dapp-kit/config` | Config / dApp kit setup |

#### Providers
- `EveFrontierProvider` — wraps QueryClient, DAppKit, Vault, SmartObject, Notification
- `VaultProvider` — EVE wallet/connection
- `SmartObjectProvider` — GraphQL assembly data
- `NotificationProvider` — toast notifications

#### Hooks
- `useConnection()` — `{ isConnected, handleConnect, handleDisconnect }`
- `useSmartObject()` — `{ assembly, loading }` — query assembly data
- `useNotification()` — toast/notification management
- `useSponsoredTransaction()` — sponsored tx (player signs, server pays gas)

#### GraphQL Queries
- `getObjectByAddress`, `getObjectWithDynamicFields`, `getObjectWithJson`
- `getOwnedObjectsByType`, `getOwnedObjectsByPackage`
- `getWalletCharacters`, `getCharacterAndOwnedObjects`
- `getSingletonObjectByType`, `getObjectsByType`
- `getAssemblyWithOwner`, `getObjectOwnerAndOwnedObjectsByType`

#### Utilities
- Config: `getEveWorldPackageId()`, `getSuiGraphqlEndpoint()`, `getEnergyConfig()`, `getFuelEfficiencyConfig()`
- Formatting: `abbreviateAddress()`, `formatDuration()`, `formatM3()`, `getVolumeM3()`
- Assembly: `isOwner()`, `getTxUrl()`, `getDappUrl()`, `findOwnerByAddress()`, `assertAssemblyType()`
- Transforms: `transformToCharacter()`, `transformToAssembly()`
- Errors: `ERRORS`, `parseErrorFromMessage()`

#### Config via Environment
- `VITE_OBJECT_ID` — Sui Object ID of assembly
- URL params: `?itemId=...&tenant=...` (derived)

### UI Stack
- Tailwind CSS v4 + shadcn/ui (Vite plugin)
- Import alias: `@/*` → `./src/*`

### Provider Stack (main.tsx)
```
EveFrontierProvider (queryClient)
  ├── QueryClientProvider (React Query)
  ├── DAppKitProvider (Sui wallet)
  ├── VaultProvider (EVE wallet/connection)
  ├── SmartObjectProvider (GraphQL assembly)
  └── NotificationProvider (toasts)
```

### Components
- **App.tsx**: Header + connect/disconnect button (`useConnection`, `useCurrentAccount`) + VaultDashboard
- **WalletStatus.tsx**: Hiển thị connected/disconnected, address, render AssemblyInfo
- **AssemblyInfo.tsx**: `useSmartObject()` → hiển thị assembly name, type, state, ID, owner character

### Vault UI Components (dapps/src/vault/)
- **VaultDashboard.tsx**: Tab navigation (Overview / Create / Claim / Heartbeat), hiển thị vault info qua `getObjectWithJson()`
- **CreateCapsuleForm.tsx**: Form tạo capsule — chọn mode, unlock date, beneficiary, cap ID → `dAppKit.signAndExecute()`
- **ClaimCapsuleForm.tsx**: Form claim capsule — chọn claim mode (archive/private_inherit/dead_man), capsule ID → sign tx
- **HeartbeatPanel.tsx**: Nút "Ping Now" gọi heartbeat contract
- **config.ts**: Vault package/object IDs từ `VITE_*` env vars, module names, mode constants
- **useVaultData.ts**: Hook fetch vault data qua GraphQL (`getObjectWithJson`)

### GraphQL Queries (queries.ts)
- `getAssemblyWithOwner()` — assembly + character info
- `getOwnedObjectsByType()` — objects owned by address
- `transformToAssembly()` — raw move object → typed Assembly

### Styling
- Dark theme (#0B0B0B background, #FAFAE5 text)
- Custom fonts: Frontier Disket Mono (headings), Favorit (body)
- Radix UI theme integration

---

## EVE Vault — Wallet & Identity

EVE Vault là ví chính thức và identity manager cho EVE Frontier trên Sui. Docs: https://docs.evefrontier.com/eve-vault/wallets-and-identity

### Chức năng chính
- **Wallet**: Lưu trữ Sui assets (tokens, NFTs, game items)
- **Identity**: Authentication hub cho dApps — chứng minh danh tính mà không lộ private key
- **Single Sign-On**: Cài extension → approve prompt → kết nối dApp, không cần tạo account riêng
- **zkLogin**: Tạo ví bằng EVE Frontier SSO account, không cần seed phrase. Zero-knowledge proof đảm bảo privacy

### Tích hợp trong dApp
- Sử dụng `@evefrontier/dapp-kit` + `@mysten/dapp-kit-react`
- `EveFrontierProvider` wraps toàn bộ app
- `useConnection()` → `{ isConnected, handleConnect, handleDisconnect }`
- `useCurrentAccount()` → account address (từ `@mysten/dapp-kit-react`)
- `useDAppKit()` → `signAndExecute({ transaction })` cho custom transactions

### Tích hợp trong scripts (headless / CLI)
- Scripts dùng `Ed25519Keypair` + `@mysten/sui` SDK trực tiếp (không qua EVE Vault UI)
- Private key từ `.env` (`ADMIN_PRIVATE_KEY`, `PLAYER_A_PRIVATE_KEY`)
- `client.signAndExecuteTransaction({ transaction, signer: keypair })` cho mọi tx
- Sponsored transactions: player ký tx, admin trả gas (`executeSponsoredTransaction()`)

### Identity Flow
```
In-Game:  EVE Vault → zkLogin → link character + assets on-chain
Out-Game: EVE Vault extension → approve dApp connection → wallet as identity anchor
Scripts:  Ed25519Keypair → sign tx → submit to Sui RPC
```

---

## zkLogin Module

Interactive CLI cho OAuth-based Sui transaction signing:

### Flow
1. Generate ephemeral keypair + randomness + nonce
2. Tạo login URL → user mở browser, đăng nhập OAuth
3. User paste JWT token
4. Fetch ZK proof từ prover
5. Execute transaction với zkLogin signature
6. Loop cho nhiều transaction

### Config
- Auth: `https://test.auth.evefrontier.com` (Utopia client)
- Prover: `https://prover-dev.mystenlabs.com/v1` (chỉ devnet)
- Testnet/mainnet cần Enoki API key

---

## Docker Environment

### Dockerfile
- Base: Ubuntu 24.04
- Cài: Sui CLI (suiup), Node.js 24, Bun, PostgreSQL client, jq, git

### compose.yml
- Service `sui-dev`: build từ Dockerfile, expose port 9009 (RPC)
- Volumes: sui-config (persistent), builder-scaffold + world-contracts (bind mount)

### docker-compose.override.yml (optional)
- PostgreSQL 16 cho indexer
- GraphQL endpoint port 9125
- Auto-reset database mỗi lần start (sync với force-regenesis)

### entrypoint.sh
1. First run: tạo 3 keypair (ADMIN, PLAYER_A, PLAYER_B)
2. Wait PostgreSQL (nếu có indexer)
3. Reset indexer database
4. Start Sui local node (`sui start --with-faucet --force-regenesis`)
5. Fund accounts từ faucet
6. Export keys → `docker/.env.sui`
7. Drop to shell

### Makefile: docker-local
Full local flow trong 1 lệnh:
1. `docker compose up --build -d` — start container
2. Health check RPC port 9009 (POST JSON-RPC, countdown 90s)
3. `setup-world/deploy-world.sh` bên trong container — deploy + configure + seed
4. Cập nhật `world-contracts/.env` và `builder-scaffold/.env` với keys + WORLD_PACKAGE_ID

### generate-world-env.sh
- Đọc `docker/.env.sui` → populate `world-contracts/.env`

---

## Environment Variables (.env.example)

```
SUI_NETWORK=localnet
SUI_RPC_URL=http://127.0.0.1:9009    # optional
ADMIN_ADDRESS=
ADMIN_PRIVATE_KEY=
PLAYER_A_PRIVATE_KEY=
PLAYER_B_PRIVATE_KEY=
WORLD_PACKAGE_ID=                      # từ world-contracts deploy
BUILDER_PACKAGE_ID=                    # từ publish custom contract
EXTENSION_CONFIG_ID=                   # từ publish output
VAULT_PACKAGE_ID=                      # từ publish guild_time_vault
VAULT_OBJECT_ID=                       # từ init-vault output
HEARTBEAT_OBJECT_ID=                   # từ init-vault output
OFFICER_CAP_ID=                        # từ init-vault output
MEMBER_CAP_ID=                         # từ grant-member output
GUILD_ID=                              # address đại diện guild
HEARTBEAT_TIMEOUT_MS=1209600000        # 14 ngày (default)
TENANT=dev
```

---

## Build & Deploy Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. SETUP                                                │
│    Clone repo → Docker container HOẶC Host Sui CLI      │
│    Deploy world-contracts → copy artifacts              │
├─────────────────────────────────────────────────────────┤
│ 2. DEVELOP                                              │
│    Edit Move contracts (move-contracts/)                │
│    Build: sui move build -e testnet                     │
│    Publish: sui client publish -e testnet               │
│    → Get BUILDER_PACKAGE_ID + EXTENSION_CONFIG_ID       │
├─────────────────────────────────────────────────────────┤
│ 3. CONFIGURE                                            │
│    cp .env.example .env → fill keys + IDs               │
│    bun install                                         │
├─────────────────────────────────────────────────────────┤
│ 4. INTERACT                                             │
│    bun run configure-rules                              │
│    bun run authorise-gate-extension                     │
│    bun run authorise-storage-unit-extension              │
│    bun run issue-tribe-jump-permit                      │
│    bun run jump-with-permit                             │
│    bun run collect-corpse-bounty                        │
│                                                         │
│    Guild Time Vault:                                    │
│    bun run vault:init                                   │
│    bun run vault:grant-member                           │
│    bun run vault:create-capsule                         │
│    bun run vault:claim-capsule                          │
│    bun run vault:heartbeat                              │
├─────────────────────────────────────────────────────────┤
│ 5. FRONTEND (optional)                                  │
│    cd dapps → bun install → bun run dev                 │
│    Open http://localhost:5173/?tenant=utopia             │
├─────────────────────────────────────────────────────────┤
│ 6. ZKLOGIN (optional)                                   │
│    cd zklogin → bun install → bun run zklogin           │
└─────────────────────────────────────────────────────────┘
```

---

## Testnet Deployment (Utopia)

### Deployed Contract IDs (Sui Testnet)

```
VAULT_PACKAGE_ID=0xbfd856ec0a25d1083a18e9253a1265947eff2d7da14950d4d659646c01b698cc
VAULT_OBJECT_ID=0x7b11f81dfaa50a61962b5530580aa8b280275adc50658b73a50d703e7a2f45bd   (GuildVault - shared)
HEARTBEAT_OBJECT_ID=0x59c98dede4619868c70a15c127ef383dfb69644a7670fdc9b0ca8072b42a05ba
OFFICER_CAP_ID=0x1e259c6e134da2331de2ba66f8ead29a8e5daddc467e88bd29e5b462db13bd8a
DEPLOYER_ADDRESS=0xdfdd6484f7f94c80daefbfee06728f60236fde6bc229e30453306166a6b5691e
```

### Deploy guild_time_vault lên testnet

```bash
# 1. Ensure Sui CLI points to testnet
sui client switch --env testnet

# 2. Publish contract
sui client publish move-contracts/guild_time_vault --gas-budget 100000000
# → Note PackageID from output

# 3. Init vault (guild_id = your address, timeout = 14 days)
sui client call \
  --package <VAULT_PACKAGE_ID> \
  --module vault_roles \
  --function init_guild_vault \
  --args <YOUR_ADDRESS> 1209600000 0x6 \
  --gas-budget 10000000
# → Note GuildVault (shared), Heartbeat, GuildOfficerCap IDs from output
```

### Kết nối dApp với Utopia

```bash
# 1. Cập nhật dapps/.env
VITE_VAULT_PACKAGE_ID=0xbfd856ec0a25d1083a18e9253a1265947eff2d7da14950d4d659646c01b698cc
VITE_VAULT_OBJECT_ID=0x7b11f81dfaa50a61962b5530580aa8b280275adc50658b73a50d703e7a2f45bd
VITE_HEARTBEAT_OBJECT_ID=0x59c98dede4619868c70a15c127ef383dfb69644a7670fdc9b0ca8072b42a05ba

# 2. Chạy dApp
cd dapps && bun run dev

# 3. Mở browser
# http://localhost:5173/?tenant=utopia
```

EVE Vault extension sẽ kết nối qua Sui testnet (cùng chain). User connect wallet → dApp nhận zkLogin address → tương tác vault contract.

Lưu ý: ví Sui CLI (Ed25519) và ví EVE Vault (zkLogin) có address khác nhau. Sau khi connect EVE Vault, cần grant member/officer cap cho zkLogin address đó.

---

## Data Flow

```
User/Admin
    │
    ▼
TypeScript Scripts (ts-scripts/)          dApp Frontend (React)
    │  Transaction builders                    │  EVE Vault wallet
    ▼                                          ▼
Sui SDK (@mysten/sui)                     @mysten/dapp-kit-react
    │  JSON-RPC / sign+execute                 │  signAndExecute
    ▼                                          ▼
Sui Blockchain (Testnet / Localnet)
    │  Move VM execution
    ├── smart_gate_extension
    │   ├── Read: ExtensionConfig (tribe/bounty rules)
    │   ├── Interact: Gate, StorageUnit, Character (world-contracts)
    │   └── Write: JumpPermit, events
    │
    └── guild_time_vault
        ├── GuildVault (shared) — capsules in Table
        ├── Capabilities: GuildMemberCap, GuildOfficerCap
        ├── Heartbeat — dead-man switch
        └── Events: CapsuleCreated, CapsuleClaimed, DeadManTriggered
    │
    ▼
GraphQL Indexer (optional, PostgreSQL)
    │
    ▼
dApp Frontend (React)
    ├── VaultDashboard: overview, create, claim, heartbeat
    ├── Assembly info, wallet status
    └── EVE Vault connect (zkLogin)
```

---

## Key Design Patterns

1. **Typed Witness Pattern**: `XAuth` witness chỉ mint được trong package → authorize extension trên gate/storage unit
2. **Capability Pattern**: `GuildMemberCap` / `GuildOfficerCap` — role-based access control, không dùng address mapping
3. **Dynamic Fields**: Config rules lưu dưới dạng dynamic fields trên shared `ExtensionConfig` object
4. **Table-backed Collections**: `GuildVault.capsules` dùng `Table<u64, Capsule>` cho collection kích thước không giới hạn
5. **Sponsored Transactions**: Admin trả gas cho player (dual signature: player + admin)
6. **Object ID Derivation**: Game item ID → Sui object ID qua BCS serialize `TenantItemId` + `deriveObjectID`
7. **Borrow-Return Pattern**: `borrow_owner_cap` → use → `return_owner_cap` (hot potato pattern)
8. **Config Hydration**: Load `extracted-object-ids.json` từ deployments/ để fill world config tự động
9. **EVE Vault Identity**: zkLogin-based wallet, dApp connect qua browser extension, scripts dùng Ed25519Keypair trực tiếp

---

## NPM Scripts (Root)

| Script | Mô tả |
|--------|-------|
| `bun run fmt` | Format Move files |
| `bun run fmt:ts` | Format TypeScript files |
| `bun run lint` | Lint tất cả Move packages |

---

## Makefile Commands

| Command | Mô tả |
|---------|-------|
| `make docker-up` | Start Sui localnet container |
| `make docker-up-indexer` | Start với PostgreSQL indexer + GraphQL |
| `make docker-down` | Stop all containers |
| `make docker-shell` | Open shell trong container |
| `make docker-local` | Full local flow: start node → deploy world → update .env |
| `make build-move` | Build Move package |
| `make publish-move` | Publish Move package |
| `make deploy-world` | Clone, deploy world, auto-fill .env |
| `make deploy-world-testnet` | Deploy world trên testnet |
| `bun run configure-rules` | Set tribe + bounty config |
| `bun run authorise-gate-extension` | Authorize XAuth trên gate |
| `bun run authorise-storage-unit-extension` | Authorize XAuth trên storage unit |
| `bun run issue-tribe-jump-permit` | Cấp JumpPermit |
| `bun run jump-with-permit` | Nhảy gate bằng permit |
| `bun run collect-corpse-bounty` | Thu bounty + nhận permit |
| `bun run vault:init` | Init Guild Vault |
| `bun run vault:grant-member` | Cấp MemberCap |
| `bun run vault:grant-officer` | Cấp OfficerCap |
| `bun run vault:create-capsule` | Tạo capsule |
| `bun run vault:claim-capsule` | Claim capsule |
| `bun run vault:heartbeat` | Ping heartbeat |
| `bun run vault:delete-capsule` | Xóa capsule |

---

## File Count Summary

| Loại | Số file |
|------|---------|
| Move contracts (.move) | 12 (8 sources + 3 tests + 1 template) |
| TypeScript scripts (.ts) | 25 |
| React components (.tsx) | 11 (5 base + 6 vault) |
| Shell scripts (.sh) | 4 |
| Config files (json/toml/yaml) | 15 |
| Documentation (.md) | 12 |
