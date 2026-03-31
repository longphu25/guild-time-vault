import { useState } from "react";
import { Terminal, Database, Copy, Check, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";

const WORLD_API = "https://world-api-utopia.uat.pub.evefrontier.com";

interface Step {
  id: string;
  title: string;
  description: string;
  commands?: { cmd: string; note: string }[];
  tips?: string[];
  done: boolean;
}

const INITIAL_STEPS: Step[] = [
  {
    id: "install",
    title: "Install & Launch EVE Frontier",
    description: "Download the launcher and connect to Utopia sandbox.",
    tips: [
      "Download from https://evefrontier.com/en/download",
      "Mac: cd /Applications; open 'EVE Frontier.app/' --args --frontier-test-servers=Utopia",
      "Windows: Right-click shortcut → Properties → add --frontier-test-servers=Utopia to Target",
      "Select 'Utopia' from server dropdown, enter email verification code",
    ],
    done: false,
  },
  {
    id: "character",
    title: "Create Character",
    description: "Create your in-game character. This creates a Character object on Sui testnet linked to your EVE Vault wallet.",
    tips: [
      "Character is created automatically when you first enter the game",
      "Your character gets a PlayerProfile (owned) and Character (shared) object on-chain",
      "Character name, tribe, and address are stored on-chain",
    ],
    done: false,
  },
  {
    id: "spawn-nwn",
    title: "Spawn Network Node",
    description: "Network Nodes provide energy to assemblies. You need one before deploying other structures.",
    commands: [
      { cmd: "/giveitem 88092 1", note: "Spawn 1 Network Node" },
      { cmd: "/giveitem 77800 100", note: "Spawn 100 Common Ore (fuel)" },
      { cmd: "/giveitem 83839 100", note: "Spawn 100 Salt (fuel)" },
    ],
    tips: [
      "Open chat in-game and type the commands",
      "Network Node appears in your ship cargo",
    ],
    done: false,
  },
  {
    id: "deploy-nwn",
    title: "Deploy & Fuel Network Node",
    description: "Anchor the Network Node in space, add fuel, and bring it online.",
    tips: [
      "Open inventory → find Network Node → Deploy/Anchor at current location",
      "After anchoring, open the Network Node → add fuel (Common Ore or Salt)",
      "Click 'Bring Online' — this starts energy production",
      "Network Node must be online before connected assemblies can go online",
    ],
    done: false,
  },
  {
    id: "spawn-ssu",
    title: "Spawn Smart Storage Unit",
    description: "Smart Storage Units are programmable on-chain storage structures.",
    commands: [
      { cmd: "/giveitem 77917 1", note: "Spawn 1 Smart Storage Unit (SSU)" },
    ],
    done: false,
  },
  {
    id: "deploy-ssu",
    title: "Deploy Smart Storage Unit",
    description: "Anchor the SSU near your Network Node and bring it online.",
    tips: [
      "Deploy SSU within range of your Network Node",
      "The SSU will automatically connect to the nearest Network Node for energy",
      "Bring the SSU online — it's now a live assembly on Sui testnet",
      "You now own an OwnerCap<StorageUnit> object in your wallet",
    ],
    done: false,
  },
  {
    id: "spawn-gate",
    title: "(Optional) Spawn Smart Gate",
    description: "Smart Gates control jump access between solar systems.",
    commands: [
      { cmd: "/giveitem 83907 1", note: "Spawn 1 Gatekeeper (Smart Gate)" },
    ],
    tips: [
      "Gates need to be linked in pairs (source + destination)",
      "Deploy near Network Node, bring online, then link with another gate",
    ],
    done: false,
  },
  {
    id: "get-id",
    title: "Get Assembly Object ID",
    description: "Find your assembly's on-chain object ID to use in the dApp.",
    tips: [
      "Check the World API for your assemblies",
      "Or check your wallet on Sui Explorer for OwnerCap objects",
      "The OwnerCap's authorized_object_id points to the assembly",
      "Use the assembly object ID as VITE_OBJECT_ID in .env",
      "Or pass ?itemId=<game_item_id>&tenant=utopia in the URL",
    ],
    done: false,
  },
  {
    id: "connect-dapp",
    title: "Connect Assembly to dApp",
    description: "Load your assembly data in the dApp using useSmartObject().",
    tips: [
      "Set VITE_OBJECT_ID=<assembly_sui_object_id> in dapps/.env",
      "Or visit /profile?itemId=<game_item_id>&tenant=utopia",
      "The Profile page will show full assembly data",
      "You can now authorize extensions on your assembly (e.g. VaultAuth)",
    ],
    done: false,
  },
];

const SANDBOX_ITEMS = [
  { name: "Smart Storage Unit", typeId: 77917, cmd: "/giveitem 77917 1" },
  { name: "Network Node", typeId: 88092, cmd: "/giveitem 88092 1" },
  { name: "Gatekeeper (Smart Gate)", typeId: 83907, cmd: "/giveitem 83907 1" },
  { name: "Protocol Depot", typeId: 85249, cmd: "/giveitem 85249 1" },
  { name: "Portable Refinery", typeId: 87161, cmd: "/giveitem 87161 1" },
  { name: "Portable Printer", typeId: 87162, cmd: "/giveitem 87162 1" },
  { name: "Common Ore", typeId: 77800, cmd: "/giveitem 77800 100" },
  { name: "Metal Rich Ore", typeId: 77810, cmd: "/giveitem 77810 100" },
  { name: "Salt", typeId: 83839, cmd: "/giveitem 83839 100" },
  { name: "Lens", typeId: 77518, cmd: "/giveitem 77518 10" },
  { name: "Transaction Chip", typeId: 79193, cmd: "/giveitem 79193 10" },
];

const USEFUL_COMMANDS = [
  { cmd: "/moveme", note: "Teleport to another solar system" },
  { cmd: '/giveitem <id> <qty>', note: "Spawn item by type ID" },
  { cmd: '/giveitem "<name>" <qty>', note: "Spawn item by name" },
];

export function GameGuideView() {
  const [steps, setSteps] = useState<Step[]>(() => {
    const saved = localStorage.getItem("game-guide-progress");
    if (saved) {
      const ids: string[] = JSON.parse(saved);
      return INITIAL_STEPS.map(s => ({ ...s, done: ids.includes(s.id) }));
    }
    return INITIAL_STEPS;
  });
  const [copied, setCopied] = useState("");
  const [expandedRef, setExpandedRef] = useState(true);

  const toggle = (id: string) => {
    const next = steps.map(s => s.id === id ? { ...s, done: !s.done } : s);
    setSteps(next);
    localStorage.setItem("game-guide-progress", JSON.stringify(next.filter(s => s.done).map(s => s.id)));
  };

  const copyCmd = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };

  const doneCount = steps.filter(s => s.done).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="font-headline text-[10px] tracking-[0.3em] uppercase text-on-surface-variant/40 mb-1">
          Frontier Survival Manual
        </div>
        <h1 className="font-headline text-2xl font-bold tracking-tight">Game Guide — Deploy Assembly</h1>
        <p className="text-on-surface-variant/60 text-sm mt-2">
          Step-by-step guide to deploy Smart Assemblies on EVE Frontier Utopia sandbox and connect them to your dApp.
        </p>
      </div>

      {/* Progress */}
      <div className="border border-primary/10 bg-surface-low/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-headline text-xs tracking-widest uppercase text-on-surface-variant/50">Progress</span>
          <span className="font-headline text-xs text-primary">{doneCount}/{steps.length}</span>
        </div>
        <div className="w-full h-1.5 bg-surface-high rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div key={step.id} className={`border ${step.done ? "border-green-500/20 bg-green-500/5" : "border-primary/10 bg-surface-low/50"} p-5 space-y-3 transition-colors`}>
            <div className="flex items-start gap-3">
              <button type="button" onClick={() => toggle(step.id)}
                className={`mt-0.5 w-5 h-5 border shrink-0 flex items-center justify-center transition-colors ${step.done ? "border-green-500 bg-green-500/20 text-green-400" : "border-primary/30 hover:border-primary/60"}`}>
                {step.done && <Check size={12} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-headline text-[10px] text-primary/60 tracking-wider">STEP {idx + 1}</span>
                </div>
                <h3 className={`font-headline text-sm uppercase tracking-wider ${step.done ? "text-green-400/80 line-through" : "text-on-surface"}`}>
                  {step.title}
                </h3>
                <p className="text-on-surface-variant/50 text-xs mt-1">{step.description}</p>
              </div>
            </div>

            {step.commands && (
              <div className="ml-8 space-y-1.5">
                {step.commands.map(c => (
                  <div key={c.cmd} className="flex items-center gap-2 bg-background/50 border border-primary/5 px-3 py-2">
                    <Terminal size={12} className="text-primary/40 shrink-0" />
                    <code className="text-xs text-primary font-mono flex-1 truncate">{c.cmd}</code>
                    <span className="text-[10px] text-on-surface-variant/30 shrink-0 hidden sm:block">{c.note}</span>
                    <button type="button" onClick={() => copyCmd(c.cmd, c.cmd)} className="shrink-0 text-on-surface-variant/30 hover:text-primary">
                      {copied === c.cmd ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {step.tips && (
              <ul className="ml-8 space-y-1">
                {step.tips.map(tip => (
                  <li key={tip} className="text-on-surface-variant/40 text-[11px] flex items-start gap-2">
                    <span className="text-primary/30 mt-0.5">›</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Reference: Sandbox Items */}
      <div className="border border-primary/10 bg-surface-low/50">
        <button type="button" onClick={() => setExpandedRef(!expandedRef)}
          className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-on-surface-variant/50" />
            <span className="font-headline text-xs tracking-[0.2em] uppercase text-on-surface-variant/50">Sandbox Item Reference</span>
          </div>
          {expandedRef ? <ChevronDown size={14} className="text-on-surface-variant/30" /> : <ChevronRight size={14} className="text-on-surface-variant/30" />}
        </button>

        {expandedRef && (
          <div className="px-4 pb-4 space-y-4">
            <div className="space-y-1">
              <div className="font-headline text-[10px] text-on-surface-variant/40 tracking-widest uppercase mb-2">Spawn Commands</div>
              {SANDBOX_ITEMS.map(item => (
                <div key={item.typeId} className="flex items-center gap-2 text-xs">
                  <span className="text-on-surface-variant/50 w-40 shrink-0 truncate">{item.name}</span>
                  <code className="text-primary/70 font-mono flex-1 truncate">{item.cmd}</code>
                  <span className="text-on-surface-variant/20 text-[10px] shrink-0">#{item.typeId}</span>
                  <button type="button" onClick={() => copyCmd(item.cmd, `item-${item.typeId}`)} className="shrink-0 text-on-surface-variant/30 hover:text-primary">
                    {copied === `item-${item.typeId}` ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <div className="font-headline text-[10px] text-on-surface-variant/40 tracking-widest uppercase mb-2">Useful Commands</div>
              {USEFUL_COMMANDS.map(c => (
                <div key={c.cmd} className="flex items-center gap-2 text-xs">
                  <code className="text-primary/70 font-mono w-52 shrink-0">{c.cmd}</code>
                  <span className="text-on-surface-variant/40 flex-1">{c.note}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <div className="font-headline text-[10px] text-on-surface-variant/40 tracking-widest uppercase mb-2">Useful Links</div>
              <a href={`${WORLD_API}/v2/smartassemblies`} target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1 hover:underline">
                World API — Smart Assemblies <ExternalLink size={10} />
              </a>
              <a href={`${WORLD_API}/docs/index.html`} target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1 hover:underline">
                World API — Docs <ExternalLink size={10} />
              </a>
              <a href="https://docs.evefrontier.com/troubleshooting/sandbox-access" target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1 hover:underline">
                Sandbox Access Guide <ExternalLink size={10} />
              </a>
              <a href="https://docs.evefrontier.com/tools/resources" target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1 hover:underline">
                Utopia Package IDs <ExternalLink size={10} />
              </a>
              <a href="https://suiscan.xyz/testnet" target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1 hover:underline">
                Sui Testnet Explorer <ExternalLink size={10} />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
