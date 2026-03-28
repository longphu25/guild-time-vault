#[test_only]
module guild::vault_tests;

use sui::test_scenario::{Self as ts};
use sui::clock;

use guild::vault_core;
use guild::vault_roles;
use guild::vault_capsule_api;
use guild::vault_heartbeat_api;
use guild::vault_views;

// === Constants ===

const LEADER: address = @0xA;
const OFFICER_B: address = @0xB;
const MEMBER: address = @0xC;
const BENEFICIARY: address = @0xD;
const OUTSIDER: address = @0xE;
const GUILD_ID: address = @0x100;

// =========================================================================
// Flow 1: Init vault + grant roles (user-flow §2)
// =========================================================================

#[test]
/// Leader inits vault, receives OfficerCap + Heartbeat.
fun init_vault_creates_shared_vault_and_caps() {
    let mut scenario = ts::begin(LEADER);
    let c = clock::create_for_testing(ts::ctx(&mut scenario));

    vault_roles::init_guild_vault(GUILD_ID, 60_000, &c, ts::ctx(&mut scenario));

    ts::next_tx(&mut scenario, LEADER);
    let vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let officer_cap = ts::take_from_sender<vault_roles::GuildOfficerCap>(&scenario);
    let heart = ts::take_from_sender<vault_core::Heartbeat>(&scenario);

    assert!(vault_views::vault_guild_id(&vault) == GUILD_ID);
    assert!(vault_views::vault_capsule_count(&vault) == 0);
    assert!(vault_roles::officer_guild_id(&officer_cap) == GUILD_ID);

    ts::return_to_sender(&scenario, officer_cap);
    ts::return_to_sender(&scenario, heart);
    ts::return_shared(vault);
    clock::destroy_for_testing(c);
    ts::end(scenario);
}

#[test]
/// Leader grants member cap, member receives it (user-flow §2.2).
fun grant_member_delivers_cap() {
    let mut scenario = ts::begin(LEADER);
    let c = clock::create_for_testing(ts::ctx(&mut scenario));
    vault_roles::init_guild_vault(GUILD_ID, 60_000, &c, ts::ctx(&mut scenario));

    ts::next_tx(&mut scenario, LEADER);
    let vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let officer_cap = ts::take_from_sender<vault_roles::GuildOfficerCap>(&scenario);

    vault_roles::grant_member(&officer_cap, &vault, MEMBER, ts::ctx(&mut scenario));

    ts::return_to_sender(&scenario, officer_cap);
    ts::return_shared(vault);

    ts::next_tx(&mut scenario, MEMBER);
    let member_cap = ts::take_from_sender<vault_roles::GuildMemberCap>(&scenario);
    assert!(vault_roles::member_guild_id(&member_cap) == GUILD_ID);
    ts::return_to_sender(&scenario, member_cap);

    clock::destroy_for_testing(c);
    ts::end(scenario);
}

#[test]
/// Leader grants officer cap to another user (user-flow §2.2).
fun grant_officer_delivers_cap() {
    let mut scenario = ts::begin(LEADER);
    let c = clock::create_for_testing(ts::ctx(&mut scenario));
    vault_roles::init_guild_vault(GUILD_ID, 60_000, &c, ts::ctx(&mut scenario));

    ts::next_tx(&mut scenario, LEADER);
    let vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let officer_cap = ts::take_from_sender<vault_roles::GuildOfficerCap>(&scenario);

    vault_roles::grant_officer(&officer_cap, &vault, OFFICER_B, ts::ctx(&mut scenario));

    ts::return_to_sender(&scenario, officer_cap);
    ts::return_shared(vault);

    ts::next_tx(&mut scenario, OFFICER_B);
    let new_officer = ts::take_from_sender<vault_roles::GuildOfficerCap>(&scenario);
    assert!(vault_roles::officer_guild_id(&new_officer) == GUILD_ID);
    ts::return_to_sender(&scenario, new_officer);

    clock::destroy_for_testing(c);
    ts::end(scenario);
}

