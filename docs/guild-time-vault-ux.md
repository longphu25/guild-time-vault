# Guild Time Vault – UX & User Flows

## 1. Sequence Diagrams (Mermaid)

### 1.1. Connect Wallet & Detect Role

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant D as Guild Vault dApp
    participant W as EVE Vault (Wallet)
    participant S as Sui RPC

    U->>D: Open dApp URL
    D->>U: Render "Connect Wallet" button

    U->>D: Click "Connect Wallet"
    D->>W: Request connection
    W->>U: Prompt unlock & account selection
    U->>W: Approve connection
    W->>D: Return account address

    D->>S: Query on-chain for GuildMemberCap / GuildOfficerCap (by address)
    S-->>D: Role info (member/officer/none)

    D->>U: Show connected address + role badge + unlock relevant tabs
```

### 1.2. Create Capsule (ARCHIVE / PRIVATE_INHERIT / DEAD_MAN)

```mermaid
sequenceDiagram
    autonumber
    participant U as Creator (Officer/Leader)
    participant D as Guild Vault dApp
    participant Se as Seal SDK
    participant Wa as Walrus
    participant W as EVE Vault
    participant S as Sui RPC

    U->>D: Open "Create Capsule" screen
    D->>U: Render form (mode, unlock time, beneficiary, content)

    U->>D: Fill form & click "Create"

    %% Step 1: Encrypt with Seal
    D->>Se: Encrypt plaintext with policy (mode, guild, roles)
    Se-->>D: encrypted_payload, seal_policy_id

    %% Step 2: Store blob on Walrus
    D->>Wa: storeBlob(encrypted_payload)
    Wa-->>D: walrus_blob_id (+ proof)

    %% Step 3: On-chain create_capsule
    D->>W: Build & send tx create_capsule(vault_id, mode, unlock_time_ms, beneficiary, walrus_blob_id, seal_policy_id, ...)
    W->>U: Prompt tx confirmation
    U->>W: Approve tx
    W->>S: Submit transaction
    S-->>D: Tx success + CapsuleCreated event

    D->>S: Fetch updated GuildVault / capsule list
    S-->>D: Capsule metadata (id, mode, unlock_time_ms, claimed=false...)

    D->>U: Update UI list, show new capsule as "Locked"
```

### 1.3. Claim & Open Capsule (ARCHIVE / PRIVATE_INHERIT)

```mermaid
sequenceDiagram
    autonumber
    participant U as Member/Beneficiary
    participant D as Guild Vault dApp
    participant W as EVE Vault
    participant S as Sui RPC
    participant Wa as Walrus
    participant Se as Seal SDK

    U->>D: Open "Vault" screen
    D->>S: Query GuildVault & capsules
    S-->>D: Capsule list (id, mode, unlock_time_ms, claimed, ...)
    D->>U: Render capsule cards with status (Locked/Unlockable/Claimed)

    U->>D: Click "Open" on an unlockable capsule

    %% Step 1: On-chain claim_capsule
    D->>W: Build & send tx claim_capsule(vault_id, capsule_id)
    W->>U: Prompt tx confirmation
    U->>W: Approve tx
    W->>S: Submit transaction
    S-->>D: Tx success + CapsuleClaimed event

    %% Step 2: Fetch blob & decrypt
    D->>S: Fetch capsule metadata (walrus_blob_id, seal_policy_id)
    S-->>D: Metadata
    D->>Wa: getBlob(walrus_blob_id)
    Wa-->>D: encrypted_payload
    D->>Se: Decrypt(encrypted_payload, seal_policy_id, proof-of-role)
    Se-->>D: plaintext content

    D->>U: Display capsule content (text / JSON / file link)
```

### 1.4. Heartbeat & Dead Man’s Switch (tóm tắt)

```mermaid
sequenceDiagram
    autonumber
    participant L as Leader
    participant D as Guild Vault dApp
    participant W as EVE Vault
    participant S as Sui RPC
    participant O as Officer

    L->>D: Open "Heartbeat" tab
    D->>W: Build tx heartbeat(heartbeat_id)
    W->>L: Prompt tx confirmation
    L->>W: Approve tx
    W->>S: Submit transaction
    S-->>D: Tx success (last_ping updated)

    Note over L,S: Time passes, leader does not ping

    O->>D: Open "Vault" & "Dead Man Capsules"
    D->>S: Query Heartbeat + capsules
    S-->>D: last_ping, timeout, DEADMANSWITCH capsule state
    D->>O: Show capsule is Unlockable (dead man triggered)

    O->>D: Click "Open" (same claim + decrypt flow as above)
