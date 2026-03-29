export const vaultConfig = {
  packageId: import.meta.env.VITE_VAULT_PACKAGE_ID as string,
  registryId: import.meta.env.VITE_VAULT_REGISTRY_ID as string,
} as const;
