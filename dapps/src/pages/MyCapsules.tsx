import { useState, useEffect } from "react";
import { PackagePlus, Lock, Unlock, Circle } from "lucide-react";
import { Link } from "react-router";
import * as Tabs from "@radix-ui/react-tabs";
import { toast } from "sonner";
import { useDAppKit, useCurrentAccount } from "@mysten/dapp-kit-react";
import { WalletGate } from "@/components/capsule/WalletGate";
import { useVault } from "@/hooks/use-vault";
import { buildClaimArchiveTx, buildClaimPrivateInheritTx } from "@/lib/vault-tx";
import { CAPSULE_MODE } from "@/lib/contract";
import type { CapsuleData } from "@/lib/vault-reader";
import { walrusDownload } from "@/lib/walrus-client";
import { sealDecrypt } from "@/lib/seal-client";

function parseSealPolicy(capsule: CapsuleData): { mode: number; capsuleId: number; contextAddr: string } {
  try {
    const str = new TextDecoder().decode(new Uint8Array(capsule.seal_policy_id));
    const parsed = JSON.parse(str);
    return { mode: parsed.mode, capsuleId: parsed.capsuleId, contextAddr: parsed.contextAddr };
  } catch {
    return { mode: capsule.mode, capsuleId: capsule.capsule_id, contextAddr: "" };
  }
}

const truncate = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
const fmtDate = (ms: number) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
const modeLabel = (m: number) => m === CAPSULE_MODE.ARCHIVE ? "Archive" : m === CAPSULE_MODE.PRIVATE_INHERIT ? "Inheritance" : "Dead Man";

const tabCls = "px-4 py-2 text-[#94A3B8] hover:text-[#E2E8F0] transition-all data-[state=active]:text-[#00F0FF] data-[state=active]:border-b-2 data-[state=active]:border-[#00F0FF]";

