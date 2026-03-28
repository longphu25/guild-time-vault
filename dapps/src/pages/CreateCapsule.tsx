import { useState } from "react";
import { useNavigate } from "react-router";
import { Rocket, Globe, Lock, Calendar, Heart } from "lucide-react";
import { toast } from "sonner";
import { useDAppKit, useCurrentAccount } from "@mysten/dapp-kit-react";
import { WalletGate } from "@/components/capsule/WalletGate";
import { buildCreateCapsuleTx } from "@/lib/vault-tx";
import { CAPSULE_MODE } from "@/lib/contract";
import { useVault } from "@/hooks/use-vault";
import { sealEncrypt } from "@/lib/seal-client";
import { walrusUpload } from "@/lib/walrus-client";

const MODES = [
  { value: CAPSULE_MODE.ARCHIVE, label: "Guild Archive", icon: Globe, desc: "All guild members can read after unlock" },
  { value: CAPSULE_MODE.PRIVATE_INHERIT, label: "Private Inheritance", icon: Lock, desc: "Only the beneficiary can read" },
  { value: CAPSULE_MODE.DEAD_MAN, label: "Dead Man's Switch", icon: Heart, desc: "Unlocks if leader stops pinging" },
];

export function CreateCapsule() {
  const navigate = useNavigate();
  const dAppKit = useDAppKit();
  const { signAndExecuteTransaction } = dAppKit;
  const account = useCurrentAccount();
  const { role, capId, vault, refetch } = useVault();

  const [message, setMessage] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [mode, setMode] = useState<number>(CAPSULE_MODE.ARCHIVE);
  const [beneficiary, setBeneficiary] = useState("");
  const [storageDays, setStorageDays] = useState("30");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState("");

  const maxChars = 500;
  const daysUntil = unlockDate ? Math.ceil((new Date(unlockDate).getTime() - Date.now()) / 864e5) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return toast.error("Please enter a message");
    if (!unlockDate) return toast.error("Please select an unlock date");
    if (daysUntil === null || daysUntil < 1) return toast.error("Unlock date must be at least 1 day in the future");
    if (mode === CAPSULE_MODE.PRIVATE_INHERIT && (!beneficiary.trim() || !beneficiary.startsWith("0x")))
      return toast.error("Please enter a valid beneficiary address");
    const storageDaysNum = parseInt(storageDays) || 5;
    if (daysUntil !== null && storageDaysNum < daysUntil)
      return toast.error(`Storage duration (${storageDaysNum}d) must be ≥ unlock time (${daysUntil}d)`);
    if (!capId) return toast.error("No member/officer capability found. Ask an officer to grant you access.");

    setIsSubmitting(true);
    try {
      const unlockTimeMs = new Date(unlockDate).getTime();
      const plaintext = new TextEncoder().encode(message);
      const benefAddr = mode === CAPSULE_MODE.PRIVATE_INHERIT ? beneficiary : "0x0000000000000000000000000000000000000000000000000000000000000000";

      // Predict capsule_id (next_capsule_id from vault)
      const capsuleId = vault?.next_capsule_id ?? 0;
      const guildId = vault?.guild_id ?? account!.address;

      // Context address depends on mode
      const { vaultConfig } = await import("@/lib/vault-config");
      const contextAddr = mode === CAPSULE_MODE.ARCHIVE ? guildId
        : mode === CAPSULE_MODE.PRIVATE_INHERIT ? benefAddr
        : vaultConfig.vaultObjectId; // DEAD_MAN uses vault_id

      // Step 1: Seal encrypt
      setProgress("Encrypting with Seal...");
      const encryptedData = await sealEncrypt(plaintext, mode, capsuleId, contextAddr);

      // Step 2: Walrus upload (auto-swaps SUI→WAL if needed)
      const { blobId } = await walrusUpload(
        encryptedData,
        account!.address,
        signAndExecuteTransaction,
        {
          epochs: parseInt(storageDays) || 5,
          onProgress: (p) => setProgress(p.detail ?? p.step),
        },
      );
      const blobIdBytes = Array.from(new TextEncoder().encode(blobId));

      // Step 3: On-chain create_capsule
      setProgress("Submitting transaction...");
      const sealPolicyBytes = Array.from(new TextEncoder().encode(JSON.stringify({ mode, capsuleId, contextAddr })));

      const tx = buildCreateCapsuleTx({
        capId: capId,
        role: role === "officer" ? "officer" : "member",
        mode,
        unlockTimeMs,
        beneficiary: benefAddr,
        walrusBlobId: blobIdBytes,
        sealPolicyId: sealPolicyBytes,
      });

      await signAndExecuteTransaction({ transaction: tx });
      toast.success("Capsule launched into the stars!");
      refetch();
      setTimeout(() => navigate("/my-capsules"), 1500);
    } catch (err: any) {
      const msg = err.message ?? "Transaction failed";
      if (msg.includes("rejected") || msg.includes("denied") || msg.includes("cancel")) {
        toast.error("Transaction cancelled");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
      setProgress("");
    }
  };

  return (
    <WalletGate message="You need to connect your wallet to create a time capsule.">
      <div className="min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-heading text-[#E2E8F0] mb-3">Create Time Capsule</h1>
            <p className="text-[#94A3B8]">Send a message to the future</p>
            {role !== "guest" && (
              <p className="text-xs text-[#00F0FF] mt-2">Role: {role.toUpperCase()}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mode selector */}
            <div>
              <label className="block text-[#E2E8F0] mb-3">Capsule Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {MODES.map((m) => (
                  <button key={m.value} type="button" onClick={() => setMode(m.value)}
                    className={`p-4 rounded-lg border text-left transition-all ${mode === m.value ? "border-[#00F0FF] bg-[#00F0FF]/10" : "border-[#2D2D3F] bg-[#1A1A2E]/50 hover:border-[#00F0FF]/30"}`}>
                    <m.icon className={`w-5 h-5 mb-2 ${mode === m.value ? "text-[#00F0FF]" : "text-[#94A3B8]"}`} />
                    <div className={`text-sm font-medium ${mode === m.value ? "text-[#00F0FF]" : "text-[#E2E8F0]"}`}>{m.label}</div>
                    <div className="text-xs text-[#94A3B8] mt-1">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-[#E2E8F0] mb-2">Your Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, maxChars))} placeholder="Write something that matters..."
                className="w-full h-32 px-4 py-3 bg-[#1A1A2E]/50 border border-[#2D2D3F] rounded-lg text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:border-[#00F0FF] focus:outline-none focus:ring-1 focus:ring-[#00F0FF] transition-all resize-none" maxLength={maxChars} />
              <div className={`text-right text-sm mt-1 ${message.length > maxChars * 0.9 ? "text-[#EF4444]" : "text-[#94A3B8]"}`}>{message.length} / {maxChars}</div>
            </div>

            {/* Unlock Date */}
            <div>
              <label className="block text-[#E2E8F0] mb-2 flex items-center gap-2"><Calendar className="w-4 h-4" /> Unlock Date</label>
              <input type="datetime-local" value={unlockDate} onChange={(e) => setUnlockDate(e.target.value)}
                className="w-full px-4 py-3 bg-[#1A1A2E]/50 border border-[#2D2D3F] rounded-lg text-[#E2E8F0] focus:border-[#00F0FF] focus:outline-none focus:ring-1 focus:ring-[#00F0FF] transition-all" />
              {daysUntil !== null && daysUntil > 0 && <div className="text-sm text-[#00F0FF] mt-2">Unlocks in {daysUntil} day{daysUntil !== 1 ? "s" : ""}</div>}
            </div>

            {/* Beneficiary (for PRIVATE_INHERIT) */}
            {mode === CAPSULE_MODE.PRIVATE_INHERIT && (
              <div>
                <label className="block text-[#E2E8F0] mb-2">Beneficiary Address</label>
                <input type="text" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="0x..."
                  className="w-full px-4 py-3 bg-[#1A1A2E]/50 border border-[#2D2D3F] rounded-lg text-[#E2E8F0] font-mono placeholder-[#94A3B8]/50 focus:border-[#A855F7] focus:outline-none focus:ring-1 focus:ring-[#A855F7] transition-all" />
              </div>
            )}

            {/* Submit */}
            {/* Storage Duration */}
            <div>
              <label className="block text-[#E2E8F0] mb-2">Storage Duration (days)</label>
              <input type="number" value={storageDays} onChange={(e) => setStorageDays(e.target.value)} min={daysUntil ?? 1}
                className="w-full px-4 py-3 bg-[#1A1A2E]/50 border border-[#2D2D3F] rounded-lg text-[#E2E8F0] focus:border-[#00F0FF] focus:outline-none focus:ring-1 focus:ring-[#00F0FF] transition-all" />
              <p className="text-xs text-[#94A3B8] mt-1">How long the capsule data stays on Walrus. Must be ≥ unlock time ({daysUntil ?? "?"}d). 1 epoch ≈ 1 day on testnet.</p>
            </div>

            <button type="submit" disabled={isSubmitting}
              className="w-full px-6 py-4 bg-gradient-to-r from-[#00F0FF] to-[#A855F7] text-[#0A0A0F] rounded-lg hover:drop-shadow-[0_0_20px_rgba(0,240,255,0.8)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? (<><div className="w-5 h-5 border-2 border-[#0A0A0F] border-t-transparent rounded-full animate-spin" /> {progress || "Launching..."}</>) : (<><Rocket className="w-5 h-5" /> Launch Capsule</>)}
            </button>
          </form>
        </div>
      </div>
    </WalletGate>
  );
}
