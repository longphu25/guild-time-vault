import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Clock, Menu, X, Wallet } from "lucide-react";
import { abbreviateAddress, useConnection } from "@evefrontier/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit-react";

const navLinks = [
  { path: "/", label: "Home" },
  { path: "/create", label: "Create" },
  { path: "/timeline", label: "Timeline" },
  { path: "/my-capsules", label: "My Capsules" },
  { path: "/archive", label: "Archive" },
  { path: "/admin", label: "Admin" },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { handleConnect, handleDisconnect } = useConnection();
  const account = useCurrentAccount();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[#0A0A0F]/80 border-b border-[#2D2D3F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <Clock className="w-6 h-6 text-[#00F0FF] group-hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.8)] transition-all" />
            <span className="text-xl font-heading text-[#E2E8F0] group-hover:text-[#00F0FF] transition-colors">
              Time Capsule
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm transition-all ${
                  isActive(link.path)
                    ? "text-[#00F0FF] drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]"
                    : "text-[#94A3B8] hover:text-[#E2E8F0]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:block">
            {account ? (
              <div className="flex items-center gap-2">
                <div className="px-4 py-2 bg-[#1A1A2E]/50 border border-[#00F0FF]/30 rounded-lg text-sm text-[#00F0FF] font-mono">
                  {abbreviateAddress(account.address)}
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-transparent border border-[#2D2D3F] rounded-lg text-sm text-[#94A3B8] hover:text-[#E2E8F0] hover:border-[#00F0FF]/30 transition-all"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="px-4 py-2 bg-transparent border border-[#00F0FF] rounded-lg text-sm text-[#00F0FF] hover:bg-[#00F0FF]/10 hover:drop-shadow-[0_0_12px_rgba(0,240,255,0.6)] transition-all flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                Connect EVE Vault
              </button>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[#E2E8F0] hover:text-[#00F0FF] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0D1117] border-t border-[#2D2D3F]">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 text-sm transition-all ${
                  isActive(link.path) ? "text-[#00F0FF]" : "text-[#94A3B8] hover:text-[#E2E8F0]"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-[#2D2D3F]">
              {account ? (
                <>
                  <div className="px-4 py-2 mb-2 bg-[#1A1A2E]/50 border border-[#00F0FF]/30 rounded-lg text-sm text-[#00F0FF] font-mono text-center">
                    {abbreviateAddress(account.address)}
                  </div>
                  <button
                    onClick={() => { handleDisconnect(); setMobileMenuOpen(false); }}
                    className="w-full px-4 py-2 bg-transparent border border-[#2D2D3F] rounded-lg text-sm text-[#94A3B8] hover:text-[#E2E8F0] transition-all"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { handleConnect(); setMobileMenuOpen(false); }}
                  className="w-full px-4 py-2 bg-transparent border border-[#00F0FF] rounded-lg text-sm text-[#00F0FF] hover:bg-[#00F0FF]/10 transition-all flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  Connect EVE Vault
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
