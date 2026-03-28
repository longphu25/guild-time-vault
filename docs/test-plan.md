# Guild Time Vault — dApp Test Plan

## Prerequisites

- EVE Vault browser extension installed, switched to Sui testnet
- At least 2 accounts: 1 officer (has OfficerCap `0x1e25...`), 1 member (will grant)
- Each account needs SUI testnet (faucet) + WAL token (for Walrus upload)
- dApp running: `cd dapps && bun run dev` → open `http://localhost:5173/?tenant=utopia`
- Browser DevTools Console open to monitor errors

## Testnet Contract IDs

```
VAULT_PACKAGE_ID=0xbfd856ec0a25d1083a18e9253a1265947eff2d7da14950d4d659646c01b698cc
VAULT_OBJECT_ID=0x7b11f81dfaa50a61962b5530580aa8b280275adc50658b73a50d703e7a2f45bd
HEARTBEAT_OBJECT_ID=0x59c98dede4619868c70a15c127ef383dfb69644a7670fdc9b0ca8072b42a05ba
OFFICER_CAP_ID=0x1e259c6e134da2331de2ba66f8ead29a8e5daddc467e88bd29e5b462db13bd8a
```

---

## Test 1: Connect Wallet + Role Detection

| # | Action | Expected |
|---|--------|----------|
| 1.1 | Open dApp, not connected | "Connect EVE Vault" button in Navbar |
| 1.2 | Click Connect → EVE Vault popup | Popup appears, select account, approve |
| 1.3 | After connect | Navbar shows abbreviated address + Disconnect button |
| 1.4 | Go to /admin | Shows role: OFFICER (if using account with OfficerCap) |
| 1.5 | Disconnect → go to /create | WalletGate overlay: "Connect your wallet..." |

## Test 2: Home Page — On-chain Data

| # | Action | Expected |
|---|--------|----------|
| 2.1 | Open Home (connected) | Stats: Total Capsules, Claimed count from chain |
| 2.2 | Heartbeat section | Shows Last Ping, Timeout (14d), Status Active/Expired |
| 2.3 | Recent Capsules | List from chain or "No capsules yet" if vault is empty |

## Test 3: Grant Member (Admin)

| # | Action | Expected |
|---|--------|----------|
| 3.1 | Go to /admin, select "Member" | Grant form visible |
| 3.2 | Enter account 2 address, click Grant | EVE Vault popup → toast "Member cap granted!" |
| 3.3 | Account 2 connects dApp | Role shows MEMBER |

## Test 4: Create Capsule — ARCHIVE

| # | Action | Expected |
|---|--------|----------|
| 4.1 | Go to /create (with MemberCap or OfficerCap) | Form visible, role badge shown |
| 4.2 | Select "Guild Archive" mode | Highlighted in cyan |
| 4.3 | Type message "Hello from the past" | Char counter works (e.g. 20/500) |
| 4.4 | Set unlock date = 5 min from now | "Unlocks in 1 day" label |
| 4.5 | Click "Launch Capsule" | Progress: "Encrypting with Seal..." → "Uploading to Walrus..." (wallet popup) → "Submitting transaction..." (wallet popup) |
| 4.6 | Success | Toast "Capsule launched!" → redirect to /my-capsules |
| 4.7 | Check Home | Total Capsules incremented, capsule in Recent list |

## Test 5: Create Capsule — PRIVATE_INHERIT

| # | Action | Expected |
|---|--------|----------|
| 5.1 | Select "Private Inheritance" mode | Beneficiary input appears |
| 5.2 | Enter account 2 address | Accepted |
| 5.3 | Set short unlock date, submit | Same flow as Test 4 |
| 5.4 | Account 2 → My Capsules | Capsule visible (beneficiary matches) |

## Test 6: Timeline

| # | Action | Expected |
|---|--------|----------|
| 6.1 | Go to /timeline | Capsules from Test 4+5 displayed |
| 6.2 | Filter "Next 7 days" | Only capsules unlocking within 7 days |
| 6.3 | Capsule before unlock time | Status "Locked" with countdown |
| 6.4 | Capsule past unlock time | Status "Unlockable" |

## Test 7: Claim + Decrypt — ARCHIVE

| # | Action | Expected |
|---|--------|----------|
| 7.1 | Wait for ARCHIVE capsule to pass unlock time | Status changes to "Unlockable" |
| 7.2 | Click "Open" on My Capsules | EVE Vault popup to sign claim tx |
| 7.3 | After claim | Toast "Capsule claimed!" → Walrus download → Seal decrypt |
| 7.4 | Message displayed | Shows "Hello from the past" (italic, in card) |

## Test 8: Claim — PRIVATE_INHERIT

| # | Action | Expected |
|---|--------|----------|
| 8.1 | Account 2 (beneficiary) clicks Open | Claim + decrypt succeeds |
| 8.2 | Account 1 (not beneficiary) clicks Open | Tx fails → toast error |

## Test 9: Heartbeat (Admin)

| # | Action | Expected |
|---|--------|----------|
| 9.1 | Go to /admin → Heartbeat section | Shows Last Ping, Timeout, Deadline, Status |
| 9.2 | Click "Ping Now" | EVE Vault popup → toast "Heartbeat sent!" |
| 9.3 | Refresh page | Last Ping updated to current time |

## Test 10: Archive Page

| # | Action | Expected |
|---|--------|----------|
| 10.1 | Go to /archive | Shows claimed capsules with decrypted messages |
| 10.2 | Search "Hello" | Filters to matching capsule |
| 10.3 | Search "xyz" | "No messages found" |

---

## Suggested Test Order

**Round 1 — Smoke test:** 1 → 2 → 4 → 6 → 9
**Round 2 — Full flow:** 3 → 4 → 5 → 7 → 8 → 10
**Round 3 — Edge cases:** no cap account, past unlock time, empty message, invalid address

## Common Errors & Debugging

| Error | Cause | Fix |
|-------|-------|-----|
| "No member capability found" | Account not granted MemberCap/OfficerCap | Use Admin → Grant |
| Walrus upload fail | Missing WAL token | Swap SUI → WAL or use WAL testnet faucet |
| Seal encrypt fail | Wrong package ID or Seal key servers down | Check console, verify VITE_VAULT_PACKAGE_ID |
| "Access denied: Time-lock not expired" | Seal decrypt before unlock time | Wait until unlock time |
| Empty capsule list after creating | Dynamic fields not synced yet | Refresh page, check RPC in Network tab |
| "The service was stopped" (vite) | Corrupted esbuild binary | `rm -rf node_modules/esbuild && bun install` |
