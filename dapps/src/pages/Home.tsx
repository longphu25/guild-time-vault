import { Link } from "react-router";
import { ArrowRight, Package, Unlock, Clock, Lock, Hourglass } from "lucide-react";
import { useVault } from "@/hooks/use-vault";
import { CAPSULE_MODE } from "@/lib/contract";

const steps = [
  { icon: Clock, title: "Create", description: "Write a message and set when it can be opened" },
  { icon: Hourglass, title: "Wait", description: "Your capsule is time-locked on the blockchain" },
  { icon: Unlock, title: "Unlock", description: "Open it when the time comes and reveal the message" },
];

export function Home() {
  const { capsules, heartbeat, loading } = useVault();

  const now = Date.now();
  const totalCapsules = capsules.length;
  const openedCount = capsules.filter((c) => c.claimed).length;
  const longestWaitDays = capsules.reduce((max, c) => {
    const days = Math.ceil((c.unlock_time_ms - now) / 864e5);
    return days > max ? days : max;
  }, 0);

  const stats = [
    { label: "Total Capsules", value: loading ? "..." : String(totalCapsules), icon: Package, color: "text-[#00F0FF]" },
    { label: "Claimed", value: loading ? "..." : String(openedCount), icon: Unlock, color: "text-[#F59E0B]" },
    { label: "Longest Wait", value: loading ? "..." : `${longestWaitDays}d`, icon: Hourglass, color: "text-[#A855F7]" },
  ];

  // Recent capsules as activity
  const recent = [...capsules].reverse().slice(0, 5);

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0A0F]/50 to-[#0A0A0F] pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00F0FF]/10 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#A855F7]/10 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="font-heading text-5xl md:text-7xl mb-6 text-[#E2E8F0] drop-shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            Guild Time Vault
          </h1>
          <p className="text-xl md:text-2xl text-[#94A3B8] mb-4">Bury your message in the stars. Unlock it when the time comes.</p>
          <p className="text-base md:text-lg text-[#94A3B8] mb-8 max-w-2xl mx-auto">Time-locked capsules for EVE Frontier guilds. Archive secrets, set inheritance, protect with dead man's switch.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/create" className="px-6 py-3 bg-[#00F0FF] text-[#0A0A0F] rounded-lg hover:drop-shadow-[0_0_20px_rgba(0,240,255,0.8)] transition-all flex items-center gap-2 group">
              <span>Create Capsule</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/timeline" className="px-6 py-3 bg-transparent border border-[#00F0FF] text-[#00F0FF] rounded-lg hover:bg-[#00F0FF]/10 transition-all flex items-center gap-2">
              View Timeline <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-[#1A1A2E]/80 backdrop-blur-md border border-[#2D2D3F] rounded-lg p-6 hover:border-[#00F0FF]/30 transition-all" style={{ background: "linear-gradient(135deg, rgba(26,26,46,0.8) 0%, rgba(26,26,46,0.4) 100%)" }}>
              <div className="flex items-center gap-4">
                <stat.icon className={`w-12 h-12 ${stat.color}`} />
                <div>
                  <div className={`text-3xl font-heading ${stat.color} drop-shadow-[0_0_10px_currentColor]`}>{stat.value}</div>
                  <div className="text-sm text-[#94A3B8] mt-1">{stat.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Capsules */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-heading text-[#E2E8F0] mb-6">Recent Capsules</h2>
        <div className="bg-[#1A1A2E]/80 backdrop-blur-md border border-[#2D2D3F] rounded-lg divide-y divide-[#2D2D3F]">
          {loading ? (
            <div className="px-6 py-4 text-[#94A3B8]">Loading...</div>
          ) : recent.length === 0 ? (
            <div className="px-6 py-4 text-[#94A3B8]">No capsules yet. Be the first to create one!</div>
          ) : (
            recent.map((c) => {
              const modeLabel = c.mode === CAPSULE_MODE.ARCHIVE ? "Archive" : c.mode === CAPSULE_MODE.PRIVATE_INHERIT ? "Inheritance" : "Dead Man";
              const addr = `${c.creator.slice(0, 6)}...${c.creator.slice(-4)}`;
              const daysLeft = Math.ceil((c.unlock_time_ms - now) / 864e5);
              return (
                <div key={c.capsule_id} className="px-6 py-4 flex items-center justify-between hover:bg-[#00F0FF]/5 transition-colors">
                  <div className="flex items-center gap-3">
                    {c.claimed ? <Unlock className="w-4 h-4 text-[#F59E0B]" /> : <Lock className="w-4 h-4 text-[#3B82F6]" />}
                    <span className="text-[#E2E8F0] text-sm">
                      <span className="text-[#00F0FF] font-mono">{addr}</span>{" "}
                      created {modeLabel} capsule
                      {!c.claimed && daysLeft > 0 && <span className="text-[#94A3B8]"> (unlocks in {daysLeft}d)</span>}
                      {!c.claimed && daysLeft <= 0 && <span className="text-[#F59E0B]"> (unlockable!)</span>}
                      {c.claimed && <span className="text-[#94A3B8]"> (claimed)</span>}
                    </span>
                  </div>
                  <span className="text-xs text-[#94A3B8] px-2 py-1 bg-[#2D2D3F] rounded">{modeLabel}</span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Heartbeat Status */}
      {heartbeat && (
        <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-[#1A1A2E]/80 backdrop-blur-md border border-[#2D2D3F] rounded-lg p-6">
            <h3 className="text-lg font-heading text-[#E2E8F0] mb-3">Dead Man's Switch</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-[#94A3B8]">Last Ping:</span> <span className="text-[#E2E8F0] ml-2">{new Date(heartbeat.last_ping_ms).toLocaleString()}</span></div>
              <div><span className="text-[#94A3B8]">Timeout:</span> <span className="text-[#E2E8F0] ml-2">{Math.floor(heartbeat.timeout_ms / 864e5)}d</span></div>
              <div><span className="text-[#94A3B8]">Status:</span> <span className={`ml-2 ${now - heartbeat.last_ping_ms > heartbeat.timeout_ms ? "text-[#EF4444]" : "text-[#10B981]"}`}>{now - heartbeat.last_ping_ms > heartbeat.timeout_ms ? "EXPIRED" : "Active"}</span></div>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-12">
        <h2 className="text-3xl font-heading text-[#E2E8F0] text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#1A1A2E]/80 border border-[#00F0FF]/30 mb-4">
                <step.icon className="w-10 h-10 text-[#00F0FF]" />
              </div>
              <h3 className="text-xl font-heading text-[#E2E8F0] mb-2">{i + 1}. {step.title}</h3>
              <p className="text-[#94A3B8]">{step.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
