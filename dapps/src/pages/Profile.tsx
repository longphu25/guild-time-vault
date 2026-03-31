import { useState } from "react";
import {
  User,
  Wallet,
  Shield,
  Globe,
  Database,
  Activity,
  Copy,
  Check,
  ExternalLink,
  Cpu,
  Link2,
} from "lucide-react";
import { useCurrentAccount, useWallets } from "@mysten/dapp-kit-react";
import {
  useConnection,
  useSmartObject,
  getEveWorldPackageId,
  getSuiGraphqlEndpoint,
  abbreviateAddress,
  getWalletCharacters,
  getOwnedObjectsByType,
} from "@evefrontier/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { useVault } from "@/hooks/use-vault";
import { TYPES } from "@/lib/contract";
import { vaultConfig } from "@/lib/vault-config";

function copy(text: string, setCopied: (v: string) => void, key: string) {
  navigator.clipboard.writeText(text);
  setCopied(key);
  setTimeout(() => setCopied(""), 1500);
}

export function ProfileView() {
  const [copied, setCopied] = useState("");

  // dapp-kit hooks
  const account = useCurrentAccount();
  const wallets = useWallets();
  const { isConnected, hasEveVault, walletAddress, handleConnect, handleDisconnect } = useConnection();
  const { assembly, assemblyOwner, tenant, loading: assemblyLoading, error: assemblyError } = useSmartObject();

  // vault hook
  const { vault, vaultId, capsules, heartbeat, role, memberCapId, officerCapId, heartbeatId } = useVault();

  // Query wallet characters via PlayerProfile → Character (using RPC)
  const characterQuery = useQuery({
    queryKey: ["playerCharacter", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;

      // 1. Find PlayerProfile via JSON-RPC (bypass type filter issues)
      const res = await fetch("https://fullnode.testnet.sui.io:443", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1,
          method: "suix_getOwnedObjects",
          params: [walletAddress, { filter: { MatchAll: [] }, options: { showType: true, showContent: true } }, null, 50],
        }),
      });
      const data = await res.json();
      const objects = data?.result?.data ?? [];

      // Find PlayerProfile
      const profile = objects.find((o: Record<string, unknown>) => {
        const t = (o as { data?: { type?: string } }).data?.type ?? "";
        return t.includes("::character::PlayerProfile");
      });
      if (!profile) return null;

      const profileFields = (profile as { data?: { content?: { fields?: Record<string, string> }; objectId?: string } }).data?.content?.fields;
      const profileId = (profile as { data?: { objectId?: string } }).data?.objectId ?? "";
      const characterId = profileFields?.character_id;
      if (!characterId) return null;

      // 2. Fetch Character shared object
      const charRes = await fetch("https://fullnode.testnet.sui.io:443", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 2,
          method: "sui_getObject",
          params: [characterId, { showContent: true }],
        }),
      });
      const charData = await charRes.json();
      const charFields = charData?.result?.data?.content?.fields as Record<string, unknown> | undefined;

      // Extract metadata (nested struct with fields)
      const metaRaw = charFields?.metadata as Record<string, unknown> | undefined;
      const meta = (metaRaw?.fields ?? metaRaw) as Record<string, string> | undefined;
      const keyRaw = charFields?.key as Record<string, unknown> | undefined;
      const key = (keyRaw?.fields ?? keyRaw) as Record<string, string> | undefined;

      return {
        profileId,
        characterId,
        name: meta?.name || null,
        description: meta?.description || null,
        url: meta?.url || null,
        tribeId: charFields?.tribe_id as string | undefined,
        characterAddress: charFields?.character_address as string | undefined,
        tenant: key?.tenant || null,
      };
    },
    enabled: !!walletAddress,
    staleTime: 60_000,
  });

  // Query wallet characters (all OwnerCap<Character>)
  const charactersQuery = useQuery({
    queryKey: ["walletCharacters", walletAddress],
    queryFn: () => getWalletCharacters(walletAddress ?? ""),
    enabled: !!walletAddress,
    staleTime: 60_000,
  });

  // Query owned vault objects
  const ownedVaultsQuery = useQuery({
    queryKey: ["ownedVaultObjects", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const [officers, members, heartbeats] = await Promise.all([
        getOwnedObjectsByType(walletAddress, TYPES.officerCap),
        getOwnedObjectsByType(walletAddress, TYPES.memberCap),
        getOwnedObjectsByType(walletAddress, TYPES.heartbeat),
      ]);
      return { officers, members, heartbeats };
    },
    enabled: !!walletAddress,
    staleTime: 60_000,
  });

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="border border-primary/20 bg-surface-low/50 p-8 max-w-md text-center space-y-4">
          <User size={32} className="text-primary/40 mx-auto" />
          <div className="font-headline text-sm uppercase tracking-wider text-on-surface-variant/60">
            Wallet Not Connected
          </div>
          <button type="button" onClick={handleConnect} className="px-6 py-2 border border-primary/30 text-primary font-headline text-xs uppercase tracking-wider hover:bg-primary/10 transition-colors">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="font-headline text-[10px] tracking-[0.3em] uppercase text-on-surface-variant/40 mb-1">
          Pilot Profile
        </div>
        <h1 className="font-headline text-2xl font-bold tracking-tight">
          {characterQuery.data?.name || assemblyOwner?.name || abbreviateAddress(walletAddress || "")}
        </h1>
      </div>

      {/* Block 1: Wallet Connection */}
      <Block icon={<Wallet size={14} />} title="Wallet Connection">
        <Row label="Status" value={isConnected ? "Connected" : "Disconnected"} />
        <Row label="Address" value={walletAddress || "—"} copyable copied={copied} setCopied={setCopied} copyKey="addr" />
        <Row label="EVE Vault" value={hasEveVault ? "Detected" : "Not Found"} />
        <Row label="Wallet Name" value={account?.label || wallets.find(w => w.accounts.some(a => a.address === walletAddress))?.name || "Unknown"} />
        <Row label="Available Wallets" value={wallets.map(w => w.name).join(", ") || "None"} />
        {walletAddress && (
          <div className="pt-2">
            <a href={`https://suiscan.xyz/testnet/account/${walletAddress}`} target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1 hover:underline">
              View on Explorer <ExternalLink size={10} />
            </a>
          </div>
        )}
      </Block>

      {/* Block 2: EVE Frontier Config */}
      <Block icon={<Globe size={14} />} title="EVE Frontier Config">
        <Row label="Tenant" value={tenant || "—"} />
        <Row label="World Package" value={getEveWorldPackageId() || "Not set"} copyable copied={copied} setCopied={setCopied} copyKey="world" />
        <Row label="GraphQL" value={getSuiGraphqlEndpoint() || "—"} />
        <Row label="Vault Package" value={vaultConfig.packageId || "Not set"} copyable copied={copied} setCopied={setCopied} copyKey="vpkg" />
        <Row label="Registry ID" value={vaultConfig.registryId || "Not set"} copyable copied={copied} setCopied={setCopied} copyKey="reg" />
      </Block>

      {/* Block 3: Character Info (from PlayerProfile → Character) */}
      <Block icon={<User size={14} />} title="EVE Frontier Character">
        {characterQuery.isLoading ? (
          <div className="text-on-surface-variant/40 text-xs">Querying PlayerProfile...</div>
        ) : characterQuery.data ? (
          <>
            {characterQuery.data.name && <Row label="Name" value={characterQuery.data.name} />}
            {characterQuery.data.tenant && <Row label="Tenant" value={characterQuery.data.tenant} />}
            {characterQuery.data.tribeId && <Row label="Tribe ID" value={characterQuery.data.tribeId} />}
            <Row label="Character ID" value={characterQuery.data.characterId} copyable copied={copied} setCopied={setCopied} copyKey="charId" />
            <Row label="Profile ID" value={characterQuery.data.profileId} copyable copied={copied} setCopied={setCopied} copyKey="profId" />
            {characterQuery.data.characterAddress && <Row label="Char Address" value={characterQuery.data.characterAddress} copyable copied={copied} setCopied={setCopied} copyKey="cAddr" />}
            {characterQuery.data.description && <Row label="Description" value={characterQuery.data.description} />}
            {characterQuery.data.url && <Row label="URL" value={characterQuery.data.url} />}
          </>
        ) : (
          <div className="text-on-surface-variant/40 text-xs">
            No PlayerProfile found — create a character in EVE Frontier game first
          </div>
        )}
      </Block>

      {/* Block 4: Wallet Characters (GraphQL) */}
      <Block icon={<Shield size={14} />} title="Wallet Characters (GraphQL)">
        {charactersQuery.isLoading ? (
          <div className="text-on-surface-variant/40 text-xs">Querying...</div>
        ) : charactersQuery.data?.data?.address?.objects?.nodes?.length ? (
          charactersQuery.data.data.address.objects.nodes.map((node: Record<string, unknown>, i: number) => {
            const moveObj = node.asMoveObject as Record<string, unknown> | undefined;
            const contents = moveObj?.contents as Record<string, unknown> | undefined;
            const json = contents?.json as Record<string, unknown> | undefined;
            const addr = node.address as string;
            return (
              <div key={addr || `char-${i}`} className="border-b border-primary/5 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                <Row label="Object" value={addr} copyable copied={copied} setCopied={setCopied} copyKey={`char${addr}`} />
                {json?.name && <Row label="Name" value={String(json.name)} />}
                {json?.tribe_id && <Row label="Tribe" value={String(json.tribe_id)} />}
              </div>
            );
          })
        ) : (
          <div className="text-on-surface-variant/40 text-xs">No characters found for this wallet</div>
        )}
      </Block>

      {/* Block 5: Smart Assembly */}
      <Block icon={<Cpu size={14} />} title="Smart Assembly (useSmartObject)">
        {assemblyLoading ? (
          <div className="text-on-surface-variant/40 text-xs">Loading...</div>
        ) : assembly ? (
          <>
            <Row label="Name" value={assembly.name || "—"} />
            <Row label="Type" value={assembly.type} />
            <Row label="State" value={assembly.state} />
            <Row label="Object ID" value={assembly.id} copyable copied={copied} setCopied={setCopied} copyKey="asmId" />
            <Row label="Type ID" value={String(assembly.typeId)} />
            <Row label="Item ID" value={String(assembly.item_id)} />
            {assembly.description && <Row label="Description" value={assembly.description} />}
            {assembly.dappURL && <Row label="dApp URL" value={assembly.dappURL} />}
            {assembly.solarSystem && <Row label="Solar System" value={assembly.solarSystem.name} />}
            {assembly.energySourceId && <Row label="Energy Source" value={assembly.energySourceId} />}
            <Row label="Energy Usage" value={String(assembly.energyUsage ?? 0)} />
            {assembly.typeDetails && (
              <>
                <Row label="Category" value={assembly.typeDetails.categoryName} />
                <Row label="Group" value={assembly.typeDetails.groupName} />
              </>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <div className="text-on-surface-variant/40 text-xs">
              {assemblyError || "No assembly loaded via useSmartObject()"}
            </div>
            <div className="text-on-surface-variant/30 text-[10px] space-y-1">
              <p>useSmartObject() requires one of:</p>
              <p>• <code className="text-primary/60 bg-primary/5 px-1">VITE_OBJECT_ID</code> in .env (Sui object ID of an assembly)</p>
              <p>• <code className="text-primary/60 bg-primary/5 px-1">?itemId=&lt;game_item_id&gt;&amp;tenant=utopia</code> in URL</p>
              <p className="pt-1">You need to deploy a Smart Storage Unit, Gate, or Turret in-game first.</p>
            </div>
            {characterQuery.data?.characterId && (
              <div className="pt-2 text-on-surface-variant/40 text-[10px]">
                Your character <span className="text-primary">{characterQuery.data.name || "—"}</span> has no OwnerCap for any assembly. Deploy a structure in EVE Frontier to get one.
              </div>
            )}
          </div>
        )}
      </Block>

      {/* Block 6: Guild Vault */}
      <Block icon={<Database size={14} />} title="Guild Time Vault">
        {vault ? (
          <>
            <Row label="Vault ID" value={vaultId || "—"} copyable copied={copied} setCopied={setCopied} copyKey="vaultId" />
            <Row label="Guild ID" value={vault.guild_id} copyable copied={copied} setCopied={setCopied} copyKey="guildId" />
            <Row label="Capsule Count" value={String(vault.next_capsule_id)} />
            <Row label="Claimed" value={String(capsules.filter(c => c.claimed).length)} />
            <Row label="Pending" value={String(capsules.filter(c => !c.claimed).length)} />
            <Row label="Your Role" value={role} />
            {memberCapId && <Row label="MemberCap" value={memberCapId} copyable copied={copied} setCopied={setCopied} copyKey="mcap" />}
            {officerCapId && <Row label="OfficerCap" value={officerCapId} copyable copied={copied} setCopied={setCopied} copyKey="ocap" />}
          </>
        ) : (
          <div className="text-on-surface-variant/40 text-xs">No vault found — init one or connect wallet with vault access</div>
        )}
      </Block>

      {/* Block 7: Heartbeat */}
      <Block icon={<Activity size={14} />} title="Heartbeat (Dead Man Switch)">
        {heartbeat ? (
          <>
            <Row label="Heartbeat ID" value={heartbeatId || heartbeat.id} copyable copied={copied} setCopied={setCopied} copyKey="hbId" />
            <Row label="Vault ID" value={heartbeat.vault_id} />
            <Row label="Last Ping" value={new Date(heartbeat.last_ping_ms).toLocaleString()} />
            <Row label="Timeout" value={`${(heartbeat.timeout_ms / 86400000).toFixed(1)} days`} />
            <Row label="Deadline" value={new Date(heartbeat.last_ping_ms + heartbeat.timeout_ms).toLocaleString()} />
            <Row label="Status" value={Date.now() < heartbeat.last_ping_ms + heartbeat.timeout_ms ? "✅ Alive" : "❌ Timed Out"} />
          </>
        ) : (
          <div className="text-on-surface-variant/40 text-xs">No heartbeat detected</div>
        )}
      </Block>

      {/* Block 8: Owned Vault Objects */}
      <Block icon={<Link2 size={14} />} title="Owned Vault Objects (on-chain)">
        {ownedVaultsQuery.isLoading ? (
          <div className="text-on-surface-variant/40 text-xs">Querying...</div>
        ) : ownedVaultsQuery.data ? (
          <>
            <Row label="OfficerCaps" value={String(ownedVaultsQuery.data.officers?.data?.address?.objects?.nodes?.length ?? 0)} />
            <Row label="MemberCaps" value={String(ownedVaultsQuery.data.members?.data?.address?.objects?.nodes?.length ?? 0)} />
            <Row label="Heartbeats" value={String(ownedVaultsQuery.data.heartbeats?.data?.address?.objects?.nodes?.length ?? 0)} />
          </>
        ) : (
          <div className="text-on-surface-variant/40 text-xs">No data</div>
        )}
      </Block>

      {/* Disconnect */}
      <div className="pt-4">
        <button type="button" onClick={handleDisconnect} className="px-6 py-2 border border-red-500/30 text-red-400 font-headline text-xs uppercase tracking-wider hover:bg-red-500/10 transition-colors">
          Disconnect Wallet
        </button>
      </div>
    </div>
  );
}


function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-primary/10 bg-surface-low/50 p-6 space-y-3">
      <div className="font-headline text-xs tracking-[0.2em] uppercase text-on-surface-variant/50 border-b border-primary/10 pb-3 flex items-center gap-2">
        {icon} {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value, copyable, copied, setCopied, copyKey }: {
  label: string;
  value: string;
  copyable?: boolean;
  copied?: string;
  setCopied?: (v: string) => void;
  copyKey?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="font-headline text-[10px] tracking-widest uppercase text-on-surface-variant/40 w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-on-surface/80 truncate flex-1 font-mono">{value}</span>
      {copyable && setCopied && copyKey && (
        <button type="button" onClick={() => copy(value, setCopied, copyKey)} className="shrink-0 text-on-surface-variant/40 hover:text-primary transition-colors">
          {copied === copyKey ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
      )}
    </div>
  );
}
