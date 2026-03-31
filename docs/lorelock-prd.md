# LoreLock – Product Requirements Document (PRD)

## 1. Product Overview

**One‑liner**  
LoreLock is a Guild Vault Smart Assembly attached to in‑game storage that lets guilds create time‑locked capsules containing assets and secrets. Only authorized members can see and use them, with built‑in support for treasure hunts, inheritances, and dead man’s switches.

**Hackathon context**  
The EVE Frontier × Sui Hackathon 2026 focuses on building mods and tools as a "toolkit for civilization", encouraging players to create new social and economic infrastructure on top of Smart Assemblies and Sui.[web:18][web:15][web:139]  
Existing Smart Assemblies (Smart Storage Unit, Smart Turret, Smart Gate, etc.) allow you to plug in smart contracts to become marketplaces, quest givers, bounty boards, and more. LoreLock is one such infrastructure layer, focused on managing guild assets and secrets.[web:56][web:135]

## 2. Problem Statement

Guilds in EVE Frontier currently lack an on‑chain tool to:

- Store secrets, strategies, and internal documents in a durable way with access control.  
- Apply time‑locks to information and assets (e.g., wills, treasure chests that open in the future).  
- Implement dead man’s switches to protect guild assets if leaders/officers disappear.  
- Build a living archive of the guild’s or civilization’s history inside the shared universe.[web:128][web:132]

Smart Storage today mainly holds resources/items without a role‑based access layer, time‑locks, or off‑chain encryption.

## 3. Product Goals & Non‑Goals

### 3.1 Goals

1. Provide a **LoreLock Guild Vault Smart Assembly** with clear member/officer role separation on Sui using the capability pattern (no hard‑coded address lists).[web:113][web:121]  
2. Support creating **time‑locked capsules** tied to a guild, with modes:
   - Guild archive (readable by members/officers after a given time).  
   - Private inheritance (single designated beneficiary).  
   - Dead man’s switch for guild assets/knowledge.  
   - (Time‑permitting) Public treasure hunt.  
3. Store secret content (messages, files, hints, lore) on **Walrus** to optimize cost, durability, and size, while keeping only small metadata on‑chain.[web:103][web:110][web:101]  
4. Protect data using **Seal** (client‑side encryption + on‑chain access control) so only users who satisfy the policy/role can decrypt.[web:102][web:95][web:109]  
5. Integrate correctly with **EVE Frontier World / world‑contracts** and Smart Assemblies: LoreLock attaches to storage/guild structures and does not break economic invariants or resource flows of the World.[web:48][web:52][web:16]

### 3.2 Non‑Goals (Hackathon Scope)

- Not a full guild management system (registration, diplomacy, tax, etc.).  
- Not a full document management solution (search, versioning, complex ACLs).  
- No deep changes to CCP’s in‑game UI; only a minimal web dApp plus necessary Smart Assembly integration.

## 4. Target Users & Personas

- **Guild Leader / Founder**  
  - Needs: protect guild assets and secrets, set up inheritance paths, control who sees what and when.  
- **Guild Officer**  
  - Needs: operate the secret vault, create events (treasure hunts), update the archive, take over if the leader is absent.  
- **Guild Member**  
  - Needs: participate in guild content, read lore, receive rewards/inheritances, solve puzzles.  
- **Community Builder / RP Player**  
  - Needs: record the history of a base/guild/civilization and create long‑term narratives in the universe.[web:132][web:5]

## 5. Key Use Cases

1. **Guild Secret Vault**  
   - Leader initializes a LoreLock Guild Vault bound to a Smart Storage/structure.  
   - Leader/Officer grants `GuildMemberCap` / `GuildOfficerCap` to on‑chain addresses that represent guild characters.[web:113][web:116][web:121]  
   - The vault UI shows only the capsules/slots appropriate for each role (members see level‑0 slots; officers see higher‑level ones as well).

2. **Time‑Locked Guild Archive**  
   - Officers create capsules with stories, documents, and campaign logs that unlock after X days.  
   - Content is encrypted via Seal and stored on Walrus; when the time is reached, all members can open the capsule and read it.[web:103][web:110][web:102]

