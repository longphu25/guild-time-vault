# Guild Time Vault — On-Chain Contract Reference

## Package
`0xde1c3361a8a70dd15d375dfa3fff1e8165f9d55b7b178964fa9a03c4e1c46ddc`

Network: **Sui Testnet**

---

## Modules & Functions

### vault_capsule_api

**Functions:**
- `claim_archive(&mut GuildVault, &GuildMemberCap, U64, &Clock, &mut TxContext)` [public]
- `claim_private_inherit(&mut GuildVault, U64, &Clock, &mut TxContext)` [public]
- `create_capsule(&mut GuildVault, &GuildMemberCap, U8, U64, Address, vector<U8>, vector<U8>, &Clock, &mut TxContext)` [public]
- `create_capsule_as_officer(&mut GuildVault, &GuildOfficerCap, U8, U64, Address, vector<U8>, vector<U8>, &Clock, &mut TxContext)` [public]
- `delete_capsule(&GuildOfficerCap, &mut GuildVault, U64)` [public]

### vault_core

**Structs:**
- `Capsule` (Store)
  - `creator: Address`
  - `mode: U8`
  - `unlock_time_ms: U64`
  - `beneficiary: Address`
  - `walrus_blob_id: vector<U8>`
  - `seal_policy_id: vector<U8>`
  - `claimed: Bool`
- `CapsuleClaimed` (Copy, Drop)
  - `capsule_id: U64`
  - `guild_id: Address`
  - `claimant: Address`
  - `time_ms: U64`
- `CapsuleCreated` (Copy, Drop)
  - `capsule_id: U64`
  - `guild_id: Address`
  - `creator: Address`
  - `mode: U8`
  - `unlock_time_ms: U64`
- `DeadManTriggered` (Copy, Drop)
  - `vault_id: Address`
  - `guild_id: Address`
  - `capsule_id: U64`
  - `time_ms: U64`
- `GuildVault` (Key)
  - `id: UID`
  - `guild_id: Address`
  - `next_capsule_id: U64`
  - `capsules: Table`
- `Heartbeat` (Key)
  - `id: UID`
  - `vault_id: Address`
  - `last_ping_ms: U64`
  - `timeout_ms: U64`

**Functions:**
- `add_capsule(&mut GuildVault, Capsule)` [friend]
- `borrow_capsule(&GuildVault, U64)` [public]
- `borrow_capsule_mut(&mut GuildVault, U64)` [friend]
- `capsule_beneficiary(&Capsule)` [public]
- `capsule_claimed(&Capsule)` [public]
- `capsule_count(&GuildVault)` [public]
- `capsule_creator(&Capsule)` [public]
- `capsule_mode(&Capsule)` [public]
- `capsule_seal_policy_id(&Capsule)` [public]
- `capsule_unlock_time_ms(&Capsule)` [public]
- `capsule_walrus_blob_id(&Capsule)` [public]
- `destroy_capsule(Capsule)` [friend]
- `emit_capsule_claimed(U64, Address, Address, U64)` [friend]
- `emit_capsule_created(U64, Address, Address, U8, U64)` [friend]
- `emit_dead_man_triggered(Address, Address, U64, U64)` [friend]
- `guild_id(&GuildVault)` [public]
- `has_capsule(&GuildVault, U64)` [public]
- `heartbeat_last_ping_ms(&Heartbeat)` [public]
- `heartbeat_timeout_ms(&Heartbeat)` [public]
- `heartbeat_vault_id(&Heartbeat)` [public]
- `is_timed_out(&Heartbeat, U64)` [public]
- `mode_archive()` [public]
- `mode_dead_man()` [public]
- `mode_private_inherit()` [public]
- `new_capsule(Address, U8, U64, Address, vector<U8>, vector<U8>)` [friend]
- `new_heartbeat(Address, U64, U64, &mut TxContext)` [friend]
- `new_vault(Address, &mut TxContext)` [friend]
- `remove_capsule(&mut GuildVault, U64)` [friend]
- `set_claimed(&mut Capsule)` [friend]
- `set_timeout(&mut Heartbeat, U64)` [friend]
- `share_vault(GuildVault)` [friend]
- `transfer_heartbeat(Heartbeat, Address)` [friend]
- `update_ping(&mut Heartbeat, U64)` [friend]

