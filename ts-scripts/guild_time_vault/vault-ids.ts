import { requireEnv } from "../utils/helper";

/// Resolve guild_time_vault object IDs from env.
export function resolveVaultIds() {
    const packageId = requireEnv("VAULT_PACKAGE_ID");
    const registryId = process.env.VAULT_REGISTRY_ID || "";
    return { packageId, registryId };
}

/// Resolve vault shared object + heartbeat + caps from env or args.
export function resolveVaultObjects() {
    const packageId = requireEnv("VAULT_PACKAGE_ID");
    const registryId = requireEnv("VAULT_REGISTRY_ID");
    const vaultId = requireEnv("VAULT_OBJECT_ID");
    const heartbeatId = process.env.HEARTBEAT_OBJECT_ID || "";
    const officerCapId = process.env.OFFICER_CAP_ID || "";
    const memberCapId = process.env.MEMBER_CAP_ID || "";

    return { packageId, registryId, vaultId, heartbeatId, officerCapId, memberCapId };
}
