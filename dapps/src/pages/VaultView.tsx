import { useState } from "react";
import { Search, BookOpen, Lock, CheckCircle2, Clock, Eye } from "lucide-react";
import { useVault } from "@/hooks/use-vault";
import { useCurrentAccount, useDAppKit } from "@mysten/dapp-kit-react";
import { CAPSULE_MODE } from "@/lib/contract";
import { buildClaimArchiveTx, buildClaimPrivateInheritTx } from "@/lib/vault-tx";
import { walrusDownload } from "@/lib/walrus-client";
import { sealDecrypt } from "@/lib/seal-client";
import { toast } from "sonner";
import type { CapsuleData } from "@/lib/vault-reader";
import { client } from "@/lib/vault-reader";

type ModeFilter = "all" | "archive" | "inheritance" | "deadman";
type StatusFilter = "all" | "locked" | "unlockable" | "claimed";

function parseSealPolicy(c: CapsuleData) {
  try {
    const str = new TextDecoder().decode(new Uint8Array(c.seal_policy_id));
    const p = JSON.parse(str);
    return { mode: p.mode, capsuleId: p.capsuleId, contextAddr: p.contextAddr };
  } catch {
    return { mode: c.mode, capsuleId: c.capsule_id, contextAddr: "" };
  }
}

const modeLabel = (m: number) => m === 0 ? "ARCHIVE" : m === 1 ? "PRIVATE INHERIT" : "DEAD MAN";

