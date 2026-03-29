import { Wallet, Copy, Check, LogOut } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { abbreviateAddress, useConnection } from "@evefrontier/dapp-kit";
import { useVault } from "@/hooks/use-vault";
import { useCurrentAccount } from "@mysten/dapp-kit-react";

const navItems = [
  { path: "/", label: "Guilds" },
  { path: "/vault", label: "Vault" },
  { path: "/create", label: "Create" },
  { path: "/members", label: "Members" },
  { path: "/heartbeat", label: "Heartbeat" },
];

export function TopBar() {
  const location = useLocation();
  const { handleConnect, handleDisconnect } = useConnection();
  const account = useCurrentAccount();
  const { role } = useVault();
  const [copied, setCopied] = useState(false);

  const copyAddr = () => {
    if (!account) return;
    navigator.clipboard.writeText(account.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-primary/20 shadow-[0_0_15px_rgba(0,242,255,0.1)] flex justify-between items-center px-6 py-3">
      <div className="flex items-center gap-8">
        <Link to="/" className="text-xl font-black text-primary tracking-tighter font-headline">VAULT_FRONTIER</Link>
        <nav className="hidden md:flex gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`font-headline uppercase tracking-widest text-xs transition-all duration-300 pb-1 border-b-2 ${
                location.pathname === item.path
                  ? "text-primary border-primary"
                  : "text-on-surface-variant/50 border-transparent hover:text-primary/70"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {account ? (
          <>
            <button onClick={copyAddr} className="flex flex-col items-start cursor-pointer hover:opacity-80 transition-opacity">
              <span className="font-headline text-[10px] tracking-widest text-secondary uppercase opacity-70">{role.toUpperCase()}</span>
              <span className="font-mono text-xs text-on-surface-variant flex items-center gap-1">
                {abbreviateAddress(account.address)}
                {copied ? <Check size={10} className="text-tertiary" /> : <Copy size={10} className="opacity-40" />}
              </span>
            </button>
            <button onClick={handleDisconnect} className="p-2 hover:bg-primary/10 transition-all text-primary">
              <LogOut size={20} />
            </button>
          </>
        ) : (
          <button onClick={handleConnect} className="px-4 py-2 border border-primary/40 text-primary font-headline text-xs tracking-widest hover:bg-primary/10 transition-all flex items-center gap-2">
            <Wallet size={16} /> CONNECT
          </button>
        )}
      </div>
    </header>
  );
}