3. **Private Inheritance**  
   - Leader creates a capsule for a single member/guild beneficiary.  
   - Content might be operational instructions for the base, backup seed, or critical info; only the beneficiary can read it after date N or when the dead man’s switch is triggered.  

4. **Dead Man’s Switch for Guild Assets**  
   - Leader has a Heartbeat object and must call `heartbeat` periodically (or via an automation tool) to update `last_ping`.[web:76][web:71]  
   - If `now_ms - last_ping_ms > timeout_ms` (checked via Sui Clock), a DEADMANSWITCH capsule allows officers/guild to read content, and (in advanced versions) claim capabilities / control over assets.[web:77][web:80]

5. **(Phase 2) Public Treasure Hunt**  
   - Guild creates a public capsule with hints and rewards; after time T or once a puzzle is solved, any player who meets the conditions can claim info to continue the quest.  
   - Heavy content (maps, lore, coordinates) is stored on Walrus; depending on mode, it may or may not be encrypted.

## 6. Functional Requirements

### 6.1 On‑Chain (Move / Sui)

1. **LoreLock GuildVault (shared object)**  
   - Belongs to a `guild_id` or an owner address.  
   - Stores slots/capsules via dynamic fields or Tables (slot_id → SlotMeta / CapsuleRef).[web:125][web:117]  
   - Exposes entries to:
     - Initialize a vault.  
     - List capsule/slot counts for UI.

2. **Role Capabilities**  
   - `GuildMemberCap { guild_id }` – `has key, store` resource issued to members.  
   - `GuildOfficerCap { guild_id }` – resource for officers/leaders (superset privileges).  
   - Entries:
     - `grant_member` – callable only by a `GuildOfficerCap` holder.  
     - (Optional for phase 1) `grant_officer` / `revoke_member`.  
   - Access checks always use capabilities, not a simple mapping in the vault (best‑practice security).[web:113][web:115][web:121]

3. **Capsule Object & Modes**  
   - A `Capsule` struct must at least include:
     - `guild_id`, `creator`, `mode`, `unlock_time_ms`, `beneficiary`, `walrus_blob_id`, `seal_policy_id`, `claimed`.  
   - Modes (MVP):
     - `ARCHIVE` – guild‑only read after time.  
     - `PRIVATE_INHERIT` – only beneficiary reads after time.  
     - `DEAD_MAN` – only guild/officers read if heartbeat times out.  
   - Entries:
     - `create_capsule` – create new capsule, validating caller’s role (member/officer depending on mode).  
     - `claim_capsule` – check time‑lock with `Clock::timestamp_ms`, enforce role/beneficiary/heartbeat conditions, mark `claimed`, emit event.[web:71][web:77][web:80]

4. **Heartbeat / Dead Man’s Switch**  
   - `Heartbeat { owner, last_ping_ms, timeout_ms }`.  
   - Entries:
     - `heartbeat` – set `last_ping_ms = now_ms`.  
     - `trigger_dead_man` – allow `claim_capsule` in DEADMANSWITCH mode when `now_ms - last_ping_ms > timeout_ms`.[web:76][web:71]

5. **Events**  
   - `CapsuleCreated { capsule_id, guild_id, creator, mode, unlock_time_ms }`.  
   - `CapsuleClaimed { capsule_id, claimant, time_ms }`.  
   - `DeadManTriggered { owner, guild_id, capsule_id, time_ms }`.  
   - `SlotAccessEvent { caller, slot_id, level, ok }` (if you use slot levels).  
   - Used for off‑chain indexing and building a "living archive" timeline for guilds/civilization.

6. **World / Smart Assembly Integration (v1)**  
   - LoreLock is deployed as a custom contract compatible with world‑contracts, using a witness type to be authorized to interact with World when needed (e.g., moving items from storage in a later version).[web:48][web:52][web:6]  
   - For the MVP, integration can stop at:
     - Binding `guild_id`/owner to a specific assembly.  
     - Not directly moving items in World yet; only managing secrets + metadata.

### 6.2 Off‑Chain

1. **Walrus Integration**  
   - Use Walrus client/SDK to:[web:103][web:110]
     - `storeBlob(encrypted_payload) → blob_id + proof object on Sui`.  
     - `getBlob(blob_id) → encrypted_payload`.  
   - Configure minimal metadata (tags, TTL); advanced lifecycle rules can be added later.[web:101][web:104]