function CapsuleCard({ capsule, onClaim, onReveal, revealed, revealing, userAddr, hasMemberCap }: {
  capsule: CapsuleData; onClaim: (id: number, mode: number) => void; onReveal: (id: number) => void;
  revealed?: string; revealing?: boolean; userAddr?: string; hasMemberCap?: boolean;
}) {
  const now = Date.now();
  const unlockable = !capsule.claimed && now >= capsule.unlock_time_ms;
  const daysLeft = Math.max(0, Math.ceil((capsule.unlock_time_ms - now) / 864e5));
  const zeroBenef = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const isBeneficiary = capsule.beneficiary && capsule.beneficiary !== zeroBenef && capsule.beneficiary === userAddr;

  const status = capsule.claimed ? "CLAIMED" : unlockable ? "UNLOCKABLE" : "LOCKED";
  const canClaim = unlockable && (capsule.mode === CAPSULE_MODE.ARCHIVE ? hasMemberCap : capsule.mode === CAPSULE_MODE.PRIVATE_INHERIT ? true : false);
  const canReveal = capsule.claimed && (capsule.mode === CAPSULE_MODE.ARCHIVE ? hasMemberCap : capsule.mode === CAPSULE_MODE.PRIVATE_INHERIT ? isBeneficiary : true);

  const statusColor = status === "UNLOCKABLE" ? "text-tertiary border-tertiary/30" : status === "LOCKED" ? "text-secondary border-secondary/30" : "text-on-surface-variant border-on-surface-variant/20";
  const StatusIcon = status === "UNLOCKABLE" ? BookOpen : status === "CLAIMED" ? CheckCircle2 : Lock;
  const modeColor = capsule.mode === 1 ? "text-secondary" : capsule.mode === 2 ? "text-error" : "text-primary";

  return (
    <div className={`glass-panel corner-bracket p-6 flex flex-col h-full border border-primary/10 group hover:border-primary/40 transition-all duration-500 ${status === "CLAIMED" ? "opacity-70 hover:opacity-100" : ""}`}>
      <div className="flex justify-between items-start mb-6">
        <span className={`font-headline text-[10px] tracking-widest px-2 py-0.5 border uppercase font-bold ${statusColor}`}>{status}</span>
        <StatusIcon size={20} className={status === "UNLOCKABLE" ? "text-primary" : status === "CLAIMED" ? "text-on-surface-variant" : "text-secondary"} />
      </div>

      <div className="mb-4">
        <div className={`font-headline text-[9px] uppercase tracking-widest mb-1 ${modeColor}`}>{modeLabel(capsule.mode)}</div>
        <h3 className="text-lg font-headline font-bold text-on-surface leading-tight">Capsule #{capsule.capsule_id}</h3>
      </div>

      <div className="flex-1 space-y-3 mb-6">
        <div className="text-on-surface-variant text-xs">
          Creator: <span className="font-mono text-on-surface">{capsule.creator.slice(0, 8)}...{capsule.creator.slice(-4)}</span>
        </div>
        {capsule.beneficiary && capsule.beneficiary !== zeroBenef && (
          <div className="bg-background p-3 border-l-2 border-secondary/50">
            <div className="text-[9px] font-headline text-secondary uppercase font-bold">Beneficiary</div>
            <div className="font-mono text-xs text-on-surface">{capsule.beneficiary.slice(0, 10)}...{capsule.beneficiary.slice(-6)}</div>
          </div>
        )}
        {!capsule.claimed && daysLeft > 0 && (
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Clock size={14} />
            <span className="text-xs uppercase tracking-tighter">Unlocks in <span className="text-on-surface font-bold">{daysLeft}d</span></span>
          </div>
        )}
        {revealed && (
          <div className="bg-background p-3 border-l-2 border-tertiary/50">
            <div className="text-[9px] font-headline text-tertiary uppercase font-bold mb-1">Decrypted Message</div>
            <p className="text-sm text-on-surface italic">"{revealed}"</p>
          </div>
        )}
      </div>

      {canClaim ? (
        <button onClick={() => onClaim(capsule.capsule_id, capsule.mode)} className="w-full bg-primary py-3 flex items-center justify-center gap-2 relative overflow-hidden active:scale-95 transition-all">
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-500" />
          <span className="font-headline font-black text-background tracking-widest text-sm uppercase">Open Capsule</span>
        </button>
      ) : canReveal && !revealed ? (
        <button onClick={() => onReveal(capsule.capsule_id)} disabled={revealing} className="w-full border border-primary/20 py-3 flex items-center justify-center gap-2 text-primary font-headline font-black tracking-widest text-sm uppercase hover:bg-primary/10 transition-colors disabled:opacity-50">
          {revealing ? "Decrypting..." : <><Eye size={16} /> Reveal</>}
        </button>
      ) : status === "CLAIMED" && revealed ? (
        <div className="w-full border border-tertiary/20 py-3 text-center text-tertiary font-headline font-black tracking-widest text-sm uppercase">Revealed</div>
      ) : (
        <button className="w-full border border-on-surface-variant/20 py-3 text-on-surface-variant font-headline font-black tracking-widest text-sm uppercase cursor-not-allowed opacity-50" disabled>
          {status === "LOCKED" ? "Encrypted" : "No Access"}
        </button>
      )}
    </div>
  );
}

