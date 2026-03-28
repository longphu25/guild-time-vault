# Guild Time Vault — On-Chain Contract Reference

## Package
`0xbfd856ec0a25d1083a18e9253a1265947eff2d7da14950d4d659646c01b698cc`

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

## Deployed Objects (Your Vault)

| Object | Type | ID |
|--------|------|---|
| GuildVault (shared) | vault_core::GuildVault | `0x8be556f0f37eae7d1f3dcb5e62be2fb716570b49534709979e71913bb233a8da` |
| Heartbeat | vault_core::Heartbeat | `0x654a2592f35d1bbd79a01ce294525fccc960b019abcde60bfc2f7a63a71264c5` |
| OfficerCap | vault_roles::GuildOfficerCap | `0x4f61ded332711c79e6fe6d0ae2ac12134c511736bb55abe191df75e65d969b28` |

## Original Deploy Objects

| Object | Type | ID |
|--------|------|---|
| GuildVault (shared) | vault_core::GuildVault | `0x7b11f81dfaa50a61962b5530580aa8b280275adc50658b73a50d703e7a2f45bd` |
| Heartbeat | vault_core::Heartbeat | `0x59c98dede4619868c70a15c127ef383dfb69644a7670fdc9b0ca8072b42a05ba` |
| OfficerCap | vault_roles::GuildOfficerCap | `0x1e259c6e134da2331de2ba66f8ead29a8e5daddc467e88bd29e5b462db13bd8a` |

---

## Capsule Modes

| Mode | Value | Description |
|------|-------|-------------|
| ARCHIVE | 0 | Guild-only, any member can read after unlock time |
| PRIVATE_INHERIT | 1 | Only beneficiary address can read after unlock time |
| DEAD_MAN | 2 | Officer can read when heartbeat timeout expires |

## Key Patterns

- **Capability Pattern**: `GuildMemberCap` / `GuildOfficerCap` control access (not address lists)
- **Time-lock**: `Clock::timestamp_ms >= unlock_time_ms` checked on-chain
- **Heartbeat**: Leader must ping periodically; if `now - last_ping > timeout`, dead man capsules become claimable
- **Shared Object**: `GuildVault` is shared — all guild members interact with same vault
- **Dynamic Fields**: Capsules stored in `Table<u64, Capsule>` on vault
