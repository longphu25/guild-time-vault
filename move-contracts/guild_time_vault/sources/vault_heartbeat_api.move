/// Heartbeat & dead-man switch entry functions.
module guild::vault_heartbeat_api;

use sui::clock::Clock;
use guild::vault_core::{Self, GuildVault, Heartbeat};
use guild::vault_roles::GuildOfficerCap;

// === Errors ===
#[error(code = 0)]
const ENotTimedOut: vector<u8> = b"Heartbeat has not timed out yet";
#[error(code = 1)]
const EAlreadyClaimed: vector<u8> = b"Capsule already claimed";
#[error(code = 2)]
const ENotDeadManMode: vector<u8> = b"Capsule is not DEAD_MAN mode";
#[error(code = 3)]
const EGuildMismatch: vector<u8> = b"Officer guild_id mismatch";

/// Owner pings to keep the dead-man switch alive.
public fun heartbeat(
    heart: &mut Heartbeat,
    clock: &Clock,
) {
    vault_core::update_ping(heart, clock.timestamp_ms());
}

/// Owner can update the timeout duration.
public fun set_heartbeat_timeout(
    heart: &mut Heartbeat,
    new_timeout_ms: u64,
) {
    vault_core::set_timeout(heart, new_timeout_ms);
}

/// When heartbeat times out, an officer can trigger dead-man to claim a DEAD_MAN capsule.
public fun trigger_dead_man(
    vault: &mut GuildVault,
    heart: &Heartbeat,
    _officer: &GuildOfficerCap,
    capsule_id: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(_officer.officer_guild_id() == vault_core::guild_id(vault), EGuildMismatch);

    let now_ms = clock.timestamp_ms();
    assert!(vault_core::is_timed_out(heart, now_ms), ENotTimedOut);

    let capsule = vault_core::borrow_capsule_mut(vault, capsule_id);
    assert!(!vault_core::capsule_claimed(capsule), EAlreadyClaimed);
    assert!(vault_core::capsule_mode(capsule) == vault_core::mode_dead_man(), ENotDeadManMode);

    vault_core::set_claimed(capsule);

    vault_core::emit_dead_man_triggered(
        vault_core::heartbeat_vault_id(heart),
        vault_core::guild_id(vault),
        capsule_id,
        now_ms,
    );

    vault_core::emit_capsule_claimed(
        capsule_id,
        vault_core::guild_id(vault),
        ctx.sender(),
        now_ms,
    );
}