#[test]
/// Officer revokes a member cap (user-flow §2.2 implied).
fun revoke_member_destroys_cap() {
    let mut scenario = ts::begin(LEADER);
    let c = clock::create_for_testing(ts::ctx(&mut scenario));
    vault_roles::init_guild_vault(GUILD_ID, 60_000, &c, ts::ctx(&mut scenario));

    // Grant member
    ts::next_tx(&mut scenario, LEADER);
    let vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let officer_cap = ts::take_from_sender<vault_roles::GuildOfficerCap>(&scenario);
    vault_roles::grant_member(&officer_cap, &vault, MEMBER, ts::ctx(&mut scenario));
    ts::return_to_sender(&scenario, officer_cap);
    ts::return_shared(vault);

    // Member transfers cap back for revocation
    ts::next_tx(&mut scenario, MEMBER);
    let member_cap = ts::take_from_sender<vault_roles::GuildMemberCap>(&scenario);
    transfer::public_transfer(member_cap, LEADER);

    // Leader revokes
    ts::next_tx(&mut scenario, LEADER);
    let vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let officer_cap = ts::take_from_sender<vault_roles::GuildOfficerCap>(&scenario);
    let member_cap = ts::take_from_sender<vault_roles::GuildMemberCap>(&scenario);
    vault_roles::revoke_member(&officer_cap, &vault, member_cap);
    ts::return_to_sender(&scenario, officer_cap);
    ts::return_shared(vault);

    clock::destroy_for_testing(c);
    ts::end(scenario);
}

// =========================================================================
// Flow 2: Create + claim ARCHIVE capsule (user-flow §3 + §5, use-case §6.1)
// =========================================================================

#[test]
/// Member creates archive capsule, waits for unlock, then claims it.
fun archive_capsule_full_flow() {
    let mut scenario = ts::begin(LEADER);
    let mut c = clock::create_for_testing(ts::ctx(&mut scenario));
    vault_roles::init_guild_vault(GUILD_ID, 60_000, &c, ts::ctx(&mut scenario));

    // Grant member
    ts::next_tx(&mut scenario, LEADER);
    let vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let officer_cap = ts::take_from_sender<vault_roles::GuildOfficerCap>(&scenario);
    vault_roles::grant_member(&officer_cap, &vault, MEMBER, ts::ctx(&mut scenario));
    ts::return_to_sender(&scenario, officer_cap);
    ts::return_shared(vault);

    // Member creates archive capsule (unlock at 10_000ms)
    ts::next_tx(&mut scenario, MEMBER);
    let mut vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let member_cap = ts::take_from_sender<vault_roles::GuildMemberCap>(&scenario);

    vault_capsule_api::create_capsule(
        &mut vault,
        &member_cap,
        vault_core::mode_archive(),
        10_000,
        @0x0,
        b"blob_archive",
        b"seal_archive",
        &c,
        ts::ctx(&mut scenario),
    );

    assert!(vault_views::vault_capsule_count(&vault) == 1);
    assert!(!vault_views::is_capsule_claimed(&vault, 0));

    // Before unlock: capsule is NOT unlockable
    assert!(!vault_views::is_capsule_unlockable(&vault, 0, &c));

    // Advance clock to unlock time
    clock::set_for_testing(&mut c, 10_000);
    assert!(vault_views::is_capsule_unlockable(&vault, 0, &c));

    // Member claims
    ts::next_tx(&mut scenario, MEMBER);
    vault_capsule_api::claim_archive(
        &mut vault,
        &member_cap,
        0,
        &c,
        ts::ctx(&mut scenario),
    );

    assert!(vault_views::is_capsule_claimed(&vault, 0));
    assert!(!vault_views::is_capsule_unlockable(&vault, 0, &c));

    ts::return_to_sender(&scenario, member_cap);
    ts::return_shared(vault);
    clock::destroy_for_testing(c);
    ts::end(scenario);
}

#[test, expected_failure(abort_code = vault_capsule_api::ETooEarly)]
/// Claim archive before unlock time should fail.
fun archive_claim_too_early_fails() {
    let mut scenario = ts::begin(LEADER);
    let c = clock::create_for_testing(ts::ctx(&mut scenario));
    vault_roles::init_guild_vault(GUILD_ID, 60_000, &c, ts::ctx(&mut scenario));

    ts::next_tx(&mut scenario, LEADER);
    let vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let officer_cap = ts::take_from_sender<vault_roles::GuildOfficerCap>(&scenario);
    vault_roles::grant_member(&officer_cap, &vault, MEMBER, ts::ctx(&mut scenario));
    ts::return_to_sender(&scenario, officer_cap);
    ts::return_shared(vault);

    ts::next_tx(&mut scenario, MEMBER);
    let mut vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let member_cap = ts::take_from_sender<vault_roles::GuildMemberCap>(&scenario);

    vault_capsule_api::create_capsule(
        &mut vault,
        &member_cap,
        vault_core::mode_archive(),
        10_000,
        @0x0,
        b"blob",
        b"seal",
        &c,
        ts::ctx(&mut scenario),
    );

    // Try claim at time 0 — should abort ETooEarly
    ts::next_tx(&mut scenario, MEMBER);
    vault_capsule_api::claim_archive(
        &mut vault,
        &member_cap,
        0,
        &c,
        ts::ctx(&mut scenario),
    );

    abort 0 // unreachable
}

