---
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
│   ├── Dockerfile                       # Ubuntu 24.04 + Sui CLI + Node.js 24 + pnpm
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
├── package.json                         # Root: pnpm scripts (fmt, lint, run ts-scripts)
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
| Backend scripts | TypeScript, `@mysten/sui` SDK, `tsx` runner |
| Frontend | React 19, Vite, Radix UI, `@evefrontier/dapp-kit`, `@mysten/dapp-kit-react` |
| Auth | zkLogin (OAuth → ZK proof → Sui signature) |
| DevOps | Docker (Ubuntu 24.04), PostgreSQL (indexer), pnpm |
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

### Dependency
- `world-contracts` (local path hoặc git tag) — cung cấp `Gate`, `Character`, `StorageUnit`, `OwnerCap`, access control

---

## TypeScript Scripts

### Flow thực thi (thứ tự)

```
1. configure-rules        → Admin set tribe config + bounty config
2. authorise-gate-extension → Player A authorize XAuth trên 2 gate
3. authorise-storage-unit-extension → Player A authorize XAuth trên storage unit
4. issue-tribe-jump-permit → Player B request JumpPermit (tribe check)
5. jump-with-permit        → Player B nhảy gate (sponsored tx, admin trả gas)
6. collect-corpse-bounty   → Player B nộp bounty item → nhận JumpPermit (sponsored tx)
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

React app template kết nối EVE Frontier:

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
- **App.tsx**: Header + connect/disconnect button (`useConnection`, `useCurrentAccount`)
- **WalletStatus.tsx**: Hiển thị connected/disconnected, address, render AssemblyInfo
- **AssemblyInfo.tsx**: `useSmartObject()` → hiển thị assembly name, type, state, ID, owner character

### GraphQL Queries (queries.ts)
- `getAssemblyWithOwner()` — assembly + character info
- `getOwnedObjectsByType()` — objects owned by address
- `transformToAssembly()` — raw move object → typed Assembly

### Styling
- Dark theme (#0B0B0B background, #FAFAE5 text)
- Custom fonts: Frontier Disket Mono (headings), Favorit (body)
- Radix UI theme integration

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
- Cài: Sui CLI (suiup), Node.js 24, pnpm, PostgreSQL client, jq, git

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
│    pnpm install                                         │
├─────────────────────────────────────────────────────────┤
│ 4. INTERACT                                             │
│    pnpm configure-rules                                 │
│    pnpm authorise-gate-extension                        │
│    pnpm authorise-storage-unit-extension                │
│    pnpm issue-tribe-jump-permit                         │
│    pnpm jump-with-permit                                │
│    pnpm collect-corpse-bounty                           │
├─────────────────────────────────────────────────────────┤
│ 5. FRONTEND (optional)                                  │
│    cd dapps → pnpm install → pnpm dev                   │
├─────────────────────────────────────────────────────────┤
│ 6. ZKLOGIN (optional)                                   │
│    cd zklogin → pnpm install → pnpm zklogin             │
└─────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
User/Admin
    │
    ▼
TypeScript Scripts (ts-scripts/)
    │  Transaction builders
    ▼
Sui SDK (@mysten/sui)
    │  JSON-RPC / sign+execute
    ▼
Sui Blockchain
    │  Move VM execution
    ▼
Smart Contracts (smart_gate_extension)
    ├── Read: ExtensionConfig (tribe/bounty rules)
    ├── Interact: Gate, StorageUnit, Character (world-contracts)
    └── Write: JumpPermit, events, state changes
    │
    ▼
GraphQL Indexer (optional, PostgreSQL)
    │
    ▼
dApp Frontend (React)
    ├── Display: Assembly info, wallet status
    └── Trigger: Transactions via wallet
```

---

## Key Design Patterns

1. **Typed Witness Pattern**: `XAuth` witness chỉ mint được trong package → authorize extension trên gate/storage unit
2. **Dynamic Fields**: Config rules lưu dưới dạng dynamic fields trên shared `ExtensionConfig` object
3. **Sponsored Transactions**: Admin trả gas cho player (dual signature: player + admin)
4. **Object ID Derivation**: Game item ID → Sui object ID qua BCS serialize `TenantItemId` + `deriveObjectID`
5. **Borrow-Return Pattern**: `borrow_owner_cap` → use → `return_owner_cap` (hot potato pattern)
6. **Config Hydration**: Load `extracted-object-ids.json` từ deployments/ để fill world config tự động

---

## NPM Scripts (Root)

| Script | Mô tả |
|--------|-------|
| `pnpm fmt` | Format Move files |
| `pnpm fmt:ts` | Format TypeScript files |
| `pnpm lint` | Lint tất cả Move packages |

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
| `pnpm configure-rules` | Set tribe + bounty config |
| `pnpm authorise-gate-extension` | Authorize XAuth trên gate |
| `pnpm authorise-storage-unit-extension` | Authorize XAuth trên storage unit |
| `pnpm issue-tribe-jump-permit` | Cấp JumpPermit |
| `pnpm jump-with-permit` | Nhảy gate bằng permit |
| `pnpm collect-corpse-bounty` | Thu bounty + nhận permit |

---

## File Count Summary

| Loại | Số file |
|------|---------|
| Move contracts (.move) | 6 (3 sources + 2 tests + 1 template) |
| TypeScript scripts (.ts) | 16 |
| React components (.tsx) | 5 |
| Shell scripts (.sh) | 4 |
| Config files (json/toml/yaml) | 14 |
| Documentation (.md) | 12 |