### vault_heartbeat_api

**Functions:**
- `heartbeat(&mut Heartbeat, &Clock)` [public]
- `set_heartbeat_timeout(&mut Heartbeat, U64)` [public]
- `trigger_dead_man(&mut GuildVault, &Heartbeat, &GuildOfficerCap, U64, &Clock, &mut TxContext)` [public]

### vault_roles

**Structs:**
- `GuildMemberCap` (Store, Key)
  - `id: UID`
  - `guild_id: Address`
- `GuildOfficerCap` (Store, Key)
  - `id: UID`
  - `guild_id: Address`

**Functions:**
- `grant_member(&GuildOfficerCap, &GuildVault, Address, &mut TxContext)` [public]
- `grant_officer(&GuildOfficerCap, &GuildVault, Address, &mut TxContext)` [public]
- `init_guild_vault(Address, U64, &Clock, &mut TxContext)` [public]
- `member_guild_id(&GuildMemberCap)` [public]
- `officer_guild_id(&GuildOfficerCap)` [public]
- `revoke_member(&GuildOfficerCap, &GuildVault, GuildMemberCap)` [public]
- `revoke_officer(&GuildOfficerCap, &GuildVault, GuildOfficerCap)` [public]

### vault_seal *(NEW)*

Seal access control module — defines `seal_approve*` functions for each capsule mode.

**Functions:**
- `build_identity(U8, U64, Address)` [public] — builds Seal identity from mode + unlock_time + guild_id
- `seal_approve_archive(vector<U8>, &GuildVault, &GuildMemberCap, &Clock)` [entry private] — approve decrypt for ARCHIVE mode (requires MemberCap + time check)
- `seal_approve_dead_man(vector<U8>, &GuildVault, &Heartbeat, &Clock)` [entry private] — approve decrypt for DEAD_MAN mode (requires heartbeat timeout)
- `seal_approve_private_inherit(vector<U8>, &GuildVault, &Clock, &TxContext)` [entry private] — approve decrypt for PRIVATE_INHERIT mode (requires beneficiary match + time check)

### vault_views

**Functions:**
- `get_capsule(&GuildVault, U64)` [public]
- `get_capsule_mode(&GuildVault, U64)` [public]
- `get_capsule_unlock_time(&GuildVault, U64)` [public]
- `get_heartbeat_last_ping(&Heartbeat)` [public]
- `get_heartbeat_timeout(&Heartbeat)` [public]
- `is_capsule_claimed(&GuildVault, U64)` [public]
- `is_capsule_unlockable(&GuildVault, U64, &Clock)` [public]
- `is_heartbeat_timed_out(&Heartbeat, &Clock)` [public]
- `vault_capsule_count(&GuildVault)` [public]
- `vault_guild_id(&GuildVault)` [public]

---

## Capsule Modes

| Mode | Value | Description |
|------|-------|-------------|
| ARCHIVE | 0 | Guild-only, any member can read after unlock time |
| PRIVATE_INHERIT | 1 | Only beneficiary address can read after unlock time |
| DEAD_MAN | 2 | Officer can read when heartbeat timeout expires |

## Seal Identity Format

`build_identity(mode, unlock_time_ms, guild_id)` constructs the Seal policy identity used for encryption/decryption. Each `seal_approve_*` function verifies different conditions:

| Function | Checks |
|----------|--------|
| `seal_approve_archive` | Caller has MemberCap for guild + Clock >= unlock_time |
| `seal_approve_private_inherit` | Caller is beneficiary + Clock >= unlock_time |
| `seal_approve_dead_man` | Heartbeat timed out (now - last_ping > timeout) |

## Key Patterns

- **Capability Pattern**: `GuildMemberCap` / `GuildOfficerCap` control access (not address lists)
- **Time-lock**: `Clock::timestamp_ms >= unlock_time_ms` checked on-chain
- **Heartbeat**: Leader must ping periodically; if `now - last_ping > timeout`, dead man capsules become claimable
- **Shared Object**: `GuildVault` is shared — all guild members interact with same vault
- **Dynamic Fields**: Capsules stored in `Table<u64, Capsule>` on vault
- **Seal Integration**: `vault_seal` module provides on-chain access control for Seal threshold encryption
