/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VAULT_PACKAGE_ID: string;
  readonly VITE_VAULT_REGISTRY_ID: string;
  readonly VITE_EVE_WORLD_PACKAGE_ID: string;
  readonly VITE_SUI_GRAPHQL_ENDPOINT: string;
  readonly VITE_OBJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
