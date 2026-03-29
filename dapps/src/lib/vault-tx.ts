import { Transaction } from "@mysten/sui/transactions";
import { vaultConfig } from "./vault-config";
import { TX } from "./contract";

const SUI_CLOCK = "0x6";

/**
 * create_capsule — requires MemberCap
 * create_capsule_as_officer — requires OfficerCap
 * Automatically picks the right function based on role.
 */
export function buildCreateCapsuleTx(args: {
  capId: string;
  role: "member" | "officer";
  mode: number;
  unlockTimeMs: number;
  beneficiary: string;
  walrusBlobId: number[];
  sealPolicyId: number[];
}) {
  const tx = new Transaction();
  tx.moveCall({
    target: args.role === "officer" ? TX.createCapsuleAsOfficer : TX.createCapsule,
    arguments: [
      tx.object(vaultConfig.vaultObjectId),
      tx.object(args.capId),
      tx.pure.u8(args.mode),
      tx.pure.u64(args.unlockTimeMs),
      tx.pure.address(args.beneficiary),
      tx.pure.vector("u8", args.walrusBlobId),
      tx.pure.vector("u8", args.sealPolicyId),
      tx.object(SUI_CLOCK),
    ],
  });
  return tx;
}

/**
 * claim_archive(vault: &mut GuildVault, cap: &GuildMemberCap, capsule_id: u64, clock: &Clock, ctx)
 */
export function buildClaimArchiveTx(memberCapId: string, capsuleId: number) {
  const tx = new Transaction();
  tx.moveCall({
    target: TX.claimArchive,
    arguments: [
      tx.object(vaultConfig.vaultObjectId),
      tx.object(memberCapId),
      tx.pure.u64(capsuleId),
      tx.object(SUI_CLOCK),
    ],
  });
  return tx;
}

/**
 * claim_private_inherit(vault: &mut GuildVault, capsule_id: u64, clock: &Clock, ctx)
 */
export function buildClaimPrivateInheritTx(capsuleId: number) {
  const tx = new Transaction();
  tx.moveCall({
    target: TX.claimPrivateInherit,
    arguments: [
      tx.object(vaultConfig.vaultObjectId),
      tx.pure.u64(capsuleId),
      tx.object(SUI_CLOCK),
    ],
  });
  return tx;
}

/** heartbeat(heart: &mut Heartbeat, clock: &Clock) */
export function buildHeartbeatTx(heartbeatId: string) {
  const tx = new Transaction();
  tx.moveCall({
    target: TX.heartbeat,
    arguments: [
      tx.object(heartbeatId),
      tx.object(SUI_CLOCK),
    ],
  });
  return tx;
}

/** trigger_dead_man(vault, heartbeat, officer_cap, capsule_id, clock, ctx) */
export function buildTriggerDeadManTx(heartbeatId: string, officerCapId: string, capsuleId: number) {
  const tx = new Transaction();
  tx.moveCall({
    target: TX.triggerDeadMan,
    arguments: [
      tx.object(vaultConfig.vaultObjectId),
      tx.object(heartbeatId),
      tx.object(officerCapId),
      tx.pure.u64(capsuleId),
      tx.object(SUI_CLOCK),
    ],
  });
  return tx;
}

/** grant_member(officer_cap, vault, to, ctx) */
export function buildGrantMemberTx(officerCapId: string, toAddress: string) {
  const tx = new Transaction();
  tx.moveCall({
    target: TX.grantMember,
    arguments: [
      tx.object(officerCapId),
      tx.object(vaultConfig.vaultObjectId),
      tx.pure.address(toAddress),
    ],
  });
  return tx;
}

/** grant_officer(officer_cap, vault, to, ctx) */
export function buildGrantOfficerTx(officerCapId: string, toAddress: string) {
  const tx = new Transaction();
  tx.moveCall({
    target: TX.grantOfficer,
    arguments: [
      tx.object(officerCapId),
      tx.object(vaultConfig.vaultObjectId),
      tx.pure.address(toAddress),
    ],
  });
  return tx;
}
