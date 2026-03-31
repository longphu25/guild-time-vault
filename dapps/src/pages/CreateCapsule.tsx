import { useState, useCallback } from "react";
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
import { ProgressModal, type ProgressStep } from "@/components/ProgressModal";

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
  const { role, capId, vault, vaultId, refetch } = useVault();

  const [message, setMessage] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [mode, setMode] = useState<number>(CAPSULE_MODE.ARCHIVE);
  const [beneficiary, setBeneficiary] = useState("");
  const [storageDays, setStorageDays] = useState("30");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Progress modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFinished, setModalFinished] = useState(false);
  const [modalError, setModalError] = useState("");
  const [steps, setSteps] = useState<ProgressStep[]>([]);

  const maxChars = 500;
  const daysUntil = unlockDate ? Math.ceil((new Date(unlockDate).getTime() - Date.now()) / 864e5) : null;

  const advanceStep = useCallback((id: number, status: ProgressStep["status"]) => {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
  }, []);

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

    const initialSteps: ProgressStep[] = [
      { id: 1, label: "Seal encrypt payload", status: "loading" },
      { id: 2, label: "Swap SUI → WAL (if needed)", status: "pending" },
      { id: 3, label: "Register blob — approve tx", status: "pending" },
      { id: 4, label: "Upload to storage nodes", status: "pending" },
      { id: 5, label: "Certify blob — approve tx", status: "pending" },
      { id: 6, label: "Create capsule — approve tx", status: "pending" },
    ];
    setSteps(initialSteps);
    setModalOpen(true);
    setModalFinished(false);
    setModalError("");
    setIsSubmitting(true);

    try {
      const unlockTimeMs = new Date(unlockDate).getTime();
      const plaintext = new TextEncoder().encode(message);
      const benefAddr = mode === CAPSULE_MODE.PRIVATE_INHERIT ? beneficiary : "0x0000000000000000000000000000000000000000000000000000000000000000";
      const capsuleId = vault?.next_capsule_id ?? 0;
      const guildId = vault?.guild_id ?? account!.address;
      const contextAddr = mode === CAPSULE_MODE.ARCHIVE ? guildId
        : mode === CAPSULE_MODE.PRIVATE_INHERIT ? benefAddr
        : vaultId ?? "";

      // Step 1: Seal encrypt
      const encryptedData = await sealEncrypt(plaintext, mode, capsuleId, contextAddr);
      advanceStep(1, "completed");

      // Steps 2-5: Walrus upload
      let swapNeeded = false;
      const { blobId } = await walrusUpload(
        encryptedData,
        account!.address,
        signAndExecuteTransaction,
        {
          epochs: parseInt(storageDays) || 5,
          onProgress: (p) => {
            if (p.step === "checking") { advanceStep(2, "loading"); }
            else if (p.step === "swapping") { swapNeeded = true; advanceStep(2, "loading"); }
            else if (p.step === "registering") {
              advanceStep(2, swapNeeded ? "completed" : "completed");
              setSteps((prev) => prev.map((s) => s.id === 2 ? { ...s, label: swapNeeded ? "Swap SUI → WAL" : "WAL balance OK — skip swap", status: "completed" } : s));
              advanceStep(3, "loading");
            }
            else if (p.step === "uploading") { advanceStep(3, "completed"); advanceStep(4, "loading"); }
            else if (p.step === "certifying") { advanceStep(4, "completed"); advanceStep(5, "loading"); }
          },
        },
      );
      advanceStep(2, "completed");
      advanceStep(3, "completed");
      advanceStep(4, "completed");
      advanceStep(5, "completed");
      advanceStep(6, "loading");

      const blobIdBytes = Array.from(new TextEncoder().encode(blobId));
      const sealPolicyBytes = Array.from(new TextEncoder().encode(JSON.stringify({ mode, capsuleId, contextAddr })));

      // Step 6: On-chain create_capsule
      const tx = buildCreateCapsuleTx({
        vaultId: vaultId!,
        capId: capId,
        role: role === "officer" ? "officer" : "member",
        mode,
        unlockTimeMs,
        beneficiary: benefAddr,
        walrusBlobId: blobIdBytes,
        sealPolicyId: sealPolicyBytes,
      });
      await signAndExecuteTransaction({ transaction: tx });
      advanceStep(6, "completed");

      setModalFinished(true);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      const cancelled = msg.includes("rejected") || msg.includes("denied") || msg.includes("cancel");
      // Mark current loading step as error
      setSteps((prev) => prev.map((s) => s.status === "loading" ? { ...s, status: "error" } : s));
      setModalError(cancelled ? "Transaction cancelled by user" : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    if (modalFinished) navigate("/vault");
  };

  return (
    <WalletGate message="You need to connect your wallet to create a time capsule.">
      <ProgressModal isOpen={modalOpen} steps={steps} onClose={closeModal} isFinished={modalFinished} error={modalError} />
      <div className={`min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8 ${modalOpen ? "pointer-events-none select-none" : ""}`}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-heading text-[#ffffd6] mb-3">Create Time Capsule</h1>
            <p className="text-[#8e8c77]">Send a message to the future</p>
            {role !== "guest" && (
              <p className="text-xs text-[#c64f05] mt-2">Role: {role.toUpperCase()}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mode selector */}
            <div>
              <label className="block text-[#ffffd6] mb-3">Capsule Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {MODES.map((m) => (
                  <button key={m.value} type="button" onClick={() => setMode(m.value)}
                    className={`p-4 rounded-lg border text-left transition-all ${mode === m.value ? "border-[#c64f05] bg-[#c64f05]/10" : "border-[#3c3836] bg-[#2b2827]/50 hover:border-[#c64f05]/30"}`}>
                    <m.icon className={`w-5 h-5 mb-2 ${mode === m.value ? "text-[#c64f05]" : "text-[#8e8c77]"}`} />
                    <div className={`text-sm font-medium ${mode === m.value ? "text-[#c64f05]" : "text-[#ffffd6]"}`}>{m.label}</div>
                    <div className="text-xs text-[#8e8c77] mt-1">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-[#ffffd6] mb-2">Your Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, maxChars))} placeholder="Write something that matters..."
                className="w-full h-32 px-4 py-3 bg-[#2b2827]/50 border border-[#3c3836] rounded-lg text-[#ffffd6] placeholder-[#8e8c77]/50 focus:border-[#c64f05] focus:outline-none focus:ring-1 focus:ring-[#c64f05] transition-all resize-none" maxLength={maxChars} />
              <div className={`text-right text-sm mt-1 ${message.length > maxChars * 0.9 ? "text-[#EF4444]" : "text-[#8e8c77]"}`}>{message.length} / {maxChars}</div>
            </div>

            {/* Unlock Date */}
            <div>
              <label className="block text-[#ffffd6] mb-2 flex items-center gap-2"><Calendar className="w-4 h-4" /> Unlock Date</label>
              <input type="datetime-local" value={unlockDate} onChange={(e) => setUnlockDate(e.target.value)}
                className="w-full px-4 py-3 bg-[#2b2827]/50 border border-[#3c3836] rounded-lg text-[#ffffd6] focus:border-[#c64f05] focus:outline-none focus:ring-1 focus:ring-[#c64f05] transition-all" />
              {daysUntil !== null && daysUntil > 0 && <div className="text-sm text-[#c64f05] mt-2">Unlocks in {daysUntil} day{daysUntil !== 1 ? "s" : ""}</div>}
            </div>

            {/* Beneficiary (for PRIVATE_INHERIT) */}
            {mode === CAPSULE_MODE.PRIVATE_INHERIT && (
              <div>
                <label className="block text-[#ffffd6] mb-2">Beneficiary Address</label>
                <input type="text" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="0x..."
                  className="w-full px-4 py-3 bg-[#2b2827]/50 border border-[#3c3836] rounded-lg text-[#ffffd6] font-mono placeholder-[#8e8c77]/50 focus:border-[#dd5807] focus:outline-none focus:ring-1 focus:ring-[#dd5807] transition-all" />
              </div>
            )}

            {/* Submit */}
            {/* Storage Duration */}
            <div>
              <label className="block text-[#ffffd6] mb-2">Storage Duration (days)</label>
              <input type="number" value={storageDays} onChange={(e) => setStorageDays(e.target.value)} min={daysUntil ?? 1}
                className="w-full px-4 py-3 bg-[#2b2827]/50 border border-[#3c3836] rounded-lg text-[#ffffd6] focus:border-[#c64f05] focus:outline-none focus:ring-1 focus:ring-[#c64f05] transition-all" />
              <p className="text-xs text-[#8e8c77] mt-1">How long the capsule data stays on Walrus. Must be ≥ unlock time ({daysUntil ?? "?"}d). 1 epoch ≈ 1 day on testnet.</p>
            </div>

            <button type="submit" disabled={isSubmitting}
              className="w-full px-6 py-4 bg-gradient-to-r from-[#c64f05] to-[#dd5807] text-[#130904] rounded-lg hover:drop-shadow-[0_0_20px_rgba(198,79,5,0.8)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <Rocket className="w-5 h-5" /> {isSubmitting ? "Deploying..." : "Launch Capsule"}
            </button>
          </form>
        </div>
      </div>
    </WalletGate>
  );
}
