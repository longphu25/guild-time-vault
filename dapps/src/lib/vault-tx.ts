import { Transaction } from "@mysten/sui/transactions";
import { vaultConfig } from "./vault-config";
import { TX } from "./contract";

const SUI_CLOCK = "0x6";

export function buildCreateCapsuleTx(args: {
  mode: number;
  unlockTimeMs: number;
  beneficiary: string;
  walrusBlobId: number[];
  sealPolicyId: number[];
}) {
  const tx = new Transaction();
  tx.moveCall({
    target: TX.createCapsule,
    arguments: [
      tx.object(vaultConfig.vaultObjectId),
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

export function buildClaimCapsuleTx(capsuleId: number) {
  const tx = new Transaction();
  tx.moveCall({
    target: TX.claimCapsule,
    arguments: [
      tx.object(vaultConfig.vaultObjectId),
      tx.pure.u64(capsuleId),
      tx.object(SUI_CLOCK),
    ],
  });
  return tx;
}

export function buildHeartbeatTx() {
  const tx = new Transaction();
  tx.moveCall({
    target: TX.heartbeat,
    arguments: [
      tx.object(vaultConfig.heartbeatObjectId),
      tx.object(SUI_CLOCK),
    ],
  });
  return tx;
}

export function buildTriggerDeadManTx(capsuleId: number) {
  const tx = new Transaction();
  tx.moveCall({
    target: TX.triggerDeadMan,
    arguments: [
      tx.object(vaultConfig.vaultObjectId),
      tx.object(vaultConfig.heartbeatObjectId),
      tx.pure.u64(capsuleId),
      tx.object(SUI_CLOCK),
    ],
  });
  return tx;
}

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
