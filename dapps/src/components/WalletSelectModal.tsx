import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useWallets, useDAppKit } from "@mysten/dapp-kit-react";

const CONNECTED_KEY = "eve-dapp-connected";

interface WalletSelectModalProps {
  open: boolean;
  onClose: () => void;
}

const WALLET_META: Record<string, { label: string; icon: string; desc: string }> = {
  "Eve Vault": {
    label: "EVE Vault",
    icon: "/assets/evevault-wallet.png",
    desc: "EVE Frontier native wallet",
  },
  "EVE Frontier Client Wallet": {
    label: "EVE Frontier Client",
    icon: "/assets/lorelock-transparent.png",
    desc: "In-game client wallet",
  },
  Slush: {
    label: "Slush",
    icon: "/assets/slush-white.png",
    desc: "Slush wallet for Sui",
  },
};

export function WalletSelectModal({ open, onClose }: WalletSelectModalProps) {
  const wallets = useWallets();
  const { connectWallet } = useDAppKit();

  if (!open) return null;

  const handleSelect = async (wallet: (typeof wallets)[number]) => {
    try {
      await connectWallet({ wallet });
      localStorage.setItem(CONNECTED_KEY, "true");
      onClose();
    } catch (err) {
      console.error("Failed to connect:", err);
    }
  };

  // Sort: EVE Vault first, then Slush, then others
  const sorted = [...wallets].sort((a, b) => {
    const order = (w: typeof a) => {
      if (w.name.includes("Eve Vault") || w.name.includes("EVE Frontier")) return 0;
      if (w.name.toLowerCase().includes("slush")) return 1;
      return 2;
    };
    return order(a) - order(b);
  });

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center">
      {/* Backdrop */}
      <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default" onClick={onClose} onKeyDown={(e) => e.key === "Escape" && onClose()} aria-label="Close modal" />

      {/* Modal */}
      <div className="relative bg-surface border border-primary/20 shadow-[0_0_30px_rgba(0,242,255,0.1)] w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/10">
          <div>
            <div className="font-headline text-sm font-bold tracking-tight uppercase">Connect Wallet</div>
            <div className="font-headline text-[10px] text-on-surface-variant/50 tracking-widest uppercase mt-0.5">
              Select provider
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-primary/10 transition-colors text-on-surface-variant/50 hover:text-primary">
            <X size={18} />
          </button>
        </div>

        {/* Wallet List */}
        <div className="p-4 space-y-2">
          {sorted.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <div className="text-on-surface-variant/40 font-headline text-xs uppercase tracking-widest">
                No wallets detected
              </div>
              <div className="text-on-surface-variant/30 text-xs">
                Install EVE Vault or Slush to continue
              </div>
            </div>
          ) : (
            sorted.map((wallet) => {
              const meta = Object.entries(WALLET_META).find(([key]) => wallet.name.includes(key));
              const label = meta?.[1]?.label || wallet.name;
              const desc = meta?.[1]?.desc || "Sui wallet";
              const icon = meta?.[1]?.icon;

              return (
                <button
                  type="button"
                  key={wallet.name}
                  onClick={() => handleSelect(wallet)}
                  className="w-full flex items-center gap-4 px-4 py-3 border border-primary/10 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <div className="w-10 h-10 border border-primary/20 bg-surface-low flex items-center justify-center shrink-0 overflow-hidden">
                    {icon ? (
                      <img src={icon} alt={label} className="w-6 h-6 object-contain" />
                    ) : (
                      <div className="w-6 h-6 bg-primary/20 rounded-full" />
                    )}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-headline text-xs tracking-wider uppercase group-hover:text-primary transition-colors">
                      {label}
                    </div>
                    <div className="text-[10px] text-on-surface-variant/40 tracking-wide">{desc}</div>
                  </div>
                  <div className="w-2 h-2 border border-primary/30 group-hover:bg-primary/50 transition-colors shrink-0" />
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-primary/10">
          <div className="text-[9px] font-headline text-on-surface-variant/30 tracking-widest uppercase text-center">
            Powered by Sui • EVE Frontier
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