export function VaultView() {
  const { capsules, loading, memberCapId, capId, vaultId, heartbeatId } = useVault();
  const account = useCurrentAccount();
  const { signAndExecuteTransaction, signPersonalMessage } = useDAppKit();
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [revealingId, setRevealingId] = useState<number | null>(null);

  const now = Date.now();
  const filtered = capsules
    .filter((c) => {
      if (modeFilter === "archive" && c.mode !== 0) return false;
      if (modeFilter === "inheritance" && c.mode !== 1) return false;
      if (modeFilter === "deadman" && c.mode !== 2) return false;
      if (statusFilter === "locked" && (c.claimed || now >= c.unlock_time_ms)) return false;
      if (statusFilter === "unlockable" && (c.claimed || now < c.unlock_time_ms)) return false;
      if (statusFilter === "claimed" && !c.claimed) return false;
      if (search && !`${c.creator}${c.capsule_id}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => b.unlock_time_ms - a.unlock_time_ms);

  const handleClaim = async (capsuleId: number, mode: number) => {
    try {
      const tx = mode === CAPSULE_MODE.PRIVATE_INHERIT ? buildClaimPrivateInheritTx(vaultId!, capsuleId) : buildClaimArchiveTx(vaultId!, capId!, capsuleId);
      const result = await signAndExecuteTransaction({ transaction: tx });
      toast.success("Capsule claimed!");
      const digest = (result as any)?.Transaction?.digest ?? (result as any)?.digest;
      if (digest) await client.waitForTransaction({ digest });
    } catch (err: any) {
      toast.error(err.message ?? "Claim failed");
    }
  };

  const handleReveal = async (capsuleId: number) => {
    const capsule = capsules.find((c) => c.capsule_id === capsuleId);
    if (!capsule || !account) return;
    if (capsule.mode === CAPSULE_MODE.ARCHIVE && !memberCapId) return toast.error("MemberCap required to decrypt archive capsules.");
    setRevealingId(capsuleId);
    try {
      const blobId = new TextDecoder().decode(new Uint8Array(capsule.walrus_blob_id));
      const policy = parseSealPolicy(capsule);
      if (policy.capsuleId == null) throw new Error("Old format capsule — cannot decrypt");
      const encrypted = await walrusDownload(blobId);
      const decrypted = await sealDecrypt(encrypted, policy.mode, policy.capsuleId, policy.contextAddr, account.address, signPersonalMessage, { memberCapId: memberCapId ?? capId, vaultId, heartbeatId });
      setRevealed((p) => ({ ...p, [capsuleId]: new TextDecoder().decode(decrypted) }));
    } catch (err: any) {
      const msg = err.message ?? "";
      toast.error(msg.includes("does not have access") ? "Access denied — you don't have permission." : msg);
    } finally {
      setRevealingId(null);
    }
  };

  const FilterBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className={`px-4 py-1.5 font-headline text-xs uppercase ${active ? "bg-primary text-background font-bold" : "border border-on-surface-variant/20 text-on-surface-variant hover:border-primary/50 transition-colors"}`}>
      {children}
    </button>
  );

  return (
    <div className="space-y-10">
      <header>
        <div className="flex items-baseline gap-4 mb-2">
          <h1 className="text-4xl font-headline font-black tracking-tighter text-on-surface uppercase">Guild Vault</h1>
          <span className="text-primary font-mono text-sm">[ {capsules.length} capsules ]</span>
        </div>
        <p className="text-on-surface-variant max-w-2xl font-light">Encrypted temporal capsules and inheritance manifests.</p>
      </header>

      <section className="flex flex-wrap gap-6 items-center bg-surface-low p-6 border-l-2 border-primary/30 relative overflow-hidden">
        <div className="space-y-2">
          <label className="block font-headline text-[10px] tracking-[0.2em] text-primary uppercase font-bold">Mode</label>
          <div className="flex gap-2">
            {(["all", "archive", "inheritance", "deadman"] as ModeFilter[]).map((m) => (
              <FilterBtn key={m} active={modeFilter === m} onClick={() => setModeFilter(m)}>{m}</FilterBtn>
            ))}
          </div>
        </div>
        <div className="h-10 w-px bg-on-surface-variant/10 hidden lg:block" />
        <div className="space-y-2">
          <label className="block font-headline text-[10px] tracking-[0.2em] text-primary uppercase font-bold">Status</label>
          <div className="flex gap-2">
            {(["all", "locked", "unlockable", "claimed"] as StatusFilter[]).map((s) => (
              <FilterBtn key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{s}</FilterBtn>
            ))}
          </div>
        </div>
        <div className="ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50" size={16} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="SEARCH..."
              className="bg-background border-0 border-b border-on-surface-variant/20 focus:ring-0 focus:border-primary text-xs font-mono py-2 pl-10 pr-4 w-48 uppercase tracking-widest text-on-surface transition-all" />
          </div>
        </div>
      </section>

      {loading ? (
        <div className="text-center py-20 text-on-surface-variant font-headline uppercase tracking-widest text-sm">Loading capsules...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-on-surface-variant font-headline uppercase tracking-widest text-sm">No capsules found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {filtered.map((c) => (
            <CapsuleCard key={c.capsule_id} capsule={c} onClaim={handleClaim} onReveal={handleReveal}
              revealed={revealed[c.capsule_id]} revealing={revealingId === c.capsule_id}
              userAddr={account?.address} hasMemberCap={!!memberCapId} />
          ))}
        </div>
      )}
    </div>
  );
}
