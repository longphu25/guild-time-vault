# LoreLock – Landing Page Mock

## Hero section

**Title**  
LoreLock – Time‑Locked Guild Vault for EVE Frontier

**Subtitle**  
Secure your guild’s secrets, stories, and assets with time‑locked capsules powered by Sui, Walrus, and Seal.

**Primary CTA**  
- [Launch dApp]  
- [View Docs]

**Secondary CTA**  
- [Hackathon Demo]  
- [GitHub]

**Hero highlights (3 bullets)**  
- Time‑locked capsules for guild archives, inheritances, and dead man’s switches.  
- End‑to‑end encryption via Seal, large‑scale storage on Walrus, verification on Sui. [learn.backpack](https://learn.backpack.exchange/articles/what-is-walrus-a-programmable-decentralized-storage-network)
- Built as a Smart Assembly mod for EVE Frontier’s autonomous world. [support.evefrontier](https://support.evefrontier.com/hc/en-us/articles/19355304547228-Smart-Assembly)

***

## Problem / Pain points

**Block title**  
Why guilds need a LoreLock

**Copy (short paragraphs + bullets)**  
- EVE Frontier guilds run long‑term operations, complex bases, and player‑driven politics – but secrets and knowledge still live in Discord, Google Docs, and DMs. [dev](https://dev.to/q9/getting-started-with-smart-infrastructure-in-eve-frontier-45n4)
- When leaders burn out or go AFK, assets get stranded, and institutional memory disappears.  

Bullets:  
- No native way to time‑lock knowledge or instructions for future leaders.  
- No on‑chain dead man’s switch for guild power and assets.  
- No shared, verifiable archive of a guild’s history and lore inside the world itself.

***

## Value proposition

**Block title**  
What LoreLock does

Three columns:

1. **Time‑Locked Capsules**  
   - Store messages, lore, or instructions that unlock at a specific time or condition.  
   - Perfect for archives, long‑term plans, and story reveals.

2. **Guild‑Scoped Access Control**  
   - Only members/officers with the right capabilities can see and open capsules.  
   - Roles are enforced on‑chain with Sui’s object‑centric, capability‑based model. [docs.sui](https://docs.sui.io/guides/developer/objects/object-model)

3. **Secure by Design**  
   - Content is encrypted with Seal, stored as blobs on Walrus, and referenced on Sui.  
   - No plaintext secrets on‑chain, no centralized key custodian. [walrus](https://www.walrus.xyz/blog/how-walrus-blob-storage-works)

***

## How it works – Encryption, storage, and on‑chain logic

**Block title**  
Under the hood: Seal × Walrus × Sui

Use a 3‑step visual (e.g. numbered cards or horizontal timeline).

**Step 1 – Encrypt with Seal**  
- The dApp uses the Seal SDK to encrypt capsule content (text, JSON, files) on the client. [seal.mystenlabs](https://seal.mystenlabs.com/how-it-works)
- On‑chain policies in LoreLock define **who can decrypt** and **under what conditions** (role, time‑lock, dead man’s switch). [cointrust](https://www.cointrust.com/market-news/mysten-labs-debuts-seal-to-close-blockchains-privacy-gap)
- Seal key servers only release decryption material when these on‑chain rules are satisfied (policy‑based, threshold encryption). [linkedin](https://www.linkedin.com/posts/cryptonewsmax_mysten-labs-tests-seal-for-web3-data-security-activity-7314296888810217472-n40w)

**Step 2 – Store encrypted data on Walrus**  
- The encrypted payload is stored as a **blob** on Walrus, Sui’s programmable decentralized storage network. [gate](https://www.gate.com/learn/articles/wal-walrus-revolutionizing-decentralized-data-storage-on-the-sui-network/7733)
- Each blob gets a **Blob ID** and a Sui object with metadata and a Proof‑of‑Availability certificate. [binance](https://www.binance.com/ar-BH/square/post/35620403280154)
- This keeps large content (lore, plans, attachments) off the main chain but still verifiable and programmable.

**Step 3 – Anchor metadata and logic on Sui**  
- LoreLock’s Move contracts store only small metadata on Sui:
  - `walrus_blob_id`  
  - `seal_policy_id`  
  - mode, unlock time, guild id, claimed flag, etc.  
- Time‑locks use Sui’s `Clock` to check on‑chain time; capabilities gate guild roles; events power indexing and analytics. [move-book](https://move-book.com/programmability/epoch-and-time/)
- When a player opens a capsule:
  - LoreLock validates time + role, marks it claimed,  
  - client fetches blob from Walrus,  
  - Seal verifies policy and decrypts the content for that user only.

Optional mini‑diagram (text description for designer):  
- Box “Player” → arrow “Seal Encrypt” → box “Encrypted Blob” on Walrus  
- Arrow from Walrus + “LoreLock Contract” box → “On‑chain Metadata (Sui)”  
- Arrow “Open Capsule” → contract OK → Walrus fetch → Seal Decrypt → “Plaintext to Player”

***

## Core features (MVP)

**Block title**  
MVP features at a glance

Two‑column checklist.

**Column 1 – Guild & roles**  
- Guild‑scoped vault (LoreLock Guild Vault Smart Assembly).  
- Member and officer roles via Sui capability objects.  
- Role‑aware UI and capsule visibility.

**Column 2 – Capsules & time‑locks**  
- ARCHIVE: unlock lore and records after a date.  
- PRIVATE INHERIT: one‑to‑one inheritance for a specific member.  
- DEAD MAN: dead man’s switch backed by heartbeat + timeout.  
- Event log and timeline for every capsule (created, claimed, triggered).

***

## EVE Frontier World integration – Next phase

**Block title**  
Phase 2: Deeper into the World

Short intro:  
EVE Frontier’s Smart Assemblies let players mod Smart Storage, Turrets, and Gates to create new in‑world infrastructure: marketplaces, mission boards, defenses, and more. [youtube](https://www.youtube.com/watch?v=lTrn1oFWg7I)

Grid of “Next phase” feature cards:

1. **Smart Storage‑Linked Vaults**  
   - Bind LoreLock capsules directly to specific Smart Storage Units.  
   - Unlock or transfer **real in‑game items** when a capsule opens (using world contracts & assembly witnesses).  
   - Example: a time‑locked cache of fuel or ship modules for future guild cycles. [support.evefrontier](https://support.evefrontier.com/hc/en-us/articles/19355304547228-Smart-Assembly)

2. **Quest & Treasure Hunt Smart Assemblies**  
   - Turn LoreLock into a quest giver: capsules reveal coordinates, passwords, or routing instructions tied to Smart Gates and structures.  
   - Use events and Walrus content for multi‑step treasure hunts spanning multiple systems.

3. **Civic Infrastructure for Settlements**  
   - Civic charters, tax agreements, and defense policies stored as encrypted lore capsules.  
   - Auto‑reveal or auto‑transfer governance rights at cycle boundaries or when conditions are met (e.g., dead man on a governor key).

4. **Base Defense & Access Scripts**  
   - Combine LoreLock with Smart Turrets and Gates:  
     - Turret configurations or gate whitelists encoded in capsules.  
     - Capsule opening triggers configuration changes or access updates at the infrastructure layer. [dev](https://dev.to/q9/getting-started-with-smart-infrastructure-in-eve-frontier-45n4)

5. **World‑Level Archives**  
   - Public, verifiable archives of major wars, migrations, or megaprojects.  
   - LoreLock capsules curated at world or alliance level, indexed into a “Galactic Chronicle” explorer.

***

## For builders & judges

**Block title**  
Why LoreLock matters for the hackathon

Bullets oriented to hackathon jury:

- **Toolkit for Civilization** – LoreLock is an infrastructure primitive for governance, succession, and memory in an autonomous world. [blog.sui](https://blog.sui.io/ccp-games-eve-frontier-hackathon/)
- **Showcases Sui** – object‑centric contracts, on‑chain time, capabilities, Walrus programmable storage, and Seal policy‑based encryption in one coherent system. [github](https://github.com/MystenLabs/seal/blob/main/README.md)
- **Plays well with Smart Assemblies** – designed to sit on top of Smart Storage and other assemblies as the “lore & secrets layer” for guilds. [youtube](https://www.youtube.com/watch?v=lTrn1oFWg7I)

CTA row:  
- [View Technical Architecture]  
- [Read Move Contracts]  
- [Try the Demo]

***

## Footer

- Short project description: “LoreLock – time‑locked guild vault for EVE Frontier, built on Sui.”  
- Links: GitHub, Docs, Discord/Telegram, X, Hackathon page.