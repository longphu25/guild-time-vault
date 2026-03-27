import { useState } from "react";
import { Search, ScrollText } from "lucide-react";
import { useVault } from "@/hooks/use-vault";
import { CAPSULE_MODE } from "@/lib/contract";

const truncate = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
const fmtDate = (ms: number) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));

export function Archive() {
  const { capsules, loading } = useVault();
  const [q, setQ] = useState("");

  const claimed = capsules.filter((c) => c.claimed);
  const filtered = claimed.filter((c) => {
    if (!q) return true;
    const s = q.toLowerCase();
    const msg = c.walrus_blob_id.length > 0 ? new TextDecoder().decode(new Uint8Array(c.walrus_blob_id)) : "";
    return msg.toLowerCase().includes(s) || c.creator.toLowerCase().includes(s);
  });

  return (
    <div className="min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ScrollText className="w-8 h-8 text-[#00F0FF]" />
            <h1 className="text-4xl font-heading text-[#E2E8F0]">Civilization Archive</h1>
          </div>
          <p className="text-[#94A3B8]">Messages from the past, preserved for the future</p>
        </div>

        <div className="mb-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages or addresses..."
            className="w-full pl-12 pr-4 py-3 bg-[#1A1A2E]/50 border border-[#2D2D3F] rounded-lg text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:border-[#00F0FF] focus:outline-none focus:ring-1 focus:ring-[#00F0FF] transition-all" />
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12 text-[#94A3B8]">Loading from chain...</div>
          ) : filtered.length > 0 ? (
            filtered.map((c) => {
              const msg = c.walrus_blob_id.length > 0 ? new TextDecoder().decode(new Uint8Array(c.walrus_blob_id)) : "(encrypted content)";
              return (
                <div key={c.capsule_id} className="bg-[#1A1A2E]/80 backdrop-blur-md border border-[#2D2D3F] rounded-lg p-6 hover:border-[#00F0FF]/30 transition-all">
                  <p className="text-[#E2E8F0] text-lg italic leading-relaxed mb-4">"{msg}"</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-[#94A3B8]">Creator:</span> <span className="text-[#00F0FF] font-mono ml-2">{truncate(c.creator)}</span></div>
                    <div><span className="text-[#94A3B8]">Created:</span> <span className="text-[#E2E8F0] ml-2">{fmtDate(c.unlock_time_ms)}</span></div>
                    <div><span className="text-[#94A3B8]">Mode:</span> <span className="text-[#E2E8F0] ml-2">{c.mode === CAPSULE_MODE.ARCHIVE ? "Archive" : c.mode === CAPSULE_MODE.PRIVATE_INHERIT ? "Inheritance" : "Dead Man"}</span></div>
                  </div>
                </div>
              );
            })
          ) : q ? (
            <div className="text-center py-16 text-[#94A3B8]">No messages found matching "{q}"</div>
          ) : (
            <div className="text-center py-16"><ScrollText className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" /><p className="text-[#94A3B8]">No messages have been revealed yet. The archive awaits.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
