/// Role management using capability pattern.
/// GuildOfficerCap = superset of GuildMemberCap.
module guild::vault_roles;

use sui::clock::Clock;
use guild::vault_core::{Self, GuildVault, VaultRegistry};

// === Errors ===
#[error(code = 0)]
const EGuildMismatch: vector<u8> = b"Capability guild_id does not match vault";

// === Capability Structs ===

public struct GuildMemberCap has key, store {
    id: UID,
    guild_id: address,
}

public struct GuildOfficerCap has key, store {
    id: UID,
    guild_id: address,
}

// === Accessors ===

public fun member_guild_id(cap: &GuildMemberCap): address { cap.guild_id }
public fun officer_guild_id(cap: &GuildOfficerCap): address { cap.guild_id }

// === Init Vault (Leader) ===

/// Leader creates a new GuildVault and receives an OfficerCap.
/// Also creates a Heartbeat for dead-man switch.
/// Registers the vault in the global VaultRegistry.
#[allow(lint(self_transfer))]
public fun init_guild_vault(
    registry: &mut VaultRegistry,
    guild_id: address,
    timeout_ms: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let vault = vault_core::new_vault(guild_id, ctx);
    let vault_id = object::id_address(&vault);

    // Register in global registry
    vault_core::register_vault(
        registry,
        vault_id,
        guild_id,
        ctx.sender(),
        clock.timestamp_ms(),
    );

    let heartbeat = vault_core::new_heartbeat(
        vault_id,
        timeout_ms,
        clock.timestamp_ms(),
        ctx,
    );

    let officer_cap = GuildOfficerCap {
        id: object::new(ctx),
        guild_id,
    };

    vault_core::share_vault(vault);
    vault_core::transfer_heartbeat(heartbeat, ctx.sender());
    transfer::transfer(officer_cap, ctx.sender());
}

// === Grant / Revoke ===

public fun grant_member(
    _officer: &GuildOfficerCap,
    vault: &GuildVault,
    to: address,
    ctx: &mut TxContext,
) {
    assert!(_officer.guild_id == vault_core::guild_id(vault), EGuildMismatch);
    let cap = GuildMemberCap {
        id: object::new(ctx),
        guild_id: vault_core::guild_id(vault),
    };
    transfer::transfer(cap, to);
}

public fun grant_officer(
    _officer: &GuildOfficerCap,
    vault: &GuildVault,
    to: address,
    ctx: &mut TxContext,
) {
    assert!(_officer.guild_id == vault_core::guild_id(vault), EGuildMismatch);
    let cap = GuildOfficerCap {
        id: object::new(ctx),
        guild_id: vault_core::guild_id(vault),
    };
    transfer::transfer(cap, to);
}

public fun revoke_member(
    _officer: &GuildOfficerCap,
    vault: &GuildVault,
    member_cap: GuildMemberCap,
) {
    assert!(_officer.guild_id == vault_core::guild_id(vault), EGuildMismatch);
    let GuildMemberCap { id, guild_id: _ } = member_cap;
    object::delete(id);
}

public fun revoke_officer(
    _officer: &GuildOfficerCap,
    vault: &GuildVault,
    officer_cap: GuildOfficerCap,
) {
    assert!(_officer.guild_id == vault_core::guild_id(vault), EGuildMismatch);
    let GuildOfficerCap { id, guild_id: _ } = officer_cap;
    object::delete(id);
}
