import { useState } from "react";
import { UserPlus, Shield, User } from "lucide-react";
import { useDAppKit } from "@mysten/dapp-kit-react";
import { useQueryClient } from "@tanstack/react-query";
import { useVault } from "@/hooks/use-vault";
import { buildGrantMemberTx, buildGrantOfficerTx } from "@/lib/vault-tx";
import { toast } from "sonner";

export function MembersView() {
  const { role, capId, vaultId, members, refetch } = useVault();
  const { signAndExecuteTransaction } = useDAppKit();
  const queryClient = useQueryClient();
  const [addr, setAddr] = useState("");
  const [grantRole, setGrantRole] = useState<"member" | "officer">("member");
  const [busy, setBusy] = useState(false);
  const isOfficer = role === "officer" || role === "leader";

  const handleGrant = async () => {
    if (!addr.startsWith("0x") || !capId) return toast.error("Invalid address or no officer cap");
    setBusy(true);
    try {
      const tx = grantRole === "officer" ? buildGrantOfficerTx(capId, vaultId!, addr) : buildGrantMemberTx(capId, vaultId!, addr);
      await signAndExecuteTransaction({ transaction: tx });
      toast.success(`${grantRole === "officer" ? "Officer" : "Member"} cap granted!`);
      setAddr("");
      // Wait for GraphQL indexer to catch up
      await new Promise((r) => setTimeout(r, 3000));
      queryClient.invalidateQueries({ queryKey: ["members"] });
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Grant failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end border-b border-on-surface-variant/20 pb-4">
          <div>
            <h1 className="font-headline text-4xl font-black tracking-tighter text-on-surface mb-2">GUILD PERSONNEL</h1>
            <div className="flex items-center gap-4 text-xs font-mono text-primary opacity-80">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary animate-pulse" /> ONLINE</span>
              <span>MEMBERS: {members.length}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Grant Section */}
          {isOfficer && (
            <section className="lg:col-span-4 glass-panel border border-primary/20 p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />
              <h2 className="font-headline text-sm font-bold tracking-[0.2em] text-primary uppercase mb-8 flex items-center gap-2">
                <UserPlus size={18} /> Grant Access
              </h2>
              <div className="space-y-8">
                <div>
                  <label className="block font-headline text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">SUI Address</label>
                  <input type="text" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="0x0000...0000"
                    className="w-full bg-transparent border-b border-on-surface-variant/30 focus:border-primary focus:ring-0 text-on-surface font-mono text-sm py-2 transition-all outline-none" />
                </div>
                <div className="space-y-3">
                  <label className="block font-headline text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Role</label>
                  {(["member", "officer"] as const).map((r) => (
                    <label key={r} className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="role" checked={grantRole === r} onChange={() => setGrantRole(r)}
                        className="w-4 h-4 bg-transparent border-primary/40 text-primary focus:ring-primary/20" />
                      <span className="font-headline text-xs text-on-surface/80 tracking-widest uppercase">{r}</span>
                    </label>
                  ))}
                </div>
                <button onClick={handleGrant} disabled={busy || !addr}
                  className="w-full bg-primary text-background font-headline font-black text-xs py-4 tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 uppercase">
                  Grant Access
                </button>
              </div>
            </section>
          )}

          {/* Members List */}
          <section className={isOfficer ? "lg:col-span-8" : "lg:col-span-12"}>
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="font-headline text-[10px] text-on-surface-variant uppercase tracking-widest">{members.length} Operatives</div>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b border-on-surface-variant/30">
                  <th className="py-4 px-4 font-headline text-[10px] text-on-surface-variant uppercase tracking-[0.2em]">Address</th>
                  <th className="py-4 px-4 font-headline text-[10px] text-on-surface-variant uppercase tracking-[0.2em]">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-on-surface-variant/10">
                {members.map((m) => (
                  <tr key={m.capId} className="hover:bg-primary/5 transition-colors">
                    <td className="py-5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 bg-surface-high flex items-center justify-center border ${m.role === "officer" ? "border-primary/30" : "border-on-surface-variant/30"}`}>
                          {m.role === "officer" ? <Shield size={16} className="text-primary" /> : <User size={16} className="text-on-surface-variant" />}
                        </div>
                        <span className="font-mono text-sm text-on-surface">{m.address.slice(0, 10)}...{m.address.slice(-6)}</span>
                      </div>
                    </td>
                    <td className="py-5 px-4">
                      <span className={`inline-block px-3 py-1 border text-[10px] font-black tracking-widest font-headline uppercase ${
                        m.role === "officer" ? "bg-primary/20 border-primary text-primary" : "bg-on-surface-variant/20 border-on-surface-variant text-on-surface-variant"
                      }`}>{m.role}</span>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr><td colSpan={2} className="py-12 text-center text-on-surface-variant font-headline uppercase text-sm">No members found</td></tr>
                )}
              </tbody>
            </table>
          </section>
        </div>
    </div>
  );
}
