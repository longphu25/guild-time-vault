import { Lock, Unlock, Circle, Globe, Trash2, Eye } from "lucide-react";
import { Link } from "react-router";

export type CapsuleStatus = "locked" | "unlockable" | "opened";

export interface Capsule {
  id: string;
  creator: string;
  message?: string;
  unlockDate: Date;
  createdDate: Date;
  status: CapsuleStatus;
  visibility: "public" | "private";
  recipient?: string;
  openedBy?: string;
  openedDate?: Date;
  timeRemaining?: string;
}

const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);

const statusColor: Record<CapsuleStatus, string> = {
  locked: "text-[#3B82F6]",
  unlockable: "text-[#F59E0B]",
  opened: "text-[#6B7280]",
};
const StatusIcon = ({ status }: { status: CapsuleStatus }) =>
  status === "locked" ? <Lock className="w-4 h-4" /> : status === "unlockable" ? <Unlock className="w-4 h-4" /> : <Circle className="w-4 h-4" />;

const VisibilityBadge = ({ v }: { v: string }) => (
  <span className="flex items-center gap-1 text-xs text-[#94A3B8]">
    {v === "public" ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
    {v === "public" ? "Public" : "Private"}
  </span>
);

interface Props {
  capsule: Capsule;
  variant?: "compact" | "detailed" | "actionable";
  onOpen?: (id: string) => void;
  onDestroy?: (id: string) => void;
}

export function CapsuleCard({ capsule, variant = "compact", onOpen, onDestroy }: Props) {
  if (variant === "detailed") {
    return (
      <div className="bg-[#1A1A2E]/80 backdrop-blur-md border border-[#2D2D3F] rounded-lg p-6 hover:border-[#00F0FF]/30 transition-all">
        {capsule.message && (
          <p className="text-[#E2E8F0] text-lg italic leading-relaxed mb-4">"{capsule.message}"</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div><span className="text-[#94A3B8]">Creator:</span> <span className="text-[#00F0FF] font-mono ml-2">{truncate(capsule.creator)}</span></div>
          <div><span className="text-[#94A3B8]">Created:</span> <span className="text-[#E2E8F0] ml-2">{fmtDate(capsule.createdDate)}</span></div>
          <div><span className="text-[#94A3B8]">Opened:</span> <span className="text-[#E2E8F0] ml-2">{capsule.openedDate ? fmtDate(capsule.openedDate) : "N/A"}</span></div>
          {capsule.openedBy && <div><span className="text-[#94A3B8]">Opened by:</span> <span className="text-[#00F0FF] font-mono ml-2">{truncate(capsule.openedBy)}</span></div>}
        </div>
      </div>
    );
  }

  if (variant === "actionable") {
    return (
      <div className="bg-[#1A1A2E]/80 backdrop-blur-md border border-[#2D2D3F] rounded-lg p-4 hover:border-[#00F0FF]/30 transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`mt-1 ${statusColor[capsule.status]}`}><StatusIcon status={capsule.status} /></div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[#00F0FF] font-mono text-sm">{truncate(capsule.creator)}</span>
                <VisibilityBadge v={capsule.visibility} />
              </div>
              <div className="text-sm text-[#94A3B8]">Unlocks: {fmtDate(capsule.unlockDate)}</div>
              {capsule.timeRemaining && capsule.status === "locked" && (
                <div className="text-sm text-[#F59E0B]">{capsule.timeRemaining} remaining</div>
              )}
              {capsule.recipient && (
                <div className="text-xs text-[#94A3B8]">To: <span className="text-[#00F0FF] font-mono">{truncate(capsule.recipient)}</span></div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {capsule.status === "unlockable" && onOpen && (
              <button onClick={() => onOpen(capsule.id)} className="px-3 py-1.5 bg-[#00F0FF] text-[#0A0A0F] rounded text-sm hover:drop-shadow-[0_0_12px_rgba(0,240,255,0.8)] transition-all">Open</button>
            )}
            {capsule.status === "locked" && onDestroy && (
              <button onClick={() => onDestroy(capsule.id)} className="px-3 py-1.5 bg-transparent border border-[#EF4444] text-[#EF4444] rounded text-sm hover:bg-[#EF4444]/10 transition-all"><Trash2 className="w-3 h-3" /></button>
            )}
            <Link to={`/capsule/${capsule.id}`} className="px-3 py-1.5 bg-transparent border border-[#2D2D3F] text-[#94A3B8] rounded text-sm hover:text-[#E2E8F0] hover:border-[#00F0FF]/30 transition-all"><Eye className="w-3 h-3" /></Link>
          </div>
        </div>
      </div>
    );
  }

  // compact
  return (
    <div className="bg-[#1A1A2E]/80 backdrop-blur-md border border-[#2D2D3F] rounded-lg p-4 hover:border-[#00F0FF]/30 transition-all">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className={statusColor[capsule.status]}><StatusIcon status={capsule.status} /></div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[#00F0FF] font-mono text-sm">{truncate(capsule.creator)}</span>
              <VisibilityBadge v={capsule.visibility} />
            </div>
            <div className="text-sm text-[#94A3B8] mt-1">{fmtDate(capsule.unlockDate)}</div>
            {capsule.timeRemaining && capsule.status === "locked" && (
              <div className="text-sm text-[#F59E0B] mt-1">{capsule.timeRemaining}</div>
            )}
          </div>
        </div>
        <Link to={`/capsule/${capsule.id}`} className="px-3 py-1.5 bg-transparent border border-[#2D2D3F] text-[#94A3B8] rounded text-sm hover:text-[#E2E8F0] hover:border-[#00F0FF]/30 transition-all">View</Link>
      </div>
    </div>
  );
}