function CapsuleItem({ c, onClaim, onReveal, revealedMessage, revealing, userAddr, hasMemberCap }: {
  c: CapsuleData; onClaim?: (id: number, mode: number) => void; onReveal?: (id: number) => void;
  revealedMessage?: string; revealing?: boolean; userAddr?: string; hasMemberCap?: boolean;
}) {
  const now = Date.now();
  const unlockable = !c.claimed && now >= c.unlock_time_ms;
  const daysLeft = Math.ceil((c.unlock_time_ms - now) / 864e5);
  const zeroBenef = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const isBeneficiary = c.beneficiary && c.beneficiary !== zeroBenef && c.beneficiary === userAddr;

  // Can this user claim?
  const canClaim = unlockable && (
    c.mode === CAPSULE_MODE.ARCHIVE ? hasMemberCap :
    c.mode === CAPSULE_MODE.PRIVATE_INHERIT ? true : // anyone can claim
    false // DEAD_MAN handled via trigger
  );

  // Can this user decrypt?
  const canReveal = c.claimed && (
    c.mode === CAPSULE_MODE.ARCHIVE ? hasMemberCap :
    c.mode === CAPSULE_MODE.PRIVATE_INHERIT ? isBeneficiary :
    true // DEAD_MAN — anyone with access after trigger
  );

  return (
    <div className="bg-[#1A1A2E]/80 backdrop-blur-md border border-[#2D2D3F] rounded-lg p-4 hover:border-[#00F0FF]/30 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className={`mt-1 ${c.claimed ? "text-[#6B7280]" : unlockable ? "text-[#F59E0B]" : "text-[#3B82F6]"}`}>
            {c.claimed ? <Circle className="w-4 h-4" /> : unlockable ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[#00F0FF] font-mono text-sm">{truncate(c.creator)}</span>
              <span className="text-xs text-[#94A3B8] px-2 py-0.5 bg-[#2D2D3F] rounded">{modeLabel(c.mode)}</span>
            </div>
            <div className="text-sm text-[#94A3B8]">Unlocks: {fmtDate(c.unlock_time_ms)}</div>
            {!c.claimed && daysLeft > 0 && <div className="text-sm text-[#F59E0B]">{daysLeft}d remaining</div>}
            {c.beneficiary && c.beneficiary !== "0x0000000000000000000000000000000000000000000000000000000000000000" && (
              <div className="text-xs text-[#94A3B8]">To: <span className="text-[#00F0FF] font-mono">{truncate(c.beneficiary)}</span></div>
            )}
          </div>
        </div>
        {canClaim && onClaim && (
          <button onClick={() => onClaim(c.capsule_id, c.mode)} className="px-4 py-2 bg-[#00F0FF] text-[#0A0A0F] rounded text-sm hover:drop-shadow-[0_0_12px_rgba(0,240,255,0.8)] transition-all">
            Open
          </button>
        )}
      </div>
      {/* Show decrypted message or Reveal button */}
      {c.claimed && (
        <div className="mt-3 pt-3 border-t border-[#2D2D3F]">
          {revealedMessage ? (
            <p className="text-[#E2E8F0] italic">"{revealedMessage}"</p>
          ) : canReveal && onReveal ? (
            <button onClick={() => onReveal(c.capsule_id)} disabled={revealing}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#00F0FF]/10 border border-[#00F0FF]/30 rounded text-sm text-[#00F0FF] hover:bg-[#00F0FF]/20 transition-all disabled:opacity-50">
              {revealing ? "Decrypting..." : "Reveal Message"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function MyCapsules() {
  const [tab, setTab] = useState("all");
  const account = useCurrentAccount();
  const { capsules, role, capId, memberCapId, loading, refetch } = useVault();
  const { signAndExecuteTransaction, signPersonalMessage } = useDAppKit();

  const addr = account?.address ?? "";
  const sorted = [...capsules].sort((a, b) => b.unlock_time_ms - a.unlock_time_ms);
  const myCreated = sorted.filter((c) => c.creator === addr);
  const sentToMe = sorted.filter((c) => c.beneficiary === addr && c.creator !== addr);
  const claimed = sorted.filter((c) => c.claimed);

  const [revealedMessages, setRevealedMessages] = useState<Record<number, string>>({});
  const [revealingId, setRevealingId] = useState<number | null>(null);

  // Clear revealed messages when account changes
  useEffect(() => { setRevealedMessages({}); }, [account?.address]);

  const handleClaim = async (capsuleId: number, mode: number) => {
    try {
      // Step 1: Claim on-chain
      let tx;
      if (mode === CAPSULE_MODE.PRIVATE_INHERIT) {
        tx = buildClaimPrivateInheritTx(capsuleId);
      } else if (capId) {
        tx = buildClaimArchiveTx(capId, capsuleId);
      } else {
        return toast.error("No member capability found");
      }
      const result = await signAndExecuteTransaction({ transaction: tx });
      toast.success("Capsule claimed! Click Reveal to decrypt the message.");
      const digest = (result as any)?.Transaction?.digest ?? (result as any)?.digest;
      if (digest) {
        const { client } = await import("@/lib/vault-reader");
        await client.waitForTransaction({ digest });
      }
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to claim capsule");
    }
  };

  const handleReveal = async (capsuleId: number) => {
    const capsule = capsules.find((c) => c.capsule_id === capsuleId);
    if (!capsule || !account) return;

    // ARCHIVE mode needs MemberCap — officer without MemberCap can't decrypt
    if (capsule.mode === CAPSULE_MODE.ARCHIVE && role === "officer" && !memberCapId) {
      return toast.error("Officers need a MemberCap to decrypt archive capsules. Grant yourself a MemberCap in Admin first.");
    }

    const decryptCapId = capsule.mode === CAPSULE_MODE.ARCHIVE ? (memberCapId ?? capId) : capId;
    setRevealingId(capsuleId);
    try {
      const blobId = new TextDecoder().decode(new Uint8Array(capsule.walrus_blob_id));
      const policy = parseSealPolicy(capsule);
      if (policy.capsuleId === undefined || policy.capsuleId === null) {
        throw new Error("Capsule encrypted with old format — cannot decrypt");
      }
      const encryptedData = await walrusDownload(blobId);
      const decrypted = await sealDecrypt(encryptedData, policy.mode, policy.capsuleId, policy.contextAddr, account.address, signPersonalMessage, { memberCapId: decryptCapId });
      setRevealedMessages((prev) => ({ ...prev, [capsuleId]: new TextDecoder().decode(decrypted) }));
    } catch (err: any) {
      const msg = err.message ?? "Failed to decrypt";
      if (msg.includes("does not have access")) {
        toast.error("Access denied — only the designated beneficiary can decrypt this capsule.");
      } else {
        toast.error(msg);
      }
    } finally {
      setRevealingId(null);
    }
  };

  return (
    <WalletGate message="Connect your wallet to see your capsules.">
      <div className="min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-heading text-[#E2E8F0] mb-2">My Capsules</h1>
            <p className="text-[#94A3B8]">Role: <span className="text-[#00F0FF]">{role.toUpperCase()}</span></p>
          </div>

          {loading ? (
            <div className="text-center py-12 text-[#94A3B8]">Loading from chain...</div>
          ) : (
            <Tabs.Root value={tab} onValueChange={setTab}>
              <Tabs.List className="flex gap-2 mb-8 border-b border-[#2D2D3F]">
                <Tabs.Trigger value="all" className={tabCls}>All ({capsules.length})</Tabs.Trigger>
                <Tabs.Trigger value="created" className={tabCls}>Created ({myCreated.length})</Tabs.Trigger>
                <Tabs.Trigger value="received" className={tabCls}>Sent to Me ({sentToMe.length})</Tabs.Trigger>
                <Tabs.Trigger value="claimed" className={tabCls}>Claimed ({claimed.length})</Tabs.Trigger>
              </Tabs.List>

              {[
                { value: "all", data: sorted },
                { value: "created", data: myCreated },
                { value: "received", data: sentToMe },
                { value: "claimed", data: claimed },
              ].map(({ value, data }) => (
                <Tabs.Content key={value} value={value} className="space-y-4">
                  {data.length > 0 ? data.map((c) => (
                    <CapsuleItem key={c.capsule_id} c={c} onClaim={handleClaim} onReveal={handleReveal} revealedMessage={revealedMessages[c.capsule_id]} revealing={revealingId === c.capsule_id} userAddr={addr} hasMemberCap={!!memberCapId} />
                  )) : (
                    <div className="text-center py-16">
                      <PackagePlus className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />
                      <h3 className="text-xl text-[#E2E8F0] mb-2">No capsules</h3>
                      <p className="text-[#94A3B8] mb-6">Nothing here yet</p>
                      {value === "created" && <Link to="/create" className="inline-flex items-center gap-2 px-6 py-3 bg-[#00F0FF] text-[#0A0A0F] rounded-lg hover:drop-shadow-[0_0_20px_rgba(0,240,255,0.8)] transition-all">Create Capsule</Link>}
                    </div>
                  )}
                </Tabs.Content>
              ))}
            </Tabs.Root>
          )}
        </div>
      </div>
    </WalletGate>
  );
}
