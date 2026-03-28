import { useState } from "react";
import { Heart, UserPlus, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { useDAppKit } from "@mysten/dapp-kit-react";
import { WalletGate } from "@/components/capsule/WalletGate";
import { useVault } from "@/hooks/use-vault";
import { buildHeartbeatTx, buildGrantMemberTx, buildGrantOfficerTx } from "@/lib/vault-tx";

export function Admin() {
  const { role, capId, heartbeat, members, refetch } = useVault();
  const { signAndExecuteTransaction } = useDAppKit();
  const [memberAddr, setMemberAddr] = useState("");
  const [grantType, setGrantType] = useState<"member" | "officer">("member");
  const [busy, setBusy] = useState(false);

  const now = Date.now();
  const isOfficer = role === "officer" || role === "leader";

  const handleHeartbeat = async () => {
    setBusy(true);
    try {
      const tx = buildHeartbeatTx();
      await signAndExecuteTransaction({ transaction: tx });
      toast.success("Heartbeat sent!");
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Heartbeat failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGrant = async () => {
    if (!memberAddr.startsWith("0x")) return toast.error("Invalid address");
    if (!capId) return toast.error("No officer capability found");
    setBusy(true);
    try {
      const tx = grantType === "officer"
        ? buildGrantOfficerTx(capId, memberAddr)
        : buildGrantMemberTx(capId, memberAddr);
      await signAndExecuteTransaction({ transaction: tx });
      toast.success(`${grantType === "officer" ? "Officer" : "Member"} cap granted!`);
      setMemberAddr("");
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Grant failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <WalletGate message="Connect your wallet to access admin panel.">
      <div className="min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-heading text-[#E2E8F0] mb-2">Admin</h1>
            <p className="text-[#94A3B8]">Role: <span className="text-[#00F0FF]">{role.toUpperCase()}</span></p>
          </div>

          {!isOfficer ? (
            <div className="bg-[#1A1A2E]/80 border border-[#2D2D3F] rounded-lg p-8 text-center">
              <Shield className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />
              <p className="text-[#94A3B8]">Only officers and leaders can access admin functions.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Heartbeat */}
              <div className="bg-[#1A1A2E]/80 border border-[#2D2D3F] rounded-lg p-6">
                <h2 className="text-xl font-heading text-[#E2E8F0] mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-[#EF4444]" /> Dead Man's Switch
                </h2>
                {heartbeat && (
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div><span className="text-[#94A3B8]">Last Ping:</span> <span className="text-[#E2E8F0] ml-2">{new Date(heartbeat.last_ping_ms).toLocaleString()}</span></div>
                    <div><span className="text-[#94A3B8]">Timeout:</span> <span className="text-[#E2E8F0] ml-2">{Math.floor(heartbeat.timeout_ms / 864e5)}d</span></div>
                    <div><span className="text-[#94A3B8]">Deadline:</span> <span className="text-[#E2E8F0] ml-2">{new Date(heartbeat.last_ping_ms + heartbeat.timeout_ms).toLocaleString()}</span></div>
                    <div><span className="text-[#94A3B8]">Status:</span> <span className={`ml-2 ${now - heartbeat.last_ping_ms > heartbeat.timeout_ms ? "text-[#EF4444]" : "text-[#10B981]"}`}>{now - heartbeat.last_ping_ms > heartbeat.timeout_ms ? "EXPIRED" : "Active"}</span></div>
                  </div>
                )}
                <button onClick={handleHeartbeat} disabled={busy}
                  className="px-6 py-3 bg-[#EF4444] text-white rounded-lg hover:drop-shadow-[0_0_12px_rgba(239,68,68,0.6)] transition-all disabled:opacity-50 flex items-center gap-2">
                  <Heart className="w-4 h-4" /> Ping Now
                </button>
              </div>

              {/* Grant Role */}
              <div className="bg-[#1A1A2E]/80 border border-[#2D2D3F] rounded-lg p-6">
                <h2 className="text-xl font-heading text-[#E2E8F0] mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#00F0FF]" /> Grant Role
                </h2>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    {(["member", "officer"] as const).map((t) => (
                      <button key={t} onClick={() => setGrantType(t)}
                        className={`px-4 py-2 rounded-lg transition-all ${grantType === t ? "bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30" : "bg-[#1A1A2E]/50 text-[#94A3B8] border border-[#2D2D3F]"}`}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                  <input type="text" value={memberAddr} onChange={(e) => setMemberAddr(e.target.value)} placeholder="Sui address (0x...)"
                    className="w-full px-4 py-3 bg-[#1A1A2E]/50 border border-[#2D2D3F] rounded-lg text-[#E2E8F0] font-mono placeholder-[#94A3B8]/50 focus:border-[#00F0FF] focus:outline-none focus:ring-1 focus:ring-[#00F0FF] transition-all" />
                  <button onClick={handleGrant} disabled={busy || !memberAddr}
                    className="px-6 py-3 bg-[#00F0FF] text-[#0A0A0F] rounded-lg hover:drop-shadow-[0_0_12px_rgba(0,240,255,0.8)] transition-all disabled:opacity-50 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> Grant {grantType === "officer" ? "Officer" : "Member"} Cap
                  </button>
                </div>
              </div>

              {/* Members List */}
              <div className="bg-[#1A1A2E]/80 border border-[#2D2D3F] rounded-lg p-6">
                <h2 className="text-xl font-heading text-[#E2E8F0] mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#A855F7]" /> Guild Members ({members.length})
                </h2>
                {members.length > 0 ? (
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m.capId} className="flex items-center justify-between px-4 py-3 bg-[#0A0A0F]/50 rounded-lg">
                        <span className="text-[#00F0FF] font-mono text-sm">{m.address.slice(0, 10)}...{m.address.slice(-6)}</span>
                        <span className={`text-xs px-2 py-1 rounded ${m.role === "officer" ? "bg-[#F59E0B]/20 text-[#F59E0B]" : "bg-[#3B82F6]/20 text-[#3B82F6]"}`}>
                          {m.role.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#94A3B8] text-sm">No members found</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </WalletGate>
  );
}