```

---

## 2. UI Wireframe-Level Checklist

### 2.1. Global Layout

- Header:
  - Logo / tên dApp: **Guild Time Vault**.
  - Network badge: Hackathon / Testnet.
  - Wallet area:
    - Khi chưa connect: nút **"Connect EVE Vault"**.
    - Khi đã connect: địa chỉ rút gọn + icon copy.
- Navigation (tabs hoặc sidebar):
  - `Vault` (dashboard capsules).
  - `Create Capsule`.
  - `Members` (admin roles).
  - `Heartbeat`.
  - (Optional) `Settings`.

---

### 2.2. Screen: Connect & Role Indicator

**Mục tiêu:** user biết mình đã connect chưa và đang ở role nào.

Elements:

- Wallet card:
  - State 1 (disconnected):
    - Title: "Wallet".
    - Button: **Connect EVE Vault**.
  - State 2 (connected):
    - Label: `Connected as: 0xABCD...`.
    - Copy icon.
- Role badge:
  - Text: `Role: Leader / Officer / Member / Guest`.
  - Badge màu khác nhau cho từng role.
- Guild context:
  - `Guild ID: 0x...` (hoặc tên nếu có).
  - `Vault ID: 0x...` rút gọn.

---

### 2.3. Screen: Vault (Capsule Dashboard)

**Mục tiêu:** hiển thị danh sách capsule + trạng thái + action.

**Filter bar:**

- Dropdown `Mode`:
  - All / Archive / Inheritance / Dead Man.
- Toggle `Show claimed` (On/Off).

**Capsule list (grid hoặc list):**

- Với mỗi capsule card:
  - Title (hoặc `Capsule #ID`).
  - Mode badge: `ARCHIVE / PRIVATE INHERIT / DEAD MAN`.
  - Unlock info:
    - "Unlocks at: {dateTime}".
    - Status label: `Locked / Unlockable / Claimed`.
  - Beneficiary (nếu có): `Beneficiary: 0x...`.
  - Icons nhỏ:
    - Dead‑man icon nếu mode DEADMANSWITCH.
  - Action zone:
    - Button **Open** (enabled/disabled tuỳ trạng thái & quyền).
    - Tooltip cho case disabled: "Too early", "No permission".

**Optional detail panel (side drawer/modal):**

- Khi click vào một capsule:
  - Info: ID đầy đủ, creator, createdAt.
  - History: danh sách event (Created, Claimed, DeadManTriggered).

---

### 2.4. Screen: Create Capsule

**Mục tiêu:** form duy nhất để tạo mọi loại capsule.

**Section A – Mode selector:**

- Radio buttons:
  - `Archive (Guild Only)` – mô tả ngắn: "Mở cho mọi member sau thời điểm T".
  - `Private Inheritance` – "Chỉ 1 beneficiary được mở".
  - `Dead Man’s Switch` – "Mở khi leader không heartbeat trong N ngày".

**Section B – Unlock settings:**

- Cho ARCHIVE / PRIVATE_INHERIT:
  - DateTime picker: `Unlock at`.
  - Label hiển thị dạng friendly: `Unlocks in ~X days`.
- Cho DEADMANSWITCH:
  - Readonly text: `Unlocks when heartbeat expires (timeout: N days)`.

**Section C – Beneficiary (khi cần):**

- Input `Sui address`:
  - Placeholder: `0x...`.
  - Hiển thị error khi format sai.
- Optional: dropdown để chọn từ danh sách member (nếu bạn load được danh sách từ on‑chain).

**Section D – Content:**

- Textarea lớn:
  - Label: `Secret content / message`.
  - Placeholder: ví dụ "Chiến lược, lore, seed phụ, toạ độ kho báu...".
  - Char counter.
- (Phase sau) File upload (có thể để disabled / hidden trong MVP).

**Section E – Actions & feedback:**

- Primary button: **Create Capsule**.
- Secondary: **Cancel** / quay lại Vault.
- Loading state (sau khi bấm Create):
  - Progress text: `Encrypting with Seal...` → `Uploading to Walrus...` → `Submitting transaction...`.
- Error display:
  - Vùng text hiển thị lỗi từ Seal, Walrus, hoặc on‑chain (ví dụ: `Unlock time must be in the future`).

---

### 2.5. Screen: Capsule Detail / Open Result

**Mục tiêu:** hiển thị nội dung sau khi mở capsule.

Elements:

- Header:
  - Title / Capsule #ID.
  - Mode badge.
  - Status: `Claimed at {datetime}`.
- Metadata block:
  - `Creator: 0x...`.
  - `Guild: 0x...`.
  - `Unlock at: {datetime}`.
  - `Beneficiary: 0x...` (nếu có).
- Content panel:
  - Box scrollable chứa plaintext (đã decrypt).
  - Style cơ bản để đọc dễ (font, spacing).
- Optional advanced info (accordion):
  - `Walrus blob id: ...` (rút gọn).
  - `Seal policy id: ...`.
  - Link `View raw blob` (nếu public đủ).

---

### 2.6. Screen: Members (Admin)

**Mục tiêu:** leader/officer quản lý quyền.

**Section A – Grant role:**

- Input `Sui address`.
- Radio / select `Role`:
  - Member.
  - Officer.
- Button **Grant**.
- Inline feedback: `Granted MemberCap to 0x...` hoặc lỗi (không có OfficerCap, v.v.).

**Section B – Current members list:**

- Table với cột:
  - Address.
  - Role (badge).
  - Actions:
    - Button **Revoke** (nếu implement).
- Filter row:
  - Dropdown Role filter (All / Member / Officer).

---

### 2.7. Screen: Heartbeat

**Mục tiêu:** leader quản lý dead man’s switch.

**Heartbeat status card:**

- `Last ping: {datetime or "never"}`.
- `Timeout: N days`.
- `Status: Alive / Expired` (màu xanh/đỏ).

**Controls:**

- Button **Ping now** (gửi tx `heartbeat`).
- (Optional) Form nhỏ để chỉnh `Timeout`:
  - Numeric input `N days`.
  - Button **Update timeout**.

**Dead Man capsules summary:**

- List các capsule mode DEADMANSWITCH:
  - Capsule ID, created at, claimed yes/no.
  - Nút "Go to capsule" mở sang chi tiết.
