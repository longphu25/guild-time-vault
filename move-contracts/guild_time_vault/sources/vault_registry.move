/// View functions for VaultRegistry — used by dashboard / indexer.
module guild::vault_registry;

use guild::vault_core::{Self, VaultRegistry, VaultEntry};

// === Registry Views ===

/// Total number of vaults registered.
public fun vault_count(registry: &VaultRegistry): u64 {
    vault_core::registry_vault_count(registry)
}

/// Get vault address at a given index (0-based).
public fun vault_at(registry: &VaultRegistry, index: u64): address {
    vault_core::registry_vault_at(registry, index)
}

/// Check if a vault address is registered.
public fun has_vault(registry: &VaultRegistry, vault_addr: address): bool {
    vault_core::registry_has_vault(registry, vault_addr)
}

/// Get the full entry for a vault address.
public fun entry(registry: &VaultRegistry, vault_addr: address): &VaultEntry {
    vault_core::registry_entry(registry, vault_addr)
}

/// Get creator of a registered vault.
public fun vault_creator(registry: &VaultRegistry, vault_addr: address): address {
    vault_core::entry_creator(vault_core::registry_entry(registry, vault_addr))
}

/// Get guild_id of a registered vault.
public fun vault_guild_id(registry: &VaultRegistry, vault_addr: address): address {
    vault_core::entry_guild_id(vault_core::registry_entry(registry, vault_addr))
}

/// Get creation timestamp of a registered vault.
public fun vault_created_at(registry: &VaultRegistry, vault_addr: address): u64 {
    vault_core::entry_created_at_ms(vault_core::registry_entry(registry, vault_addr))
}

/// Return a page of vault addresses for pagination.
/// Returns up to `limit` addresses starting from `offset`.
public fun list_vaults(
    registry: &VaultRegistry,
    offset: u64,
    limit: u64,
): vector<address> {
    let total = vault_core::registry_vault_count(registry);
    let mut result = vector[];
    let mut i = offset;
    let end = if (offset + limit > total) { total } else { offset + limit };
    while (i < end) {
        result.push_back(vault_core::registry_vault_at(registry, i));
        i = i + 1;
    };
    result
}
