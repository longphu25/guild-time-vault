import { useState, useEffect, useRef } from "react";
import { Lock, Unlock, Circle, X } from "lucide-react";
import type { Capsule } from "@/components/capsule/CapsuleCard";

type FilterStatus = "all" | "locked" | "unlockable" | "opened";

const capsules: (Capsule & { x: number; y: number })[] = [
  { id: "1", creator: "0xABCD1234EFGH5678", unlockDate: new Date(Date.now() + 5 * 864e5), createdDate: new Date(Date.now() - 10 * 864e5), status: "locked", visibility: "public", x: 150, y: 200, timeRemaining: "5d remaining" },
  { id: "2", creator: "0x9876ABCD1234WXYZ", unlockDate: new Date(Date.now() - 864e5), createdDate: new Date(Date.now() - 20 * 864e5), status: "unlockable", visibility: "public", x: 400, y: 300 },
  { id: "3", creator: "0xDEF01234ABCD5678", unlockDate: new Date(Date.now() - 10 * 864e5), createdDate: new Date(Date.now() - 30 * 864e5), status: "opened", visibility: "public", x: 600, y: 150, openedBy: "0x1234ABCD5678WXYZ" },
  { id: "4", creator: "0x5555AAAA9999BBBB", unlockDate: new Date(Date.now() + 30 * 864e5), createdDate: new Date(Date.now() - 5 * 864e5), status: "locked", visibility: "private", x: 250, y: 400, timeRemaining: "30d remaining", recipient: "0xAAAA5555BBBB9999" },
  { id: "5", creator: "0xCCCC1111DDDD2222", unlockDate: new Date(Date.now() - 2 * 864e5), createdDate: new Date(Date.now() - 50 * 864e5), status: "unlockable", visibility: "public", x: 500, y: 450 },
];

const truncate = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
const fmtDate = (d: Date) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);

export function GalaxyMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selected, setSelected] = useState<(typeof capsules)[0] | null>(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

  const filtered = capsules.filter((c) => filter === "all" || c.status === filter);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(45,45,63,0.2)";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
      for (let y = 0; y < canvas.height; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

      for (const c of filtered) {
        const color = c.status === "locked" ? "#3B82F6" : c.status === "unlockable" ? "#F59E0B" : "#6B7280";
        const glow = c.status === "locked" ? "rgba(59,130,246,0.5)" : c.status === "unlockable" ? "rgba(245,158,11,0.8)" : "rgba(107,116,128,0.3)";
        ctx.shadowBlur = c.status === "unlockable" ? 20 : 10;
        ctx.shadowColor = glow;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.status === "unlockable" ? 8 : 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (c.status === "unlockable") {
          const pulse = Math.sin(Date.now() / 500) * 3 + 3;
          ctx.strokeStyle = glow;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(c.x, c.y, 8 + pulse, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", resize); };
  }, [filtered]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const hit = filtered.find((c) => Math.hypot(c.x - x, c.y - y) < 15);
    if (hit) { setSelected(hit); setPopupPos({ x: e.clientX, y: e.clientY }); } else setSelected(null);
  };

  const filters: { value: FilterStatus; label: string; icon: typeof Circle }[] = [
    { value: "all", label: "All Capsules", icon: Circle },
    { value: "locked", label: "Locked", icon: Lock },
    { value: "unlockable", label: "Unlockable", icon: Unlock },
    { value: "opened", label: "Opened", icon: Circle },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
      <div className="lg:w-64 bg-[#0D1117] border-b lg:border-r border-[#2D2D3F] p-4">
        <h3 className="text-[#E2E8F0] mb-4">Filters</h3>
        <div className="space-y-2">
          {filters.map((f) => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${filter === f.value ? "bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30" : "text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#1A1A2E]/50"}`}>
              <f.icon className="w-4 h-4" /> {f.label}
            </button>
          ))}
        </div>
        <div className="mt-8 pt-6 border-t border-[#2D2D3F]">
          <h4 className="text-[#94A3B8] text-sm mb-3">Legend</h4>
          <div className="space-y-2 text-sm">
            {[["#3B82F6", "Locked"], ["#F59E0B", "Unlockable"], ["#6B7280", "Opened"]].map(([c, l]) => (
              <div key={l} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: c }} /><span className="text-[#94A3B8]">{l}</span></div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <canvas ref={canvasRef} onClick={handleClick} className="w-full h-full cursor-pointer" style={{ background: "#0A0A0F" }} />
        {selected && (
          <div className="fixed z-50 bg-[#1A1A2E]/95 backdrop-blur-md border border-[#2D2D3F] rounded-lg p-4 shadow-xl max-w-xs"
            style={{ left: Math.min(popupPos.x + 10, window.innerWidth - 320), top: Math.min(popupPos.y + 10, window.innerHeight - 250) }}>
            <button onClick={() => setSelected(null)} className="absolute top-2 right-2 text-[#94A3B8] hover:text-[#E2E8F0]"><X className="w-4 h-4" /></button>
            <div className="space-y-2">
              <div><span className="text-[#94A3B8] text-sm">Creator:</span><div className="text-[#00F0FF] font-mono text-sm">{truncate(selected.creator)}</div></div>
              <div><span className="text-[#94A3B8] text-sm">Unlock Date:</span><div className="text-[#E2E8F0] text-sm">{fmtDate(selected.unlockDate)}</div></div>
              <div><span className="text-[#94A3B8] text-sm">Status:</span><div className={`text-sm ${selected.status === "locked" ? "text-[#3B82F6]" : selected.status === "unlockable" ? "text-[#F59E0B]" : "text-[#6B7280]"}`}>{selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}</div></div>
              {selected.timeRemaining && <div><span className="text-[#94A3B8] text-sm">Time Remaining:</span><div className="text-[#F59E0B] text-sm">{selected.timeRemaining}</div></div>}
              {selected.status === "unlockable" && <button className="w-full mt-2 px-4 py-2 bg-[#00F0FF] text-[#0A0A0F] rounded hover:drop-shadow-[0_0_12px_rgba(0,240,255,0.8)] transition-all">Open Capsule</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
