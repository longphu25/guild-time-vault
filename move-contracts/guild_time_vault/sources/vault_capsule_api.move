/// Entry functions for capsule CRUD operations.
module guild::vault_capsule_api;

use sui::clock::Clock;
use guild::vault_core::{Self, GuildVault};
use guild::vault_roles::{GuildMemberCap, GuildOfficerCap};

// === Errors ===
#[error(code = 0)]
const EUnlockTimeInPast: vector<u8> = b"Unlock time must be in the future";
#[error(code = 1)]
const ETooEarly: vector<u8> = b"Capsule is still time-locked";
#[error(code = 2)]
const EAlreadyClaimed: vector<u8> = b"Capsule already claimed";
#[error(code = 3)]
const ENotBeneficiary: vector<u8> = b"Caller is not the beneficiary";
#[error(code = 4)]
const EGuildMismatch: vector<u8> = b"Capability guild_id mismatch";
#[error(code = 5)]
const EInvalidModeForClaim: vector<u8> = b"Cannot claim DEAD_MAN capsule via this function";

/// Any member or officer can create a capsule.
public fun create_capsule(
    vault: &mut GuildVault,
    _member: &GuildMemberCap,
    mode: u8,
    unlock_time_ms: u64,
    beneficiary: address,
    walrus_blob_id: vector<u8>,
    seal_policy_id: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(_member.member_guild_id() == vault_core::guild_id(vault), EGuildMismatch);
    assert!(unlock_time_ms > clock.timestamp_ms(), EUnlockTimeInPast);

    let capsule = vault_core::new_capsule(
        ctx.sender(),
        mode,
        unlock_time_ms,
        beneficiary,
        walrus_blob_id,
        seal_policy_id,
    );

    let capsule_id = vault_core::add_capsule(vault, capsule);

    vault_core::emit_capsule_created(
        capsule_id,
        vault_core::guild_id(vault),
        ctx.sender(),
        mode,
        unlock_time_ms,
    );
}

/// Officers can also create capsules (officer is superset of member).
public fun create_capsule_as_officer(
    vault: &mut GuildVault,
    _officer: &GuildOfficerCap,
    mode: u8,
    unlock_time_ms: u64,
    beneficiary: address,
    walrus_blob_id: vector<u8>,
    seal_policy_id: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(_officer.officer_guild_id() == vault_core::guild_id(vault), EGuildMismatch);
    assert!(unlock_time_ms > clock.timestamp_ms(), EUnlockTimeInPast);

    let capsule = vault_core::new_capsule(
        ctx.sender(),
        mode,
        unlock_time_ms,
        beneficiary,
        walrus_blob_id,
        seal_policy_id,
    );

    let capsule_id = vault_core::add_capsule(vault, capsule);

    vault_core::emit_capsule_created(
        capsule_id,
        vault_core::guild_id(vault),
        ctx.sender(),
        mode,
        unlock_time_ms,
    );
}

/// Claim an ARCHIVE capsule — any guild member after unlock time.
public fun claim_archive(
    vault: &mut GuildVault,
    _member: &GuildMemberCap,
    capsule_id: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(_member.member_guild_id() == vault_core::guild_id(vault), EGuildMismatch);

    let capsule = vault_core::borrow_capsule_mut(vault, capsule_id);
    assert!(!vault_core::capsule_claimed(capsule), EAlreadyClaimed);
    assert!(vault_core::capsule_mode(capsule) == vault_core::mode_archive(), EInvalidModeForClaim);
    assert!(clock.timestamp_ms() >= vault_core::capsule_unlock_time_ms(capsule), ETooEarly);

    vault_core::set_claimed(capsule);

    vault_core::emit_capsule_claimed(
        capsule_id,
        vault_core::guild_id(vault),
        ctx.sender(),
        clock.timestamp_ms(),
    );
}

/// Claim a PRIVATE_INHERIT capsule — only the designated beneficiary after unlock time.
public fun claim_private_inherit(
    vault: &mut GuildVault,
    capsule_id: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let capsule = vault_core::borrow_capsule_mut(vault, capsule_id);
    assert!(!vault_core::capsule_claimed(capsule), EAlreadyClaimed);
    assert!(vault_core::capsule_mode(capsule) == vault_core::mode_private_inherit(), EInvalidModeForClaim);
    assert!(clock.timestamp_ms() >= vault_core::capsule_unlock_time_ms(capsule), ETooEarly);
    assert!(ctx.sender() == vault_core::capsule_beneficiary(capsule), ENotBeneficiary);

    vault_core::set_claimed(capsule);

    vault_core::emit_capsule_claimed(
        capsule_id,
        vault_core::guild_id(vault),
        ctx.sender(),
        clock.timestamp_ms(),
    );
}

/// Officer can delete a capsule (cleanup / error correction).
public fun delete_capsule(
    _officer: &GuildOfficerCap,
    vault: &mut GuildVault,
    capsule_id: u64,
) {
    assert!(_officer.officer_guild_id() == vault_core::guild_id(vault), EGuildMismatch);
    let capsule = vault_core::remove_capsule(vault, capsule_id);
    vault_core::destroy_capsule(capsule);
}
