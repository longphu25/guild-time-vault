import { Transaction } from "@mysten/sui/transactions";
import { TX } from "./contract";

const SUI_CLOCK = "0x6";

export function buildCreateCapsuleTx(args: {
  vaultId: string;
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
      tx.object(args.vaultId),
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

export function buildClaimArchiveTx(vaultId: string, memberCapId: string, capsuleId: number) {
  const tx = new Transaction();
  tx.moveCall({
    target: TX.claimArchive,
    arguments: [tx.object(vaultId), tx.object(memberCapId), tx.pure.u64(capsuleId), tx.object(SUI_CLOCK)],
  });
  return tx;
}

export function buildClaimPrivateInheritTx(vaultId: string, capsuleId: number) {
  const tx = new Transaction();
  tx.moveCall({
    target: TX.claimPrivateInherit,
    arguments: [tx.object(vaultId), tx.pure.u64(capsuleId), tx.object(SUI_CLOCK)],
  });
  return tx;
}

export function buildHeartbeatTx(heartbeatId: string) {
  const tx = new Transaction();
  tx.moveCall({
    target: TX.heartbeat,
    arguments: [tx.object(heartbeatId), tx.object(SUI_CLOCK)],
  });
  return tx;
}

export function buildTriggerDeadManTx(vaultId: string, heartbeatId: string, officerCapId: string, capsuleId: number) {
  const tx = new Transaction();
  tx.moveCall({
    target: TX.triggerDeadMan,
    arguments: [tx.object(vaultId), tx.object(heartbeatId), tx.object(officerCapId), tx.pure.u64(capsuleId), tx.object(SUI_CLOCK)],
  });
  return tx;
}

export function buildGrantMemberTx(officerCapId: string, vaultId: string, toAddress: string) {
  const tx = new Transaction();
  tx.moveCall({
    target: TX.grantMember,
    arguments: [tx.object(officerCapId), tx.object(vaultId), tx.pure.address(toAddress)],
  });
  return tx;
}

export function buildGrantOfficerTx(officerCapId: string, vaultId: string, toAddress: string) {
  const tx = new Transaction();
  tx.moveCall({
    target: TX.grantOfficer,
    arguments: [tx.object(officerCapId), tx.object(vaultId), tx.pure.address(toAddress)],
  });
  return tx;
}
