---
description: Move smart contracts — guild_time_vault, smart_gate_extension, vault_extension
inclusion: fileMatch
fileMatchPattern: "**/*.move,**/Move.toml,**/vault-ids*,**/modules*"
---

# Move Contracts

## guild_time_vault (8 modules)

Depends on `world-contracts`. Package address: `guild`.

### vault_core.move
- `VaultRegistry` (shared, auto-created via `init`) — tracks all vaults
- `GuildVault` (shared) — `Table<u64, Capsule>`, auto-increment ID
- `Capsule` — creator, mode (0=ARCHIVE, 1=PRIVATE_INHERIT, 2=DEAD_MAN), unlock_time_ms, beneficiary, walrus_blob_id, seal_policy_id, claimed
- `Heartbeat` — vault_id, last_ping_ms, timeout_ms
- `borrow_uid()` / `borrow_uid_mut()` — UID access for dynamic fields

### vault_roles.move
- `GuildMemberCap { guild_id }` / `GuildOfficerCap { guild_id }`
- `init_guild_vault(registry, guild_id, timeout_ms, clock, ctx)` → vault + heartbeat + officer cap
- `grant_member()` / `grant_officer()` / `revoke_member()` / `revoke_officer()`

### vault_capsule_api.move
- `create_capsule()` / `create_capsule_as_officer()` — guild_id match + unlock_time > now
- `claim_archive()` — member, after unlock time
- `claim_private_inherit()` — beneficiary only, after unlock time
- `delete_capsule()` — officer cleanup

### vault_heartbeat_api.move
- `heartbeat()` — ping, `set_heartbeat_timeout()`, `trigger_dead_man()` — officer when timeout

### vault_extension.move (StorageUnit bridge)
- `VaultAuth` — typed witness for `storage_unit::authorize_extension<VaultAuth>`
- `link_vault(vault, officer_cap, storage_unit_id)` — dynamic field on GuildVault
- `unlink_vault()`, `is_linked()`, `linked_storage_unit()`

### vault_seal.move
- `seal_approve_archive/private_inherit/dead_man` — entry, dry_run by Seal key server
- `build_identity(mode, capsule_id, context_addr)` — IBE identity bytes
- Identity: `[PackageId][mode:u8][capsule_id:u64][addr:address]`

### vault_views.move / vault_registry.move
- View functions: `vault_guild_id`, `capsule_count`, `get_capsule_mode`, `is_capsule_unlockable`, `is_heartbeat_timed_out`
- Registry: `vault_count`, `vault_at`, `has_vault`, `list_vaults(offset, limit)`

## smart_gate_extension (3 modules)

Uses `XAuth` witness pattern on Gate/StorageUnit.

- **config.move**: `ExtensionConfig` shared + `AdminCap` + `XAuth` witness + dynamic field helpers
- **tribe_permit.move**: `issue_jump_permit()` — tribe check → `gate::issue_jump_permit<XAuth>`
- **corpse_gate_bounty.move**: `collect_corpse_bounty<T>()` — cross-assembly: StorageUnit + Gate + Character