#[test, expected_failure(abort_code = vault_capsule_api::EAlreadyClaimed)]
/// Double-claim should fail.
fun archive_double_claim_fails() {
    let mut scenario = ts::begin(LEADER);
    let mut c = clock::create_for_testing(ts::ctx(&mut scenario));
    vault_roles::init_guild_vault(GUILD_ID, 60_000, &c, ts::ctx(&mut scenario));

    ts::next_tx(&mut scenario, LEADER);
    let vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let officer_cap = ts::take_from_sender<vault_roles::GuildOfficerCap>(&scenario);
    vault_roles::grant_member(&officer_cap, &vault, MEMBER, ts::ctx(&mut scenario));
    ts::return_to_sender(&scenario, officer_cap);
    ts::return_shared(vault);

    ts::next_tx(&mut scenario, MEMBER);
    let mut vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let member_cap = ts::take_from_sender<vault_roles::GuildMemberCap>(&scenario);

    vault_capsule_api::create_capsule(
        &mut vault,
        &member_cap,
        vault_core::mode_archive(),
        10_000,
        @0x0,
        b"blob",
        b"seal",
        &c,
        ts::ctx(&mut scenario),
    );

    clock::set_for_testing(&mut c, 10_000);

    ts::next_tx(&mut scenario, MEMBER);
    vault_capsule_api::claim_archive(&mut vault, &member_cap, 0, &c, ts::ctx(&mut scenario));

    // Second claim — should abort EAlreadyClaimed
    ts::next_tx(&mut scenario, MEMBER);
    vault_capsule_api::claim_archive(&mut vault, &member_cap, 0, &c, ts::ctx(&mut scenario));

    abort 0 // unreachable
}

// =========================================================================
// Flow 3: Private inheritance (user-flow §6.2)
// =========================================================================

#[test]
/// Leader creates PRIVATE_INHERIT capsule for beneficiary, only beneficiary can claim.
fun private_inherit_full_flow() {
    let mut scenario = ts::begin(LEADER);
    let mut c = clock::create_for_testing(ts::ctx(&mut scenario));
    vault_roles::init_guild_vault(GUILD_ID, 60_000, &c, ts::ctx(&mut scenario));

    // Leader creates capsule as officer with beneficiary
    ts::next_tx(&mut scenario, LEADER);
    let mut vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let officer_cap = ts::take_from_sender<vault_roles::GuildOfficerCap>(&scenario);

    vault_capsule_api::create_capsule_as_officer(
        &mut vault,
        &officer_cap,
        vault_core::mode_private_inherit(),
        20_000,
        BENEFICIARY,
        b"inherit_blob",
        b"inherit_seal",
        &c,
        ts::ctx(&mut scenario),
    );

    assert!(vault_views::get_capsule_mode(&vault, 0) == vault_core::mode_private_inherit());

    ts::return_to_sender(&scenario, officer_cap);

    // Advance clock past unlock
    clock::set_for_testing(&mut c, 20_000);

    // Beneficiary claims
    ts::next_tx(&mut scenario, BENEFICIARY);
    vault_capsule_api::claim_private_inherit(
        &mut vault,
        0,
        &c,
        ts::ctx(&mut scenario),
    );

    assert!(vault_views::is_capsule_claimed(&vault, 0));

    ts::return_shared(vault);
    clock::destroy_for_testing(c);
    ts::end(scenario);
}

