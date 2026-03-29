/// View / helper functions for UI and indexer consumption.
module guild::vault_views;

use sui::clock::Clock;
use guild::vault_core::{Self, GuildVault, Capsule, Heartbeat, VaultRegistry};

// === Vault Views ===

public fun vault_guild_id(vault: &GuildVault): address {
    vault_core::guild_id(vault)
}

public fun vault_capsule_count(vault: &GuildVault): u64 {
    vault_core::capsule_count(vault)
}

// === Capsule Views ===

public fun get_capsule(vault: &GuildVault, capsule_id: u64): &Capsule {
    vault_core::borrow_capsule(vault, capsule_id)
}

public fun get_capsule_mode(vault: &GuildVault, capsule_id: u64): u8 {
    vault_core::capsule_mode(vault_core::borrow_capsule(vault, capsule_id))
}

public fun get_capsule_unlock_time(vault: &GuildVault, capsule_id: u64): u64 {
    vault_core::capsule_unlock_time_ms(vault_core::borrow_capsule(vault, capsule_id))
}

public fun is_capsule_claimed(vault: &GuildVault, capsule_id: u64): bool {
    vault_core::capsule_claimed(vault_core::borrow_capsule(vault, capsule_id))
}

public fun is_capsule_unlockable(
    vault: &GuildVault,
    capsule_id: u64,
    clock: &Clock,
): bool {
    let capsule = vault_core::borrow_capsule(vault, capsule_id);
    !vault_core::capsule_claimed(capsule)
        && clock.timestamp_ms() >= vault_core::capsule_unlock_time_ms(capsule)
}

// === Heartbeat Views ===

public fun get_heartbeat_last_ping(heart: &Heartbeat): u64 {
    vault_core::heartbeat_last_ping_ms(heart)
}

public fun get_heartbeat_timeout(heart: &Heartbeat): u64 {
    vault_core::heartbeat_timeout_ms(heart)
}

public fun is_heartbeat_timed_out(heart: &Heartbeat, clock: &Clock): bool {
    vault_core::is_timed_out(heart, clock.timestamp_ms())
}

// === Registry Views ===

public fun registry_vault_count(registry: &VaultRegistry): u64 {
    vault_core::registry_vault_count(registry)
}

public fun registry_has_vault(registry: &VaultRegistry, vault_addr: address): bool {
    vault_core::registry_has_vault(registry, vault_addr)
}
