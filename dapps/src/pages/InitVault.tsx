import { useState } from "react";
import { Rocket } from "lucide-react";
import { toast } from "sonner";
import { useDAppKit, useCurrentAccount } from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";
import { WalletGate } from "@/components/capsule/WalletGate";
import { vaultConfig } from "@/lib/vault-config";

const SUI_CLOCK = "0x6";
const TARGET = `${vaultConfig.packageId}::vault_roles::init_guild_vault` as `${string}::${string}::${string}`;

export function InitVault() {
  const { signAndExecuteTransaction } = useDAppKit();
  const account = useCurrentAccount();
  const [timeoutDays, setTimeoutDays] = useState("14");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");

  const handleInit = async () => {
    if (!account) return;
    setBusy(true);
    try {
      const timeoutMs = parseInt(timeoutDays) * 24 * 60 * 60 * 1000;
      const tx = new Transaction();
      tx.moveCall({
        target: TARGET,
        arguments: [
          tx.pure.address(account.address), // guild_id = your address
          tx.pure.u64(timeoutMs),
          tx.object(SUI_CLOCK),
        ],
      });

      const res = await signAndExecuteTransaction({ transaction: tx });
      const digest = (res as any)?.Transaction?.digest ?? (res as any)?.digest ?? "";
      setResult([
        `✅ Vault created successfully!`,
        ``,
        `Tx: ${digest}`,
        `Explorer: https://suiscan.xyz/testnet/tx/${digest}`,
        ``,
        `Now check Suiscan to find your new object IDs:`,
        `- GuildVault (Shared)`,
        `- Heartbeat (Owned by you)`,
        `- GuildOfficerCap (Owned by you)`,
      ].join("\n"));
      toast.success("Vault created!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
      setResult(`Error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <WalletGate message="Connect wallet to init a new vault.">
      <div className="min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto">
          <h1 className="text-3xl font-heading text-[#E2E8F0] mb-4">Init New Guild Vault</h1>
          <p className="text-[#94A3B8] mb-2">Address: <span className="text-[#00F0FF] font-mono text-sm">{account?.address}</span></p>
          <p className="text-[#94A3B8] mb-6 text-sm">This will create a new GuildVault + Heartbeat + OfficerCap owned by you.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-[#E2E8F0] mb-2">Dead Man Timeout (days)</label>
              <input type="number" value={timeoutDays} onChange={(e) => setTimeoutDays(e.target.value)}
                className="w-full px-4 py-3 bg-[#1A1A2E]/50 border border-[#2D2D3F] rounded-lg text-[#E2E8F0] focus:border-[#00F0FF] focus:outline-none focus:ring-1 focus:ring-[#00F0FF]" />
            </div>

            <button onClick={handleInit} disabled={busy}
              className="w-full px-6 py-4 bg-gradient-to-r from-[#00F0FF] to-[#A855F7] text-[#0A0A0F] rounded-lg hover:drop-shadow-[0_0_20px_rgba(0,240,255,0.8)] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {busy ? "Creating..." : <><Rocket className="w-5 h-5" /> Create Vault</>}
            </button>

            {result && (
              <pre className="mt-4 p-4 bg-[#1A1A2E] border border-[#2D2D3F] rounded-lg text-sm text-[#E2E8F0] whitespace-pre-wrap break-all">{result}</pre>
            )}
          </div>
        </div>
      </div>
    </WalletGate>
  );
}