#[test, expected_failure(abort_code = vault_capsule_api::ENotBeneficiary)]
/// Non-beneficiary cannot claim PRIVATE_INHERIT capsule.
fun private_inherit_wrong_caller_fails() {
    let mut scenario = ts::begin(LEADER);
    let mut c = clock::create_for_testing(ts::ctx(&mut scenario));
    vault_roles::init_guild_vault(GUILD_ID, 60_000, &c, ts::ctx(&mut scenario));

    ts::next_tx(&mut scenario, LEADER);
    let mut vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let officer_cap = ts::take_from_sender<vault_roles::GuildOfficerCap>(&scenario);

    vault_capsule_api::create_capsule_as_officer(
        &mut vault,
        &officer_cap,
        vault_core::mode_private_inherit(),
        20_000,
        BENEFICIARY,
        b"blob",
        b"seal",
        &c,
        ts::ctx(&mut scenario),
    );

    clock::set_for_testing(&mut c, 20_000);

    // Outsider tries to claim — should fail
    ts::next_tx(&mut scenario, OUTSIDER);
    vault_capsule_api::claim_private_inherit(
        &mut vault,
        0,
        &c,
        ts::ctx(&mut scenario),
    );

    abort 0 // unreachable
}

#[test, expected_failure(abort_code = vault_capsule_api::ETooEarly)]
/// Beneficiary cannot claim before unlock time.
fun private_inherit_too_early_fails() {
    let mut scenario = ts::begin(LEADER);
    let c = clock::create_for_testing(ts::ctx(&mut scenario));
    vault_roles::init_guild_vault(GUILD_ID, 60_000, &c, ts::ctx(&mut scenario));

    ts::next_tx(&mut scenario, LEADER);
    let mut vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let officer_cap = ts::take_from_sender<vault_roles::GuildOfficerCap>(&scenario);

    vault_capsule_api::create_capsule_as_officer(
        &mut vault,
        &officer_cap,
        vault_core::mode_private_inherit(),
        20_000,
        BENEFICIARY,
        b"blob",
        b"seal",
        &c,
        ts::ctx(&mut scenario),
    );

    // Beneficiary tries at time 0
    ts::next_tx(&mut scenario, BENEFICIARY);
    vault_capsule_api::claim_private_inherit(
        &mut vault,
        0,
        &c,
        ts::ctx(&mut scenario),
    );

    abort 0 // unreachable
}

// =========================================================================
// Flow 4: Dead man's switch (user-flow §4 + §6.3)
// =========================================================================

#[test]
/// Leader pings heartbeat, then stops. Officer triggers dead-man after timeout.
fun dead_man_switch_full_flow() {
    let mut scenario = ts::begin(LEADER);
    let mut c = clock::create_for_testing(ts::ctx(&mut scenario));
    vault_roles::init_guild_vault(GUILD_ID, 5_000, &c, ts::ctx(&mut scenario));

    // Leader creates dead-man capsule
    ts::next_tx(&mut scenario, LEADER);
    let mut vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let officer_cap = ts::take_from_sender<vault_roles::GuildOfficerCap>(&scenario);

    vault_capsule_api::create_capsule_as_officer(
        &mut vault,
        &officer_cap,
        vault_core::mode_dead_man(),
        100_000,
        @0x0,
        b"deadman_blob",
        b"deadman_seal",
        &c,
        ts::ctx(&mut scenario),
    );

    // Leader pings heartbeat at time 2_000
    clock::set_for_testing(&mut c, 2_000);
    ts::next_tx(&mut scenario, LEADER);
    let mut heart = ts::take_from_sender<vault_core::Heartbeat>(&scenario);
    vault_heartbeat_api::heartbeat(&mut heart, &c);
    assert!(vault_views::get_heartbeat_last_ping(&heart) == 2_000);

    // Time passes beyond timeout (2_000 + 5_000 = 7_000)
    clock::set_for_testing(&mut c, 8_000);
    assert!(vault_views::is_heartbeat_timed_out(&heart, &c));

    // Officer triggers dead man
    ts::next_tx(&mut scenario, LEADER);
    vault_heartbeat_api::trigger_dead_man(
        &mut vault,
        &heart,
        &officer_cap,
        0,
        &c,
        ts::ctx(&mut scenario),
    );

    assert!(vault_views::is_capsule_claimed(&vault, 0));

    ts::return_to_sender(&scenario, heart);
    ts::return_to_sender(&scenario, officer_cap);
    ts::return_shared(vault);
    clock::destroy_for_testing(c);
    ts::end(scenario);
}

