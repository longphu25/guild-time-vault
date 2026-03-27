import { vaultConfig } from "./vault-config";

// Module names within the guild_time_vault package
const MOD = {
  core: "vault_core",
  roles: "vault_roles",
  capsuleApi: "vault_capsule_api",
  heartbeatApi: "vault_heartbeat_api",
  views: "vault_views",
} as const;

/** Build a fully qualified Move function target */
export const target = (module: string, fn: string) =>
  `${vaultConfig.packageId}::${module}::${fn}` as `${string}::${string}::${string}`;

// Capsule modes (u8 enum from contract)
export const CAPSULE_MODE = {
  ARCHIVE: 0,
  PRIVATE_INHERIT: 1,
  DEAD_MAN: 2,
} as const;

// Pre-built targets for all contract functions
export const TX = {
  // Roles
  grantMember: target(MOD.roles, "grant_member"),
  grantOfficer: target(MOD.roles, "grant_officer"),
  revokeMember: target(MOD.roles, "revoke_member"),
  revokeOfficer: target(MOD.roles, "revoke_officer"),
  // Capsule
  createCapsule: target(MOD.capsuleApi, "create_capsule"),
  claimCapsule: target(MOD.capsuleApi, "claim_capsule"),
  deleteCapsule: target(MOD.capsuleApi, "delete_capsule"),
  // Heartbeat
  heartbeat: target(MOD.heartbeatApi, "heartbeat"),
  triggerDeadMan: target(MOD.heartbeatApi, "trigger_dead_man"),
  setHeartbeatTimeout: target(MOD.heartbeatApi, "set_heartbeat_timeout"),
} as const;

// Type names for querying owned objects
export const TYPES = {
  memberCap: `${vaultConfig.packageId}::${MOD.roles}::GuildMemberCap`,
  officerCap: `${vaultConfig.packageId}::${MOD.roles}::GuildOfficerCap`,
  capsule: `${vaultConfig.packageId}::${MOD.core}::Capsule`,
  vault: `${vaultConfig.packageId}::${MOD.core}::GuildVault`,
  heartbeat: `${vaultConfig.packageId}::${MOD.core}::Heartbeat`,
} as const;

export { MOD };
