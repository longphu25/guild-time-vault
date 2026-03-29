/// Hook for vault transaction actions using dApp kit.
import { useDAppKit } from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";
import {
    VAULT_CONFIG,
    VAULT_MODULES,
    CLOCK_OBJECT_ID,
} from "./config";

type CreateCapsuleParams = {
    capObjectId: string;
    isOfficer: boolean;
    mode: number;
    unlockTimeMs: number;
    beneficiary: string;
    walrusBlobId: number[];
    sealPolicyId: number[];
};

type ClaimParams = {
    capsuleId: number;
    memberCapId?: string;
    officerCapId?: string;
};

export function useVaultActions() {
    const dAppKit = useDAppKit();
    const { packageId, vaultObjectId } = VAULT_CONFIG;

    const execute = async (tx: Transaction) => {
        return dAppKit.signAndExecute({ transaction: tx });
    };

    return { execute, packageId, vaultObjectId };
}