#[test, expected_failure(abort_code = vault_heartbeat_api::ENotTimedOut)]
/// Cannot trigger dead-man if heartbeat is still alive.
fun dead_man_not_timed_out_fails() {
    let mut scenario = ts::begin(LEADER);
    let mut c = clock::create_for_testing(ts::ctx(&mut scenario));
    vault_roles::init_guild_vault(GUILD_ID, 10_000, &c, ts::ctx(&mut scenario));

    ts::next_tx(&mut scenario, LEADER);
    let mut vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let officer_cap = ts::take_from_sender<vault_roles::GuildOfficerCap>(&scenario);

    vault_capsule_api::create_capsule_as_officer(
        &mut vault,
        &officer_cap,
        vault_core::mode_dead_man(),
        100_000,
        @0x0,
        b"blob",
        b"seal",
        &c,
        ts::ctx(&mut scenario),
    );

    // Only 5_000ms passed, timeout is 10_000
    clock::set_for_testing(&mut c, 5_000);

    ts::next_tx(&mut scenario, LEADER);
    let heart = ts::take_from_sender<vault_core::Heartbeat>(&scenario);

    vault_heartbeat_api::trigger_dead_man(
        &mut vault,
        &heart,
        &officer_cap,
        0,
        &c,
        ts::ctx(&mut scenario),
    );

    abort 0 // unreachable
}

#[test]
/// Heartbeat ping resets the timeout window.
fun heartbeat_ping_resets_timeout() {
    let mut scenario = ts::begin(LEADER);
    let mut c = clock::create_for_testing(ts::ctx(&mut scenario));
    vault_roles::init_guild_vault(GUILD_ID, 5_000, &c, ts::ctx(&mut scenario));

    ts::next_tx(&mut scenario, LEADER);
    let mut heart = ts::take_from_sender<vault_core::Heartbeat>(&scenario);

    // At time 4_000, not timed out yet
    clock::set_for_testing(&mut c, 4_000);
    assert!(!vault_views::is_heartbeat_timed_out(&heart, &c));

    // Ping at 4_000
    vault_heartbeat_api::heartbeat(&mut heart, &c);
    assert!(vault_views::get_heartbeat_last_ping(&heart) == 4_000);

    // At time 8_000 (4_000 + 5_000 = 9_000 deadline), still alive
    clock::set_for_testing(&mut c, 8_000);
    assert!(!vault_views::is_heartbeat_timed_out(&heart, &c));

    // At time 10_000, now timed out
    clock::set_for_testing(&mut c, 10_000);
    assert!(vault_views::is_heartbeat_timed_out(&heart, &c));

    ts::return_to_sender(&scenario, heart);
    clock::destroy_for_testing(c);
    ts::end(scenario);
}

#[test]
/// Officer can update heartbeat timeout.
fun set_heartbeat_timeout_works() {
    let mut scenario = ts::begin(LEADER);
    let c = clock::create_for_testing(ts::ctx(&mut scenario));
    vault_roles::init_guild_vault(GUILD_ID, 5_000, &c, ts::ctx(&mut scenario));

    ts::next_tx(&mut scenario, LEADER);
    let mut heart = ts::take_from_sender<vault_core::Heartbeat>(&scenario);

    assert!(vault_views::get_heartbeat_timeout(&heart) == 5_000);
    vault_heartbeat_api::set_heartbeat_timeout(&mut heart, 30_000);
    assert!(vault_views::get_heartbeat_timeout(&heart) == 30_000);

    ts::return_to_sender(&scenario, heart);
    clock::destroy_for_testing(c);
    ts::end(scenario);
}

// =========================================================================
// Flow 5: Officer delete capsule (admin cleanup)
// =========================================================================

#[test]
/// Officer deletes a capsule.
fun officer_delete_capsule_works() {
    let mut scenario = ts::begin(LEADER);
    let c = clock::create_for_testing(ts::ctx(&mut scenario));
    vault_roles::init_guild_vault(GUILD_ID, 60_000, &c, ts::ctx(&mut scenario));

    ts::next_tx(&mut scenario, LEADER);
    let mut vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let officer_cap = ts::take_from_sender<vault_roles::GuildOfficerCap>(&scenario);

    vault_capsule_api::create_capsule_as_officer(
        &mut vault,
        &officer_cap,
        vault_core::mode_archive(),
        10_000,
        @0x0,
        b"blob",
        b"seal",
        &c,
        ts::ctx(&mut scenario),
    );

    assert!(vault_views::vault_capsule_count(&vault) == 1);

    vault_capsule_api::delete_capsule(&officer_cap, &mut vault, 0);

    // Capsule count stays at 1 (next_capsule_id) but capsule is removed
    assert!(!vault_core::has_capsule(&vault, 0));

    ts::return_to_sender(&scenario, officer_cap);
    ts::return_shared(vault);
    clock::destroy_for_testing(c);
    ts::end(scenario);
}

