/// StorageUnit extension bridge for Guild Time Vault.
///
/// Integrates GuildVault with EVE Frontier's StorageUnit assembly via the
/// typed witness pattern. The StorageUnit owner authorizes `VaultAuth` on
/// their assembly, then an officer calls `link_vault` to associate the vault
/// with that StorageUnit.
///
/// Once linked, capsule operations can optionally use the StorageUnit's
/// inventory (deposit/withdraw items as part of capsule create/claim).
///
/// Flow:
///   1. SU owner: `storage_unit::authorize_extension<VaultAuth>(su, owner_cap)`
///   2. Officer:  `vault_extension::link_vault(vault, officer_cap, storage_unit_id)`
///   3. Members:  create/claim capsules — extension can interact with SU inventory
module guild::vault_extension;

use guild::vault_core::{Self, GuildVault};
use guild::vault_roles::GuildOfficerCap;

// === Errors ===
#[error(code = 0)]
const EAlreadyLinked: vector<u8> = b"Vault already linked to a StorageUnit";
#[error(code = 1)]
const ENotLinked: vector<u8> = b"Vault not linked to any StorageUnit";
#[error(code = 2)]
const EGuildMismatch: vector<u8> = b"Officer guild_id does not match vault";

// === Witness ===

/// Typed witness for StorageUnit extension authorization.
/// Only mintable within this package.
public struct VaultAuth has drop {}

/// Mint a VaultAuth witness. Package-restricted.
public(package) fun vault_auth(): VaultAuth {
    VaultAuth {}
}

// === Assembly Link (stored on GuildVault via dynamic field) ===

/// Dynamic field key for the assembly link on GuildVault.
public struct AssemblyLinkKey has copy, drop, store {}

/// The linked StorageUnit assembly address.
public struct AssemblyLink has store, drop {
    storage_unit_id: address,
}

// === Public Functions ===

/// Link a GuildVault to a StorageUnit assembly.
/// The StorageUnit must have already authorized VaultAuth via
/// `storage_unit::authorize_extension<VaultAuth>`.
/// Only an officer of the vault's guild can link.
public fun link_vault(
    vault: &mut GuildVault,
    officer_cap: &GuildOfficerCap,
    storage_unit_id: address,
) {
    assert!(officer_cap.officer_guild_id() == vault_core::guild_id(vault), EGuildMismatch);
    let vault_uid = vault.borrow_uid_mut();
    assert!(
        !sui::dynamic_field::exists_(vault_uid, AssemblyLinkKey {}),
        EAlreadyLinked,
    );
    sui::dynamic_field::add(
        vault_uid,
        AssemblyLinkKey {},
        AssemblyLink { storage_unit_id },
    );
}

/// Unlink a vault from its StorageUnit.
public fun unlink_vault(
    vault: &mut GuildVault,
    officer_cap: &GuildOfficerCap,
) {
    assert!(officer_cap.officer_guild_id() == vault_core::guild_id(vault), EGuildMismatch);
    let vault_uid = vault.borrow_uid_mut();
    assert!(
        sui::dynamic_field::exists_(vault_uid, AssemblyLinkKey {}),
        ENotLinked,
    );
    let _: AssemblyLink = sui::dynamic_field::remove(vault_uid, AssemblyLinkKey {});
}

// === View Functions ===

/// Check if a vault is linked to a StorageUnit.
public fun is_linked(vault: &GuildVault): bool {
    sui::dynamic_field::exists_(vault.borrow_uid(), AssemblyLinkKey {})
}

/// Get the linked StorageUnit address.
public fun linked_storage_unit(vault: &GuildVault): address {
    assert!(
        sui::dynamic_field::exists_(vault.borrow_uid(), AssemblyLinkKey {}),
        ENotLinked,
    );
    sui::dynamic_field::borrow<AssemblyLinkKey, AssemblyLink>(
        vault.borrow_uid(),
        AssemblyLinkKey {},
    ).storage_unit_id
}
