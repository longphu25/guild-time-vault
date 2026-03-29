/// Guild Time Vault configuration — reads from Vite env vars.

export const VAULT_CONFIG = {
    packageId: import.meta.env.VITE_VAULT_PACKAGE_ID || "",
    registryObjectId: import.meta.env.VITE_VAULT_REGISTRY_ID || "",
    vaultObjectId: import.meta.env.VITE_VAULT_OBJECT_ID || "",
} as const;

export const VAULT_MODULES = {
    VAULT_ROLES: "vault_roles",
    VAULT_CAPSULE_API: "vault_capsule_api",
    VAULT_HEARTBEAT_API: "vault_heartbeat_api",
    VAULT_VIEWS: "vault_views",
    VAULT_REGISTRY: "vault_registry",
} as const;

export const CAPSULE_MODES = {
    ARCHIVE: 0,
    PRIVATE_INHERIT: 1,
    DEAD_MAN: 2,
} as const;

export const MODE_LABELS: Record<number, string> = {
    0: "Archive",
    1: "Private Inherit",
    2: "Dead Man",
};

export const CLOCK_OBJECT_ID = "0x6";
