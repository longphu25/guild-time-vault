---
description: dApp frontend — React components, hooks, dapp-kit, vault UI
inclusion: fileMatch
fileMatchPattern: "dapps/**/*.tsx,dapps/**/*.ts,dapps/**/*.css"
---

# dApp Frontend

React 19 + Vite + Tailwind v4 + shadcn/ui. Uses `@evefrontier/dapp-kit` v0.1.7.

## Provider Stack (main.tsx)

```
EveFrontierProvider → QueryClientProvider → DAppKitProvider → VaultProvider → SmartObjectProvider → NotificationProvider
```

## @evefrontier/dapp-kit

### Hooks
- `useConnection()` — `{ isConnected, walletAddress, hasEveVault, handleConnect, handleDisconnect }`
- `useSmartObject()` — `{ assembly, assemblyOwner, tenant, loading, error, refetch }` — needs `VITE_OBJECT_ID` or `?itemId=&tenant=`
- `useNotification()` — toast management
- `useSponsoredTransaction()` — EVE Vault sponsored tx

### GraphQL (from `@evefrontier/dapp-kit/graphql`)
- `getAssemblyWithOwner`, `getObjectWithJson`, `getOwnedObjectsByType`
- `getWalletCharacters`, `getObjectsByType`, `getSingletonObjectByType`

### Utils
- `getEveWorldPackageId()`, `getSuiGraphqlEndpoint()`, `abbreviateAddress()`
- `transformToAssembly()`, `transformToCharacter()`
- `TENANT_CONFIG` — per-tenant packageId + datahubHost

## Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | GuildsView | Vault registry overview |
| `/vault` | VaultView | Capsule list, claim, decrypt |
| `/create` | CreateCapsule | Create capsule with Seal encryption + Walrus upload |
| `/members` | MembersView | Grant/revoke member/officer caps |
| `/heartbeat` | HeartbeatView | Ping heartbeat, trigger dead man |
| `/assembly` | AssemblyView | EVE Assembly data or vault fallback |
| `/profile` | ProfileView | 8-block pilot profile (wallet, character, vault, heartbeat) |
| `/guide` | GameGuideView | Interactive assembly deployment checklist |
| `/init-vault` | InitializeView | Init new guild vault |

## Key Files

- `src/lib/contract.ts` — TX targets, TYPES, module names (includes `vault_extension`)
- `src/lib/vault-tx.ts` — Transaction builders (create, claim, heartbeat, grant, link/unlink)
- `src/lib/vault-reader.ts` — RPC client, fetch vault/capsules/heartbeat/members
- `src/lib/vault-config.ts` — reads `VITE_VAULT_PACKAGE_ID`, `VITE_VAULT_REGISTRY_ID`
- `src/hooks/use-vault.ts` — composite hook: vault + capsules + heartbeat + role detection
- `src/vault/config.ts` — `VAULT_CONFIG`, `VAULT_MODULES`, `CAPSULE_MODES`

## Vault UI (src/vault/)
- `CreateCapsuleForm.tsx` — mode, unlock date, beneficiary, Seal encrypt, Walrus upload
- `ClaimCapsuleForm.tsx` — claim mode, auto-detect heartbeat
- `HeartbeatPanel.tsx` — ping, auto-detect Heartbeat object

## Styling
- Dark theme (#0B0B0B bg, #FAFAE5 text)
- Fonts: Frontier Disket Mono (headings), Favorit (body)
- Import alias: `@/*` → `./src/*`
