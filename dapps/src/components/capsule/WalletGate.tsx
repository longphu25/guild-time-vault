import { Lock, Wallet } from "lucide-react";
import { useConnection } from "@evefrontier/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import type { ReactNode } from "react";

export function WalletGate({ children, message }: { children: ReactNode; message: string }) {
  const { handleConnect } = useConnection();
  const account = useCurrentAccount();

  if (account) return <>{children}</>;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#2b2827]/80 backdrop-blur-md border border-[#3c3836] rounded-lg p-8 text-center">
        <Lock className="w-16 h-16 text-[#c64f05] mx-auto mb-4" />
        <h2 className="text-2xl font-heading text-[#ffffd6] mb-4">Connect Your Wallet</h2>
        <p className="text-[#94A3B8] mb-6">{message}</p>
        <button
          onClick={handleConnect}
          className="w-full px-6 py-3 bg-[#c64f05] text-[#130904] rounded-lg hover:drop-shadow-[0_0_20px_rgba(198,79,5,0.8)] transition-all flex items-center justify-center gap-2"
        >
          <Wallet className="w-5 h-5" />
          Connect EVE Vault
        </button>
      </div>
    </div>
  );
}
