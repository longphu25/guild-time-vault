/// Seal integration — seal_approve* functions for on-chain access control.
///
/// Seal key servers call these functions via dry_run to decide whether to
/// release decryption keys. Each function receives the IBE identity suffix
/// (without the package ID prefix) and must abort if access is denied.
///
/// Identity encoding per mode:
///   ARCHIVE:         [mode:u8][capsule_id:u64][guild_id:address]
///   PRIVATE_INHERIT: [mode:u8][capsule_id:u64][beneficiary:address]
///   DEAD_MAN:        [mode:u8][capsule_id:u64][vault_id:address]
///
/// References:
///   - https://seal-docs.wal.app/Design
///   - https://seal-docs.wal.app/UsingSeal
module guild::vault_seal;

use sui::bcs;
use sui::clock::Clock;

use guild::vault_core::{Self, GuildVault, Heartbeat};
use guild::vault_roles::GuildMemberCap;

// === Errors ===

#[error(code = 0)]
const ENoAccess: vector<u8> = b"Seal: access denied";
#[error(code = 1)]
const EInvalidIdentity: vector<u8> = b"Seal: malformed identity bytes";
#[error(code = 2)]
const EModeMismatch: vector<u8> = b"Seal: mode in identity does not match capsule";
#[error(code = 3)]
const EGuildMismatch: vector<u8> = b"Seal: guild_id mismatch";

// === ARCHIVE mode ===
// Identity: [0u8][capsule_id:u64][guild_id:address]
// Access: caller has GuildMemberCap for this guild + time >= unlock_time

entry fun seal_approve_archive(
    id: vector<u8>,
    vault: &GuildVault,
    member_cap: &GuildMemberCap,
    clock: &Clock,
) {
    // Parse identity
    let mut prepared = bcs::new(id);
    let mode = prepared.peel_u8();
    let capsule_id = prepared.peel_u64();
    let guild_id = prepared.peel_address();
    let leftovers = prepared.into_remainder_bytes();
    assert!(leftovers.length() == 0, EInvalidIdentity);

    // Verify mode
    assert!(mode == vault_core::mode_archive(), EModeMismatch);

    // Verify guild membership
    assert!(member_cap.member_guild_id() == vault_core::guild_id(vault), EGuildMismatch);
    assert!(guild_id == vault_core::guild_id(vault), EGuildMismatch);

    // Verify capsule exists, is ARCHIVE, is claimed, and time has passed
    let capsule = vault_core::borrow_capsule(vault, capsule_id);
    assert!(vault_core::capsule_mode(capsule) == vault_core::mode_archive(), EModeMismatch);
    assert!(vault_core::capsule_claimed(capsule), ENoAccess);
    assert!(clock.timestamp_ms() >= vault_core::capsule_unlock_time_ms(capsule), ENoAccess);
}

// === PRIVATE_INHERIT mode ===
// Identity: [1u8][capsule_id:u64][beneficiary:address]
// Access: caller == beneficiary + time >= unlock_time + capsule claimed

entry fun seal_approve_private_inherit(
    id: vector<u8>,
    vault: &GuildVault,
    clock: &Clock,
    ctx: &TxContext,
) {
    let mut prepared = bcs::new(id);
    let mode = prepared.peel_u8();
    let capsule_id = prepared.peel_u64();
    let beneficiary = prepared.peel_address();
    let leftovers = prepared.into_remainder_bytes();
    assert!(leftovers.length() == 0, EInvalidIdentity);

    assert!(mode == vault_core::mode_private_inherit(), EModeMismatch);

    // Only the beneficiary can decrypt
    assert!(ctx.sender() == beneficiary, ENoAccess);

    let capsule = vault_core::borrow_capsule(vault, capsule_id);
    assert!(vault_core::capsule_mode(capsule) == vault_core::mode_private_inherit(), EModeMismatch);
    assert!(vault_core::capsule_beneficiary(capsule) == beneficiary, ENoAccess);
    assert!(vault_core::capsule_claimed(capsule), ENoAccess);
    assert!(clock.timestamp_ms() >= vault_core::capsule_unlock_time_ms(capsule), ENoAccess);
}

// === DEAD_MAN mode ===
// Identity: [2u8][capsule_id:u64][vault_id:address]
// Access: heartbeat timed out + capsule claimed

entry fun seal_approve_dead_man(
    id: vector<u8>,
    vault: &GuildVault,
    heartbeat: &Heartbeat,
    clock: &Clock,
) {
    let mut prepared = bcs::new(id);
    let mode = prepared.peel_u8();
    let capsule_id = prepared.peel_u64();
    let vault_id = prepared.peel_address();
    let leftovers = prepared.into_remainder_bytes();
    assert!(leftovers.length() == 0, EInvalidIdentity);

    assert!(mode == vault_core::mode_dead_man(), EModeMismatch);
    assert!(vault_id == vault_core::heartbeat_vault_id(heartbeat), ENoAccess);

    // Heartbeat must have timed out
    assert!(vault_core::is_timed_out(heartbeat, clock.timestamp_ms()), ENoAccess);

    let capsule = vault_core::borrow_capsule(vault, capsule_id);
    assert!(vault_core::capsule_mode(capsule) == vault_core::mode_dead_man(), EModeMismatch);
    assert!(vault_core::capsule_claimed(capsule), ENoAccess);
}

// === Helper: build Seal identity bytes (for client-side use) ===

/// Build the IBE identity for a capsule (without package ID prefix).
/// Client uses this to construct the full identity: [PackageId][result].
public fun build_identity(mode: u8, capsule_id: u64, context_addr: address): vector<u8> {
    let mut id = vector[];
    id.push_back(mode);

    let capsule_bytes = bcs::to_bytes(&capsule_id);
    let mut i = 0;
    while (i < capsule_bytes.length()) {
        id.push_back(capsule_bytes[i]);
        i = i + 1;
    };

    let addr_bytes = bcs::to_bytes(&context_addr);
    i = 0;
    while (i < addr_bytes.length()) {
        id.push_back(addr_bytes[i]);
        i = i + 1;
    };

    id
}
