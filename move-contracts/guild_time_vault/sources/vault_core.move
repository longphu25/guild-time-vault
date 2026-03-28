/// Core types and events for Guild Time Vault.
/// No entry functions here — only structs, events, and internal helpers.
module guild::vault_core;

use sui::event;
use sui::table::{Self, Table};

// === Capsule Modes ===
const MODE_ARCHIVE: u8 = 0;
const MODE_PRIVATE_INHERIT: u8 = 1;
const MODE_DEAD_MAN: u8 = 2;

// === Errors ===
#[error(code = 0)]
const EInvalidMode: vector<u8> = b"Invalid capsule mode";
#[error(code = 1)]
const ECapsuleNotFound: vector<u8> = b"Capsule not found";

// === Core Structs ===

public struct GuildVault has key {
    id: UID,
    guild_id: address,
    next_capsule_id: u64,
    capsules: Table<u64, Capsule>,
}

public struct Capsule has store {
    creator: address,
    mode: u8,
    unlock_time_ms: u64,
    beneficiary: address,
    walrus_blob_id: vector<u8>,
    seal_policy_id: vector<u8>,
    claimed: bool,
}

public struct Heartbeat has key {
    id: UID,
    vault_id: address,
    last_ping_ms: u64,
    timeout_ms: u64,
}

// === Events ===

public struct CapsuleCreated has copy, drop {
    capsule_id: u64,
    guild_id: address,
    creator: address,
    mode: u8,
    unlock_time_ms: u64,
}

public struct CapsuleClaimed has copy, drop {
    capsule_id: u64,
    guild_id: address,
    claimant: address,
    time_ms: u64,
}

public struct DeadManTriggered has copy, drop {
    vault_id: address,
    guild_id: address,
    capsule_id: u64,
    time_ms: u64,
}

// === Mode Constants Accessors ===

public fun mode_archive(): u8 { MODE_ARCHIVE }
public fun mode_private_inherit(): u8 { MODE_PRIVATE_INHERIT }
public fun mode_dead_man(): u8 { MODE_DEAD_MAN }

// === GuildVault Helpers ===

public(package) fun new_vault(
    guild_id: address,
    ctx: &mut TxContext,
): GuildVault {
    GuildVault {
        id: object::new(ctx),
        guild_id,
        next_capsule_id: 0,
        capsules: table::new(ctx),
    }
}

/// Share a GuildVault. Must be called from within this package.
public(package) fun share_vault(vault: GuildVault) {
    transfer::share_object(vault);
}

/// Transfer a Heartbeat. Must be called from within this package.
public(package) fun transfer_heartbeat(heartbeat: Heartbeat, to: address) {
    transfer::transfer(heartbeat, to);
}

/// Destroy a capsule (for use by other modules in this package).
public(package) fun destroy_capsule(capsule: Capsule) {
    let Capsule {
        creator: _,
        mode: _,
        unlock_time_ms: _,
        beneficiary: _,
        walrus_blob_id: _,
        seal_policy_id: _,
        claimed: _,
    } = capsule;
}

public fun guild_id(vault: &GuildVault): address { vault.guild_id }
public fun capsule_count(vault: &GuildVault): u64 { vault.next_capsule_id }

public fun has_capsule(vault: &GuildVault, capsule_id: u64): bool {
    vault.capsules.contains(capsule_id)
}

public fun borrow_capsule(vault: &GuildVault, capsule_id: u64): &Capsule {
    assert!(vault.capsules.contains(capsule_id), ECapsuleNotFound);
    &vault.capsules[capsule_id]
}

public(package) fun borrow_capsule_mut(vault: &mut GuildVault, capsule_id: u64): &mut Capsule {
    assert!(vault.capsules.contains(capsule_id), ECapsuleNotFound);
    &mut vault.capsules[capsule_id]
}

public(package) fun add_capsule(
    vault: &mut GuildVault,
    capsule: Capsule,
): u64 {
    let id = vault.next_capsule_id;
    vault.capsules.add(id, capsule);
    vault.next_capsule_id = id + 1;
    id
}

public(package) fun remove_capsule(
    vault: &mut GuildVault,
    capsule_id: u64,
): Capsule {
    assert!(vault.capsules.contains(capsule_id), ECapsuleNotFound);
    vault.capsules.remove(capsule_id)
}

// === Capsule Helpers ===

public(package) fun new_capsule(
    creator: address,
    mode: u8,
    unlock_time_ms: u64,
    beneficiary: address,
    walrus_blob_id: vector<u8>,
    seal_policy_id: vector<u8>,
): Capsule {
    assert!(mode <= MODE_DEAD_MAN, EInvalidMode);
    Capsule {
        creator,
        mode,
        unlock_time_ms,
        beneficiary,
        walrus_blob_id,
        seal_policy_id,
        claimed: false,
    }
}

public fun capsule_mode(c: &Capsule): u8 { c.mode }
public fun capsule_unlock_time_ms(c: &Capsule): u64 { c.unlock_time_ms }
public fun capsule_beneficiary(c: &Capsule): address { c.beneficiary }
public fun capsule_claimed(c: &Capsule): bool { c.claimed }
public fun capsule_creator(c: &Capsule): address { c.creator }
public fun capsule_walrus_blob_id(c: &Capsule): vector<u8> { c.walrus_blob_id }
public fun capsule_seal_policy_id(c: &Capsule): vector<u8> { c.seal_policy_id }

public(package) fun set_claimed(c: &mut Capsule) { c.claimed = true; }

// === Heartbeat Helpers ===

public(package) fun new_heartbeat(
    vault_id: address,
    timeout_ms: u64,
    now_ms: u64,
    ctx: &mut TxContext,
): Heartbeat {
    Heartbeat {
        id: object::new(ctx),
        vault_id,
        last_ping_ms: now_ms,
        timeout_ms,
    }
}

public fun heartbeat_vault_id(h: &Heartbeat): address { h.vault_id }
public fun heartbeat_last_ping_ms(h: &Heartbeat): u64 { h.last_ping_ms }
public fun heartbeat_timeout_ms(h: &Heartbeat): u64 { h.timeout_ms }

public(package) fun update_ping(h: &mut Heartbeat, now_ms: u64) {
    h.last_ping_ms = now_ms;
}

public(package) fun set_timeout(h: &mut Heartbeat, new_timeout_ms: u64) {
    h.timeout_ms = new_timeout_ms;
}

public fun is_timed_out(h: &Heartbeat, now_ms: u64): bool {
    now_ms > h.last_ping_ms + h.timeout_ms
}

// === Event Emitters ===

public(package) fun emit_capsule_created(
    capsule_id: u64,
    guild_id: address,
    creator: address,
    mode: u8,
    unlock_time_ms: u64,
) {
    event::emit(CapsuleCreated { capsule_id, guild_id, creator, mode, unlock_time_ms });
}

public(package) fun emit_capsule_claimed(
    capsule_id: u64,
    guild_id: address,
    claimant: address,
    time_ms: u64,
) {
    event::emit(CapsuleClaimed { capsule_id, guild_id, claimant, time_ms });
}

public(package) fun emit_dead_man_triggered(
    vault_id: address,
    guild_id: address,
    capsule_id: u64,
    time_ms: u64,
) {
    event::emit(DeadManTriggered { vault_id, guild_id, capsule_id, time_ms });
}
