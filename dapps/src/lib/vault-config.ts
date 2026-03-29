export const vaultConfig = {
  packageId: import.meta.env.VITE_VAULT_PACKAGE_ID as string,
  registryObjectId: import.meta.env.VITE_VAULT_REGISTRY_ID as string,
  vaultObjectId: import.meta.env.VITE_VAULT_OBJECT_ID as string,
} as const;
