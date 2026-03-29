import { useState } from "react";
import { Heart, Timer, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { useDAppKit } from "@mysten/dapp-kit-react";
import { useVault } from "@/hooks/use-vault";
import { buildHeartbeatTx, buildTriggerDeadManTx } from "@/lib/vault-tx";
import { CAPSULE_MODE } from "@/lib/contract";
import { toast } from "sonner";

export function HeartbeatView() {
  const { role, capId, heartbeat, heartbeatId, vaultId, capsules, refetch } = useVault();
  const { signAndExecuteTransaction } = useDAppKit();
  const [busy, setBusy] = useState(false);

  const now = Date.now();
  const isOfficer = role === "officer" || role === "leader";
  const expired = heartbeat ? now - heartbeat.last_ping_ms > heartbeat.timeout_ms : false;
  const daysLeft = heartbeat ? Math.max(0, (heartbeat.last_ping_ms + heartbeat.timeout_ms - now) / 864e5).toFixed(1) : "—";
  const lastPingAgo = heartbeat ? Math.floor((now - heartbeat.last_ping_ms) / 36e5) : 0;
  const deadManCapsules = capsules.filter((c) => c.mode === CAPSULE_MODE.DEAD_MAN);

  const handlePing = async () => {
    setBusy(true);
    try {
      await signAndExecuteTransaction({ transaction: buildHeartbeatTx(heartbeatId!) });
      toast.success("Heartbeat sent!");
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Ping failed");
    } finally {
      setBusy(false);
    }
  };

  const handleTrigger = async (capsuleId: number) => {
    if (!capId) return toast.error("No officer cap");
    setBusy(true);
    try {
      await signAndExecuteTransaction({ transaction: buildTriggerDeadManTx(vaultId!, heartbeatId!, capId!, capsuleId) });
      toast.success("Dead man triggered!");
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Trigger failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="space-y-12">
        <header className="border-l-4 border-primary pl-6 py-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 bg-primary" />
            <span className="font-headline text-[10px] tracking-[0.2em] text-primary uppercase font-bold">Sub-System</span>
          </div>
          <h2 className="font-headline text-4xl font-black text-on-surface tracking-tighter uppercase">Heartbeat & Dead Man Control</h2>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Pulse Card */}
          <section className="lg:col-span-7 bg-surface-low relative p-8 overflow-hidden">
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary" />
            <div className="scanline absolute inset-0 opacity-10" />

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <span className="font-headline text-[10px] tracking-widest text-on-surface-variant uppercase block mb-1">Status</span>
                  <h3 className={`font-headline text-3xl font-bold tracking-tighter ${expired ? "text-error" : "text-primary"}`}>
                    SYSTEM: {expired ? "EXPIRED" : "ACTIVE"}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="font-headline text-[10px] tracking-widest text-on-surface-variant uppercase block mb-1">Last Ping</span>
                  <p className="font-headline text-xl font-medium text-on-surface">{lastPingAgo}h AGO</p>
                </div>
              </div>

              {/* Pulse Visualizer */}
              <div className="relative h-48 w-full border-y border-primary/10 flex items-center justify-center overflow-hidden bg-primary/5">
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 2, repeat: Infinity }}
                    className="w-24 h-24 rounded-full border border-primary/20 absolute" />
                  <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1, repeat: Infinity }}
                    className="w-16 h-16 rounded-full border-2 border-primary/40 absolute" />
                  <Heart size={40} className={`${expired ? "text-error fill-error" : "text-primary fill-primary"}`} />
                </div>
              </div>

              <div className="mt-12 flex items-center justify-between">
                <div>
                  <span className="font-headline text-[10px] tracking-widest text-secondary uppercase block mb-1">Deadline</span>
                  <div className="flex items-baseline gap-2">
                    <p className={`font-headline text-5xl font-black ${expired ? "text-error" : "text-secondary"}`}>{daysLeft}</p>
                    <p className="font-headline text-xl font-bold text-secondary/70 uppercase">Days</p>
                  </div>
                </div>
                {isOfficer && (
                  <button onClick={handlePing} disabled={busy}
                    className="bg-primary text-background px-10 py-5 font-headline font-black text-sm tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(0,242,255,0.3)] uppercase disabled:opacity-50">
                    [ Send Ping ]
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Config + Dead Man Capsules */}
          <div className="lg:col-span-5 space-y-8">
            <section className="bg-surface-high p-6 relative">
              <div className="flex items-center gap-2 mb-6">
                <Timer size={18} className="text-primary" />
                <h4 className="font-headline text-xs font-bold tracking-[0.15em] uppercase text-on-surface">Configuration</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="font-headline text-[10px] tracking-widest text-on-surface-variant uppercase block mb-2">Timeout</label>
                  <p className="font-headline text-2xl font-bold text-on-surface">{heartbeat ? Math.floor(heartbeat.timeout_ms / 864e5) : "—"} DAYS</p>
                </div>
                <div>
                  <label className="font-headline text-[10px] tracking-widest text-on-surface-variant uppercase block mb-2">Last Ping</label>
                  <p className="font-mono text-sm text-on-surface">{heartbeat ? new Date(heartbeat.last_ping_ms).toLocaleString() : "—"}</p>
                </div>
              </div>
            </section>

            {/* Dead Man Capsules */}
            <section className="bg-surface-low border border-primary/5">
              <div className="p-4 border-b border-primary/10 flex justify-between items-center">
                <h4 className="font-headline text-[10px] font-bold tracking-[0.15em] uppercase text-on-surface-variant flex items-center gap-2">
                  <AlertTriangle size={14} className="text-secondary" /> Dead Man Capsules ({deadManCapsules.length})
                </h4>
              </div>
              <div className="divide-y divide-primary/5">
                {deadManCapsules.map((c) => (
                  <div key={c.capsule_id} className="p-4 flex items-center justify-between hover:bg-primary/5 transition-colors">
                    <div>
                      <p className="font-headline text-xs font-bold text-on-surface uppercase">Capsule #{c.capsule_id}</p>
                      <p className="font-headline text-[9px] text-on-surface-variant">{c.claimed ? "CLAIMED" : expired ? "TRIGGERABLE" : "LOCKED"}</p>
                    </div>
                    {!c.claimed && expired && isOfficer && (
                      <button onClick={() => handleTrigger(c.capsule_id)} disabled={busy}
                        className="px-4 py-2 bg-secondary text-background font-headline font-black text-[10px] tracking-widest active:scale-95 transition-all disabled:opacity-50 uppercase">
                        Trigger
                      </button>
                    )}
                  </div>
                ))}
                {deadManCapsules.length === 0 && (
                  <div className="p-6 text-center text-on-surface-variant font-headline text-[10px] uppercase">No dead man capsules</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
