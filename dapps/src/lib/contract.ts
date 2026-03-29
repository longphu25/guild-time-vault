import { vaultConfig } from "./vault-config";

const MOD = {
  core: "vault_core",
  roles: "vault_roles",
  capsuleApi: "vault_capsule_api",
  heartbeatApi: "vault_heartbeat_api",
  views: "vault_views",
  seal: "vault_seal",
  registry: "vault_registry",
} as const;

const target = (module: string, fn: string) =>
  `${vaultConfig.packageId}::${module}::${fn}` as `${string}::${string}::${string}`;

export const CAPSULE_MODE = { ARCHIVE: 0, PRIVATE_INHERIT: 1, DEAD_MAN: 2 } as const;

// Actual on-chain function targets
export const TX = {
  // Capsule API
  createCapsule: target(MOD.capsuleApi, "create_capsule"),
  createCapsuleAsOfficer: target(MOD.capsuleApi, "create_capsule_as_officer"),
  claimArchive: target(MOD.capsuleApi, "claim_archive"),
  claimPrivateInherit: target(MOD.capsuleApi, "claim_private_inherit"),
  deleteCapsule: target(MOD.capsuleApi, "delete_capsule"),
  // Heartbeat API
  heartbeat: target(MOD.heartbeatApi, "heartbeat"),
  triggerDeadMan: target(MOD.heartbeatApi, "trigger_dead_man"),
  setHeartbeatTimeout: target(MOD.heartbeatApi, "set_heartbeat_timeout"),
  // Roles
  grantMember: target(MOD.roles, "grant_member"),
  grantOfficer: target(MOD.roles, "grant_officer"),
  revokeMember: target(MOD.roles, "revoke_member"),
  revokeOfficer: target(MOD.roles, "revoke_officer"),
  // Seal
  buildIdentity: target(MOD.seal, "build_identity"),
  sealApproveArchive: target(MOD.seal, "seal_approve_archive"),
  sealApprovePrivateInherit: target(MOD.seal, "seal_approve_private_inherit"),
  sealApproveDeadMan: target(MOD.seal, "seal_approve_dead_man"),
} as const;

export const TYPES = {
  memberCap: `${vaultConfig.packageId}::${MOD.roles}::GuildMemberCap`,
  officerCap: `${vaultConfig.packageId}::${MOD.roles}::GuildOfficerCap`,
  capsule: `${vaultConfig.packageId}::${MOD.core}::Capsule`,
  vault: `${vaultConfig.packageId}::${MOD.core}::GuildVault`,
  heartbeat: `${vaultConfig.packageId}::${MOD.core}::Heartbeat`,
  registry: `${vaultConfig.packageId}::${MOD.core}::VaultRegistry`,
} as const;

export { MOD };
