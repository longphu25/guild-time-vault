import { useSmartObject } from "@evefrontier/dapp-kit";
import { Box, Cpu, Globe, User, Zap, ExternalLink, Copy, Check, Database, Link2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useVault } from "@/hooks/use-vault";

function copyToClipboard(text: string, setCopied: (v: string) => void, key: string) {
  navigator.clipboard.writeText(text);
  setCopied(key);
  setTimeout(() => setCopied(""), 1500);
}

export function AssemblyView() {
  const { assembly, assemblyOwner, loading, error, refetch } = useSmartObject();
  const [copied, setCopied] = useState("");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <div className="font-headline text-xs tracking-widest uppercase text-on-surface-variant/60">
            Scanning Assembly...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="border border-red-500/30 bg-red-500/5 p-6 max-w-md text-center space-y-3">
          <div className="text-red-400 font-headline text-sm uppercase tracking-wider">Signal Lost</div>
          <div className="text-on-surface-variant/60 text-sm">{error}</div>
          <button type="button" onClick={refetch} className="mt-2 px-4 py-2 border border-primary/30 text-primary font-headline text-xs uppercase tracking-wider hover:bg-primary/10 transition-colors">
            Retry Scan
          </button>
        </div>
      </div>
    );
  }

  if (!assembly) {
    return <VaultFallback />;
  }

  const stateColor = assembly.state === "online" ? "text-green-400" : assembly.state === "anchored" ? "text-yellow-400" : "text-red-400";
  const stateDot = assembly.state === "online" ? "bg-green-400" : assembly.state === "anchored" ? "bg-yellow-400" : "bg-red-400";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-headline text-[10px] tracking-[0.3em] uppercase text-on-surface-variant/40 mb-1">
            Smart Assembly
          </div>
          <h1 className="font-headline text-2xl font-bold tracking-tight">
            {assembly.name || assembly.typeDetails?.name || "Unknown Assembly"}
          </h1>
        </div>
        <button type="button" onClick={refetch} className="px-4 py-2 border border-primary/20 text-primary font-headline text-[10px] uppercase tracking-wider hover:bg-primary/10 transition-colors">
          Refresh
        </button>
      </div>

      {/* Status + Type Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-primary/10 bg-surface-low/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-on-surface-variant/50">
            <Zap size={14} />
            <span className="font-headline text-[10px] tracking-widest uppercase">Status</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${stateDot} animate-pulse`} />
            <span className={`font-headline text-sm uppercase tracking-wider ${stateColor}`}>
              {assembly.state}
            </span>
          </div>
        </div>

        <div className="border border-primary/10 bg-surface-low/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-on-surface-variant/50">
            <Cpu size={14} />
            <span className="font-headline text-[10px] tracking-widest uppercase">Type</span>
          </div>
          <div className="font-headline text-sm tracking-wider">{assembly.type}</div>
          {assembly.typeDetails?.groupName && (
            <div className="text-[10px] text-on-surface-variant/40">{assembly.typeDetails.groupName}</div>
          )}
        </div>

        <div className="border border-primary/10 bg-surface-low/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-on-surface-variant/50">
            <Globe size={14} />
            <span className="font-headline text-[10px] tracking-widest uppercase">Location</span>
          </div>
          <div className="font-headline text-sm tracking-wider">
            {assembly.solarSystem?.name || "Unknown Sector"}
          </div>
        </div>
      </div>

      {/* Assembly Details */}
      <div className="border border-primary/10 bg-surface-low/50 p-6 space-y-4">
        <div className="font-headline text-xs tracking-[0.2em] uppercase text-on-surface-variant/50 border-b border-primary/10 pb-3">
          Assembly Data
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Object ID" value={assembly.id} copyable copied={copied} setCopied={setCopied} copyKey="id" />
          <InfoRow label="Type ID" value={String(assembly.typeId)} />
          {assembly.description && <InfoRow label="Description" value={assembly.description} span />}
          {assembly.dappURL && (
            <div className="md:col-span-2 flex items-center gap-2">
              <span className="font-headline text-[10px] tracking-widest uppercase text-on-surface-variant/40 w-28 shrink-0">dApp URL</span>
              <a href={assembly.dappURL} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline flex items-center gap-1 truncate">
                {assembly.dappURL} <ExternalLink size={12} />
              </a>
            </div>
          )}
          {assembly.energySourceId && <InfoRow label="Energy Source" value={assembly.energySourceId} copyable copied={copied} setCopied={setCopied} copyKey="energy" />}
          <InfoRow label="Energy Usage" value={`${assembly.energyUsage ?? 0}`} />
        </div>
      </div>

      {/* Owner */}
      {assemblyOwner && (
        <div className="border border-primary/10 bg-surface-low/50 p-6 space-y-4">
          <div className="font-headline text-xs tracking-[0.2em] uppercase text-on-surface-variant/50 border-b border-primary/10 pb-3 flex items-center gap-2">
            <User size={14} /> Owner Character
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="Name" value={assemblyOwner.name} />
            <InfoRow label="Address" value={assemblyOwner.address} copyable copied={copied} setCopied={setCopied} copyKey="owner" />
            <InfoRow label="Character ID" value={assemblyOwner.id} />
            <InfoRow label="Tribe ID" value={String(assemblyOwner.tribeId)} />
          </div>
        </div>
      )}

      {/* Type Details (Datahub) */}
      {assembly.typeDetails && (
        <div className="border border-primary/10 bg-surface-low/50 p-6 space-y-4">
          <div className="font-headline text-xs tracking-[0.2em] uppercase text-on-surface-variant/50 border-b border-primary/10 pb-3">
            Type Metadata
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="Name" value={assembly.typeDetails.name} />
            <InfoRow label="Category" value={assembly.typeDetails.categoryName} />
            <InfoRow label="Group" value={assembly.typeDetails.groupName} />
            {assembly.typeDetails.description && <InfoRow label="Description" value={assembly.typeDetails.description} span />}
            {assembly.typeDetails.iconUrl && (
              <div className="md:col-span-2 flex items-center gap-3">
                <span className="font-headline text-[10px] tracking-widest uppercase text-on-surface-variant/40 w-28 shrink-0">Icon</span>
                <img src={assembly.typeDetails.iconUrl} alt={assembly.typeDetails.name} className="w-12 h-12 border border-primary/20" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VaultFallback() {
  const { vault, vaultId, capsules, heartbeat, role, loading } = useVault();
  const navigate = useNavigate();
  const [copied, setCopied] = useState("");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <div className="font-headline text-xs tracking-widest uppercase text-on-surface-variant/60">
            Scanning Vault Network...
          </div>
        </div>
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="border border-primary/20 bg-surface-low/50 p-8 max-w-md text-center space-y-4">
          <Box size={32} className="text-primary/40 mx-auto" />
          <div className="font-headline text-sm uppercase tracking-wider text-on-surface-variant/60">
            No Assembly or Vault Detected
          </div>
          <div className="text-on-surface-variant/40 text-xs space-y-2">
            <p>
              For EVE Assembly: set <code className="text-primary/80 bg-primary/10 px-1.5 py-0.5">VITE_OBJECT_ID</code> in .env
            </p>
            <p>
              For Guild Vault: <button type="button" onClick={() => navigate("/init-vault")} className="text-primary underline">initialize a vault</button> or connect a wallet with an existing vault.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hbAlive = heartbeat ? Date.now() < heartbeat.last_ping_ms + heartbeat.timeout_ms : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-headline text-[10px] tracking-[0.3em] uppercase text-on-surface-variant/40 mb-1">
            Guild Time Vault (Extension)
          </div>
          <h1 className="font-headline text-2xl font-bold tracking-tight">
            Vault {vaultId ? `${vaultId.slice(0, 8)}...${vaultId.slice(-6)}` : "Unknown"}
          </h1>
        </div>
        <button type="button" onClick={() => navigate("/vault")} className="px-4 py-2 border border-primary/20 text-primary font-headline text-[10px] uppercase tracking-wider hover:bg-primary/10 transition-colors">
          Open Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-primary/10 bg-surface-low/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-on-surface-variant/50">
            <Zap size={14} />
            <span className="font-headline text-[10px] tracking-widest uppercase">Heartbeat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${hbAlive ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
            <span className={`font-headline text-sm uppercase tracking-wider ${hbAlive ? "text-green-400" : "text-red-400"}`}>
              {heartbeat ? (hbAlive ? "Alive" : "Timed Out") : "No Heartbeat"}
            </span>
          </div>
        </div>

        <div className="border border-primary/10 bg-surface-low/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-on-surface-variant/50">
            <Database size={14} />
            <span className="font-headline text-[10px] tracking-widest uppercase">Capsules</span>
          </div>
          <div className="font-headline text-sm tracking-wider">{capsules.length}</div>
          <div className="text-[10px] text-on-surface-variant/40">
            {capsules.filter(c => c.claimed).length} claimed
          </div>
        </div>

        <div className="border border-primary/10 bg-surface-low/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-on-surface-variant/50">
            <User size={14} />
            <span className="font-headline text-[10px] tracking-widest uppercase">Your Role</span>
          </div>
          <div className="font-headline text-sm tracking-wider capitalize">{role}</div>
        </div>
      </div>

      <div className="border border-primary/10 bg-surface-low/50 p-6 space-y-4">
        <div className="font-headline text-xs tracking-[0.2em] uppercase text-on-surface-variant/50 border-b border-primary/10 pb-3">
          Vault Data
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vaultId && <InfoRow label="Vault ID" value={vaultId} copyable copied={copied} setCopied={setCopied} copyKey="vault" />}
          <InfoRow label="Guild ID" value={vault.guild_id} copyable copied={copied} setCopied={setCopied} copyKey="guild" />
          <InfoRow label="Next Cap ID" value={String(vault.next_capsule_id)} />
          <InfoRow label="Type" value="GuildVault (StorageUnit Extension)" />
        </div>
      </div>

      <div className="border border-primary/10 bg-surface-low/50 p-6 space-y-4">
        <div className="font-headline text-xs tracking-[0.2em] uppercase text-on-surface-variant/50 border-b border-primary/10 pb-3 flex items-center gap-2">
          <Link2 size={14} /> EVE Frontier Integration
        </div>
        <div className="text-on-surface-variant/60 text-sm space-y-2">
          <p>This vault uses <span className="text-primary">VaultAuth</span> witness to integrate with EVE Frontier StorageUnit assemblies.</p>
          <p className="text-xs text-on-surface-variant/40">
            To link: StorageUnit owner calls <code className="bg-primary/10 px-1 py-0.5 text-primary/80">authorize_extension&lt;VaultAuth&gt;</code>, then officer calls <code className="bg-primary/10 px-1 py-0.5 text-primary/80">link_vault</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, copyable, copied, setCopied, copyKey, span }: {
  label: string;
  value: string;
  copyable?: boolean;
  copied?: string;
  setCopied?: (v: string) => void;
  copyKey?: string;
  span?: boolean;
}) {
  return (
    <div className={`flex items-start gap-2 ${span ? "md:col-span-2" : ""}`}>
      <span className="font-headline text-[10px] tracking-widest uppercase text-on-surface-variant/40 w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-on-surface/80 truncate flex-1">{value}</span>
      {copyable && setCopied && copyKey && (
        <button type="button" onClick={() => copyToClipboard(value, setCopied, copyKey)} className="shrink-0 text-on-surface-variant/40 hover:text-primary transition-colors">
          {copied === copyKey ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
      )}
    </div>
  );
}