// =========================================================================
// Flow 6: View functions (user-flow §5.1)
// =========================================================================

#[test]
/// View functions return correct capsule metadata.
fun view_functions_return_correct_data() {
    let mut scenario = ts::begin(LEADER);
    let c = clock::create_for_testing(ts::ctx(&mut scenario));
    vault_roles::init_guild_vault(GUILD_ID, 60_000, &c, ts::ctx(&mut scenario));

    ts::next_tx(&mut scenario, LEADER);
    let mut vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let officer_cap = ts::take_from_sender<vault_roles::GuildOfficerCap>(&scenario);

    vault_capsule_api::create_capsule_as_officer(
        &mut vault,
        &officer_cap,
        vault_core::mode_private_inherit(),
        50_000,
        BENEFICIARY,
        b"view_blob",
        b"view_seal",
        &c,
        ts::ctx(&mut scenario),
    );

    assert!(vault_views::get_capsule_mode(&vault, 0) == vault_core::mode_private_inherit());
    assert!(vault_views::get_capsule_unlock_time(&vault, 0) == 50_000);
    assert!(!vault_views::is_capsule_claimed(&vault, 0));

    ts::return_to_sender(&scenario, officer_cap);
    ts::return_shared(vault);
    clock::destroy_for_testing(c);
    ts::end(scenario);
}

// =========================================================================
// Flow 7: Multiple capsules in one vault
// =========================================================================

#[test]
/// Create multiple capsules of different modes in the same vault.
fun multiple_capsules_different_modes() {
    let mut scenario = ts::begin(LEADER);
    let mut c = clock::create_for_testing(ts::ctx(&mut scenario));
    vault_roles::init_guild_vault(GUILD_ID, 5_000, &c, ts::ctx(&mut scenario));

    ts::next_tx(&mut scenario, LEADER);
    let mut vault = ts::take_shared<vault_core::GuildVault>(&scenario);
    let officer_cap = ts::take_from_sender<vault_roles::GuildOfficerCap>(&scenario);

    // Capsule 0: ARCHIVE
    vault_capsule_api::create_capsule_as_officer(
        &mut vault, &officer_cap,
        vault_core::mode_archive(), 10_000, @0x0,
        b"a1", b"s1", &c, ts::ctx(&mut scenario),
    );

    // Capsule 1: PRIVATE_INHERIT
    vault_capsule_api::create_capsule_as_officer(
        &mut vault, &officer_cap,
        vault_core::mode_private_inherit(), 20_000, BENEFICIARY,
        b"a2", b"s2", &c, ts::ctx(&mut scenario),
    );

    // Capsule 2: DEAD_MAN
    vault_capsule_api::create_capsule_as_officer(
        &mut vault, &officer_cap,
        vault_core::mode_dead_man(), 100_000, @0x0,
        b"a3", b"s3", &c, ts::ctx(&mut scenario),
    );

    assert!(vault_views::vault_capsule_count(&vault) == 3);
    assert!(vault_views::get_capsule_mode(&vault, 0) == vault_core::mode_archive());
    assert!(vault_views::get_capsule_mode(&vault, 1) == vault_core::mode_private_inherit());
    assert!(vault_views::get_capsule_mode(&vault, 2) == vault_core::mode_dead_man());

    // Claim archive at time 10_000
    clock::set_for_testing(&mut c, 10_000);
    vault_roles::grant_member(&officer_cap, &vault, MEMBER, ts::ctx(&mut scenario));
    ts::return_to_sender(&scenario, officer_cap);

    ts::next_tx(&mut scenario, MEMBER);
    let member_cap = ts::take_from_sender<vault_roles::GuildMemberCap>(&scenario);
    vault_capsule_api::claim_archive(&mut vault, &member_cap, 0, &c, ts::ctx(&mut scenario));
    assert!(vault_views::is_capsule_claimed(&vault, 0));
    assert!(!vault_views::is_capsule_claimed(&vault, 1));
    assert!(!vault_views::is_capsule_claimed(&vault, 2));

    ts::return_to_sender(&scenario, member_cap);
    ts::return_shared(vault);
    clock::destroy_for_testing(c);
    ts::end(scenario);
}