2. **Seal Integration**  
   - Use Seal SDK to:[web:102][web:95][web:109]
     - Encrypt content (message, file, JSON) under an app‑specific policy linked to the LoreLock module.  
     - Store `seal_policy_id` or a policy reference in the Capsule.  
   - Decrypt flow:
     - Client calls Seal with `encrypted_payload`, `seal_policy_id`, and proofs (Sui address, capsule id, etc.).  
     - Seal key servers verify on‑chain conditions (capsule `claimed == true`, caller holds the right capability).[web:102][web:91]  
     - If valid, they issue an ephemeral key to decrypt.

3. **Web dApp / UI**  
   - React/TypeScript web dApp using EVE Vault / Sui wallet and the EVE Frontier React SDK to talk to the hackathon network.[web:53][web:4]  
   - Minimum screens:
     - **LoreLock Vault Dashboard** – list capsules by mode and status (locked/unlocked/claimed).  
     - **Create Capsule Form** – choose mode, unlock time, beneficiary (if any), enter content, then Seal encrypt → Walrus upload → call `create_capsule`.  
     - **Open Capsule Flow** – call `claim_capsule` → fetch blob from Walrus → Seal decrypt → display content.

4. **Indexer (Optional for MVP, Recommended)**  
   - Small Node.js/Rust service that subscribes to LoreLock events:
     - Store capsule timeline in a DB (Postgres/KV).  
     - Provide APIs for UI to show history / living archive.

## 7. Non‑Functional Requirements

- **Security**  
  - Never store plaintext secrets on‑chain; only blob ids, policy ids, and hashes.[web:102][web:109][web:115]  
  - Use the capability pattern to minimize the attack surface for spoofing roles.[web:113][web:121]  
- **Performance & Cost**  
  - Keep on‑chain data to small metadata (u64s, addresses, blob ids).  
  - Always store large content (long text, files, JSON) on Walrus.[web:103][web:86]  
- **Upgradability**  
  - Design LoreLock data structures for versioning (add modes/fields without breaking old data).[web:117][web:79]  
- **Developer Experience**  
  - Follow Sui Move best practices (object security, capability design, avoid unnecessary shared mutable state).[web:79][web:115][web:121]

## 8. MVP Scope (Hackathon)

**MVP On‑Chain**

- `GuildVault` + `GuildMemberCap` + `GuildOfficerCap`.  
- `Capsule` with 3 modes: ARCHIVE, PRIVATE_INHERIT, DEAD_MAN.  
- Time‑lock using `Clock::timestamp_ms`.[web:71][web:77][web:80]  
- Minimal heartbeat + dead‑man trigger (only checks timeout; does not yet move World assets).  
- Events: `CapsuleCreated`, `CapsuleClaimed`, `DeadManTriggered`.

**MVP Off‑Chain**

- Walrus: `storeBlob` + `getBlob` for capsule contents.[web:103][web:110]  
- Seal: encrypt/decrypt for PRIVATE_INHERIT and DEAD_MAN (ARCHIVE can use a simpler or semi‑public policy initially).[web:102][web:109]  
- Simple web dApp with three main flows: connect wallet, create capsule, open capsule.

**Out‑of‑Scope for MVP**

- Full public treasure hunt feature (leaderboards, non‑guild integration).  
- Full asset transfer integration with World (kept as roadmap only).  
- Deep UI/UX polish and full mobile optimization.

## 9. Success Metrics (Hackathon)

- Working end‑to‑end demo on the hackathon network:  
  - Create ARCHIVE, PRIVATE_INHERIT, and DEAD_MAN capsules.  
  - Successfully open and decrypt content through Walrus + Seal.  
- At least one guild uses the prototype during the hackathon (or demo with 2–3 test accounts acting as a guild).[web:18][web:16]  
- Jury feedback that LoreLock:
  - Uses Sui’s strengths well (object model, Clock, capabilities, Walrus, Seal).[web:72][web:71][web:101][web:102]  
  - Aligns with the "A Toolkit for Civilization" theme.[web:15][web:18]
