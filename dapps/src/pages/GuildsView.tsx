import { Shield, Trophy, RefreshCw } from "lucide-react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchAllVaults, type GuildVaultInfo } from "@/lib/vault-reader";

function GuildCard({ vault }: { vault: GuildVaultInfo }) {
  return (
    <article className="glass-panel border border-primary/10 group hover:border-primary/40 transition-all duration-500 overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 border border-primary/30 flex items-center justify-center bg-surface-low">
            <Shield size={24} className="text-primary opacity-80" />
          </div>
          <span className="font-headline text-[10px] uppercase tracking-widest flex items-center gap-1 font-bold text-tertiary">
            <span className="w-1 h-1 bg-tertiary rounded-full animate-pulse" /> ONLINE
          </span>
        </div>
        <h2 className="font-headline text-xl font-black text-on-surface tracking-tighter mb-1 uppercase">
          GUILD_{vault.guildId.slice(2, 8)}
        </h2>
        <div className="font-mono text-[10px] text-primary/70 mb-6 flex items-center gap-2">
          <Shield size={10} className="text-primary/50" />
          {vault.vaultId.slice(0, 10)}...{vault.vaultId.slice(-6)}
        </div>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-surface-high/40 p-3 border border-on-surface-variant/5">
            <div className="font-headline text-[9px] text-on-surface-variant uppercase mb-1 font-bold">Guild ID</div>
            <div className="font-mono text-xs text-on-surface">{vault.guildId.slice(0, 8)}...</div>
          </div>
          <div className="bg-surface-high/40 p-3 border border-on-surface-variant/5">
            <div className="font-headline text-[9px] text-on-surface-variant uppercase mb-1 font-bold">Capsules</div>
            <div className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
              <Trophy size={14} className="text-on-surface-variant/40" />{vault.capsuleCount}
            </div>
          </div>
        </div>
        <Link to={`/vault?id=${vault.vaultId}`}
          className="w-full py-4 border border-primary text-primary hover:bg-primary hover:text-background font-headline font-black text-xs tracking-[0.2em] transition-all uppercase flex items-center justify-center gap-2">
          ACCESS VAULT
        </Link>
      </div>
    </article>
  );
}

export function GuildsView() {
  const { data: vaults, isLoading } = useQuery({
    queryKey: ["allVaults"],
    queryFn: fetchAllVaults,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-12">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-primary animate-pulse" />
            <span className="font-headline text-[10px] text-primary tracking-[0.2em] uppercase font-bold">Guild Directory</span>
          </div>
          <h1 className="font-headline text-5xl font-black text-on-surface tracking-tighter uppercase mb-4">Registry_Nodes</h1>
          <p className="font-body text-on-surface-variant text-sm max-w-lg leading-relaxed">
            Access guild vaults in the Frontier. Select a guild to view its encrypted capsules.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="text-center py-20 text-on-surface-variant font-headline uppercase tracking-widest text-sm">Scanning network...</div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {(vaults ?? []).map((v) => (
            <GuildCard key={v.vaultId} vault={v} />
          ))}
          <Link to="/init-vault" className="border border-dashed border-on-surface-variant/20 group hover:border-primary/40 transition-all duration-500 bg-surface-low/30 flex flex-col items-center justify-center p-8 text-center min-h-[350px]">
            <div className="w-16 h-16 rounded-full border border-dashed border-on-surface-variant/40 group-hover:border-primary flex items-center justify-center mb-4 transition-colors">
              <RefreshCw size={24} className="text-on-surface-variant/40 group-hover:text-primary transition-colors" />
            </div>
            <h3 className="font-headline text-lg font-bold text-on-surface-variant/60 group-hover:text-primary transition-colors uppercase mb-2">FOUND_GUILD</h3>
            <p className="font-headline text-[10px] text-on-surface-variant/40 uppercase tracking-widest leading-relaxed px-4">
              Establish a new command node in the frontier sector.
            </p>
          </Link>
        </section>
      )}
    </div>
  );
}
