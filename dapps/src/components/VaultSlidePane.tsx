import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { abbreviateAddress } from "@evefrontier/dapp-kit";
import {
  Shield,
  Clock,
  Heart,
  Plus,
  Download,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useVaultData } from "@/vault/useVaultData";
import { VAULT_CONFIG, MODE_LABELS } from "@/vault/config";
import { Link } from "react-router";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#2D2D3F] bg-[#0A0A0F]/60 p-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#2D2D3F]"
        style={{ color }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[#94A3B8]">{label}</p>
        <p className="truncate text-sm font-semibold text-[#E2E8F0]">
          {value}
        </p>
      </div>
    </div>
  );
}
