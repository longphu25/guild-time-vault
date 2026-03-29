import { Fingerprint, Archive, Hourglass, Shield } from "lucide-react";
import { useVault } from "@/hooks/use-vault";

export function SideBar() {
  const { vault, capsules, heartbeat } = useVault();
  const now = Date.now();
  const nextPulse = heartbeat ? Math.max(0, Math.ceil((heartbeat.last_ping_ms + heartbeat.timeout_ms - now) / 36e5)) : 0;

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 border-r border-primary/10 bg-surface/90 backdrop-blur-lg hidden md:flex flex-col py-8 z-40">
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 border border-primary/30 flex items-center justify-center bg-surface-low">
            <Shield size={24} className="text-primary opacity-80" />
          </div>
          <div>
            <div className="font-headline font-bold text-sm tracking-tight">GUILD_VAULT</div>
            <div className="font-headline text-[10px] text-on-surface-variant opacity-60 uppercase">EVE Frontier</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        <div className="bg-primary/20 text-primary border-l-4 border-primary px-4 py-3 flex items-center gap-3">
          <Fingerprint size={16} />
          <span className="font-headline text-[10px] tracking-tight uppercase">
            Guild: {vault?.guild_id ? `${vault.guild_id.slice(0, 8)}...` : "—"}
          </span>
        </div>
        <div className="text-on-surface-variant/60 px-4 py-3 flex items-center gap-3">
          <Archive size={16} />
          <span className="font-headline text-[10px] tracking-tight uppercase">Capsules: {capsules.length}</span>
        </div>
        <div className="text-on-surface-variant/60 px-4 py-3 flex items-center gap-3">
          <Hourglass size={16} />
          <span className="font-headline text-[10px] tracking-tight uppercase">Next Pulse: {nextPulse}h</span>
        </div>
      </nav>

      <div className="px-6 mt-auto">
        <div className="flex flex-col gap-2 pt-4 border-t border-primary/10">
          <div className="text-[9px] font-headline text-on-surface-variant/40 uppercase">Vault v2 • Testnet</div>
        </div>
      </div>
    </aside>
  );
}
