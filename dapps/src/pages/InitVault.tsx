import { useState } from "react";
import { Rocket, Shield, AlertTriangle, Terminal, Activity, CheckCircle2 } from "lucide-react";
import { useDAppKit, useCurrentAccount } from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";
import { vaultConfig } from "@/lib/vault-config";
import { toast } from "sonner";

const SUI_CLOCK = "0x6";
const TARGET = `${vaultConfig.packageId}::vault_roles::init_guild_vault` as `${string}::${string}::${string}`;

export function InitializeView() {
  const { signAndExecuteTransaction } = useDAppKit();
  const account = useCurrentAccount();
  const [timeoutDays, setTimeoutDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  const handleInit = async () => {
    if (!account) return toast.error("Connect wallet first");
    setBusy(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: TARGET,
        arguments: [
          tx.pure.address(account.address),
          tx.pure.u64(timeoutDays * 24 * 60 * 60 * 1000),
          tx.object(SUI_CLOCK),
        ],
      });
      const res = await signAndExecuteTransaction({ transaction: tx });
      const digest = (res as any)?.Transaction?.digest ?? (res as any)?.digest ?? "";
      setResult(`Vault initialized!\nTx: ${digest}\nhttps://suiscan.xyz/testnet/tx/${digest}`);
      toast.success("Vault initialized!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-12">
      <section className="mb-12">
        <div className="flex items-center gap-4 mb-2">
          <div className="h-px w-12 bg-primary" />
          <span className="font-headline text-xs tracking-[0.2em] text-primary uppercase font-bold">System Initializer</span>
        </div>
        <h1 className="font-headline text-5xl font-black tracking-tighter text-on-surface uppercase mb-4">Initialize Guild Vault</h1>
        <p className="text-on-surface-variant max-w-2xl font-body text-sm leading-relaxed">
          Establish a new high-security node within the LoreLock network. You will receive an <span className="text-primary font-bold">OfficerCap</span> and a <span className="text-secondary font-bold">Heartbeat</span> object.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          {/* Guild ID */}
          <div className="glass-panel p-8 border border-primary/10">
            <div className="corner-bracket" />
            <label className="block font-headline text-[10px] tracking-widest text-primary uppercase mb-4 font-bold">[ 01_IDENTIFICATION ]</label>
            <div className="relative">
              <input type="text" value={account?.address ?? ""} readOnly
                className="w-full bg-transparent border-0 border-b border-on-surface-variant/30 text-lg font-mono text-on-surface py-4 outline-none opacity-70" />
              <div className="absolute right-0 bottom-4 flex items-center gap-2 text-[10px] font-headline text-tertiary">
                <CheckCircle2 size={14} /> {account ? "CONNECTED" : "NOT_CONNECTED"}
              </div>
            </div>
          </div>

          {/* Timeout */}
          <div className="glass-panel p-6 border border-primary/10">
            <label className="block font-headline text-[10px] tracking-widest text-primary uppercase mb-4 font-bold">[ 02_HEARTBEAT_TIMEOUT ]</label>
            <div className="flex items-end justify-between mb-4">
              <span className="text-4xl font-headline font-bold text-on-surface">{timeoutDays}</span>
              <span className="text-xs font-headline text-on-surface-variant pb-1 font-bold">DAYS</span>
            </div>
            <input type="range" min="1" max="365" value={timeoutDays} onChange={(e) => setTimeoutDays(Number(e.target.value))}
              className="w-full h-1 bg-surface-high accent-primary appearance-none cursor-pointer" />
            <div className="flex justify-between mt-2 font-mono text-[9px] text-on-surface-variant">
              <span>MIN: 01</span><span>MAX: 365</span>
            </div>
            <div className="mt-4 p-3 bg-secondary/10 border-l-2 border-secondary">
              <p className="text-[10px] text-secondary leading-tight uppercase font-headline font-bold flex items-center gap-2">
                <AlertTriangle size={12} /> Exceeding heartbeat timeout triggers dead man's switch.
              </p>
            </div>
          </div>

          {/* Action */}
          <button onClick={handleInit} disabled={busy || !account}
            className="w-full group relative overflow-hidden bg-primary py-6 flex items-center justify-center gap-4 transition-all active:scale-[0.98] shadow-[0_0_30px_rgba(0,242,255,0.2)] disabled:opacity-50">
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
            <Rocket size={24} className="text-background" />
            <span className="font-headline font-black text-xl tracking-[0.2em] text-background uppercase">
              {busy ? "INITIALIZING..." : "INITIALIZE GUILD VAULT"}
            </span>
          </button>

          {result && (
            <pre className="p-4 bg-surface-low border border-primary/10 text-sm font-mono text-on-surface whitespace-pre-wrap break-all">{result}</pre>
          )}
        </div>

        {/* Right: Status */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-surface-low border border-primary/10 p-6 space-y-6 relative overflow-hidden">
            <div className="scanline absolute inset-0 opacity-5" />
            <div className="flex justify-between items-center border-b border-on-surface-variant/10 pb-4 relative z-10">
              <span className="font-headline text-[10px] text-on-surface-variant tracking-widest uppercase font-bold">Encryption_State</span>
              <span className="text-tertiary font-headline font-bold text-xs uppercase animate-pulse">Ready</span>
            </div>
            <div className="space-y-4 relative z-10">
              <div className="flex items-start gap-3">
                <Shield size={18} className="text-primary mt-1" />
                <div>
                  <h4 className="font-headline text-[11px] text-on-surface uppercase font-black tracking-tight">SEAL_ENCRYPTION</h4>
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">Threshold encryption via Seal key servers. Data encrypted client-side.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Activity size={18} className="text-secondary mt-1" />
                <div>
                  <h4 className="font-headline text-[11px] text-on-surface uppercase font-black tracking-tight">WALRUS_STORAGE</h4>
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">Decentralized blob storage. Content persists across epochs.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-background border border-on-surface-variant/20 p-4 font-mono text-[9px] text-on-surface-variant space-y-1">
            <div className="flex justify-between border-b border-on-surface-variant/10 mb-2 pb-1">
              <span className="text-primary uppercase flex items-center gap-1"><Terminal size={10} /> Console</span>
            </div>
            <p>&gt; AWAITING_COMMANDER_AUTH...</p>
            <p>&gt; VAULT_SPACE: AVAILABLE</p>
            <p className="text-primary">&gt; READY_FOR_INITIALIZATION</p>
          </div>
        </div>
      </div>
    </div>
  );
}
