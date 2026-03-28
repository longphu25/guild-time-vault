import { useState } from "react";
import { Zap, Lock, Unlock, Circle } from "lucide-react";
import { useVault } from "@/hooks/use-vault";
import { CAPSULE_MODE } from "@/lib/contract";
import type { CapsuleData } from "@/lib/vault-reader";

type TimeFilter = "7days" | "30days" | "3months" | "all";
const filterDays: Record<TimeFilter, number> = { "7days": 7, "30days": 30, "3months": 90, all: Infinity };
const timeFilters: { value: TimeFilter; label: string }[] = [
  { value: "7days", label: "Next 7 days" }, { value: "30days", label: "Next 30 days" },
  { value: "3months", label: "Next 3 months" }, { value: "all", label: "All" },
];

const modeLabel = (m: number) => m === CAPSULE_MODE.ARCHIVE ? "Archive" : m === CAPSULE_MODE.PRIVATE_INHERIT ? "Inheritance" : "Dead Man";
const truncate = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
const fmtDate = (ms: number) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));

function CapsuleRow({ c }: { c: CapsuleData }) {
  const now = Date.now();
  const unlockable = !c.claimed && now >= c.unlock_time_ms;
  const daysLeft = Math.ceil((c.unlock_time_ms - now) / 864e5);

  return (
    <div className="bg-[#1A1A2E]/80 backdrop-blur-md border border-[#2D2D3F] rounded-lg p-4 hover:border-[#00F0FF]/30 transition-all">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className={c.claimed ? "text-[#6B7280]" : unlockable ? "text-[#F59E0B]" : "text-[#3B82F6]"}>
            {c.claimed ? <Circle className="w-4 h-4" /> : unlockable ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[#00F0FF] font-mono text-sm">{truncate(c.creator)}</span>
              <span className="text-xs text-[#94A3B8] px-2 py-0.5 bg-[#2D2D3F] rounded">{modeLabel(c.mode)}</span>
            </div>
            <div className="text-sm text-[#94A3B8] mt-1">{fmtDate(c.unlock_time_ms)}</div>
            {!c.claimed && daysLeft > 0 && <div className="text-sm text-[#F59E0B] mt-1">{daysLeft}d remaining</div>}
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${c.claimed ? "bg-[#6B7280]/20 text-[#6B7280]" : unlockable ? "bg-[#F59E0B]/20 text-[#F59E0B]" : "bg-[#3B82F6]/20 text-[#3B82F6]"}`}>
          {c.claimed ? "Claimed" : unlockable ? "Unlockable" : "Locked"}
        </span>
      </div>
    </div>
  );
}

export function Timeline() {
  const { capsules, loading } = useVault();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const now = Date.now();

  const filtered = capsules.filter((c) => (c.unlock_time_ms - now) / 864e5 <= filterDays[timeFilter]);
  const soon = filtered.filter((c) => !c.claimed && c.unlock_time_ms > now && c.unlock_time_ms - now < 7 * 864e5);
  const rest = filtered.filter((c) => !(c.unlock_time_ms > now && c.unlock_time_ms - now < 7 * 864e5 && !c.claimed));

  return (
    <div className="min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-heading text-[#E2E8F0] mb-2">Timeline</h1>
          <p className="text-[#94A3B8]">Capsules scheduled to unlock</p>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {timeFilters.map((f) => (
            <button key={f.value} onClick={() => setTimeFilter(f.value)}
              className={`px-4 py-2 rounded-lg transition-all ${timeFilter === f.value ? "bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30" : "bg-[#1A1A2E]/50 text-[#94A3B8] border border-[#2D2D3F] hover:text-[#E2E8F0]"}`}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#94A3B8]">Loading capsules from chain...</div>
        ) : (
          <>
            {soon.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-6 h-6 text-[#F59E0B] drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  <h2 className="text-2xl font-heading text-[#F59E0B] drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">Unlocking Soon</h2>
                </div>
                <div className="space-y-4">
                  {soon.map((c) => (
                    <div key={c.capsule_id} className="bg-[#1A1A2E]/80 backdrop-blur-md border-2 border-[#F59E0B]/30 rounded-lg p-6">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-[#00F0FF] font-mono">{truncate(c.creator)}</span>
                        <span className="text-xs text-[#94A3B8] px-2 py-1 bg-[#2D2D3F] rounded">{modeLabel(c.mode)}</span>
                      </div>
                      <div className="text-sm text-[#94A3B8] mb-2">Unlocks: {fmtDate(c.unlock_time_ms)}</div>
                      <div className="text-2xl font-heading text-[#F59E0B]">{Math.ceil((c.unlock_time_ms - now) / 864e5)}d remaining</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {rest.length > 0 ? rest.map((c) => <CapsuleRow key={c.capsule_id} c={c} />) : <div className="text-center py-12 text-[#94A3B8]">No capsules found</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
