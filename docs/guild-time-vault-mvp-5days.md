# Guild Time Vault – MVP 5-Day Plan (2 Devs)

## 0. Bối cảnh & phân vai

- Bối cảnh: MVP chạy trên môi trường hackathon EVE Frontier × Sui, dùng builder‑scaffold, với on‑chain Sui Move + off‑chain Walrus & Seal + dApp web tối giản.[web:18][web:16]
- Dev A: **On‑chain / Move / tích hợp World & Smart Assembly**.  
- Dev B: **Off‑chain / Walrus & Seal / dApp & scripts TypeScript**.

Giả định: môi trường dev (Sui CLI, builder‑scaffold, node, Docker) đã được setup xong trước hoặc trong nửa đầu Day 1.[web:48][web:52]

---

## Day 1 – Align, kiến trúc & scaffold

**Mục tiêu chung ngày 1**: Hai người cùng thống nhất scope MVP, flow end‑to‑end, và scaffold code; cuối ngày có repo chạy được tests cơ bản (chưa cần logic đầy đủ).

### Dev A (On‑chain)

1. Đọc lại PRD Guild Time Vault + docs world‑contracts / Smart Assemblies để nắm rõ constraint.[web:48][web:56]  
2. Trong `move-contracts/` của builder‑scaffold, tạo package/module `guild_time_vault` với skeleton:
   - Structs: `GuildVault`, `GuildMemberCap`, `GuildOfficerCap`, `Capsule`, `Heartbeat`.  
   - Khai báo event types: `CapsuleCreated`, `CapsuleClaimed`, `DeadManTriggered`.  
3. Xác định rõ **mode** trong enum (u8): ARCHIVE, PRIVATE_INHERIT, DEAD_MAN (PUBLIC_HUNT để phase 2 nếu thiếu thời gian).  
4. Viết stub cho entry functions (chưa có body đầy đủ):
   - `init_guild_vault`, `grant_member`, `create_capsule`, `claim_capsule`, `heartbeat`, `trigger_dead_man`.  
5. Thiết lập unit test skeleton trong Move (nếu dùng) hoặc ít nhất là script test trống cho Day 2.

### Dev B (Off‑chain)

1. Clone/prepare **builder‑scaffold** repo, đảm bảo build được và kết nối network hackathon/testnet theo hướng dẫn.[web:16][web:49]  
2. Tạo cấu trúc thư mục:
   - `ts-scripts/guild_time_vault/` cho scripts deploy + create/claim capsule.  
   - `dapps/guild-vault-ui/` cho dApp React (tối giản).  
3. Thiết lập basic tooling:
   - Kết nối EVE Vault / Sui wallet trong dApp (skeleton connect wallet + hiển thị địa chỉ). [web:53][web:4]  
   - Cấu hình client Sui (endpoint, packageId placeholder, v.v.).  
4. Nghiên cứu nhanh docs Walrus & Seal, note lại API chính cần dùng (store/read blob, encrypt/decrypt). [web:103][web:110][web:102][web:109]

---

## Day 2 – Hoàn thiện logic Move cơ bản

**Mục tiêu chung ngày 2**: Hoàn thành phần lớn logic on‑chain cho capsule + role + time‑lock (chưa cần tích hợp sâu với World).

### Dev A (On‑chain)

1. Implement đầy đủ các struct:
   - `GuildVault` (shared) với mapping slot/capsule (vector + index hoặc Table). [web:125][web:117]  
   - Capabilities `GuildMemberCap`, `GuildOfficerCap` (has key, store). [web:113][web:116][web:121]  
   - `Capsule` (fields: guild_id, creator, mode, unlock_time_ms, beneficiary, walrus_blob_id, seal_policy_id, claimed).  
   - `Heartbeat` (owner, last_ping_ms, timeout_ms). [web:76][web:71]
2. Viết logic cho entry:
   - `init_guild_vault` – tạo GuildVault + OfficerCap cho leader.  
   - `grant_member` – chỉ cho phép gọi với `&GuildOfficerCap`.  
   - `create_capsule` – kiểm tra role + ghi metadata + emit `CapsuleCreated`.  
   - `claim_capsule` – dùng `Clock::timestamp_ms` để kiểm tra time‑lock, kiểm tra role/beneficiary, set `claimed`. [web:77][web:80]  
   - `heartbeat` + `trigger_dead_man` – logic timeout cơ bản cho DEADMANSWITCH. [web:76][web:71]
3. Chạy `move build` + tests đơn giản (nếu có) để chắc chắn không lỗi type/borrow checker.

### Dev B (Off‑chain)

1. Viết script TypeScript `deploy_vault.ts`:
   - Publish package `guild_time_vault`.  
   - Gọi `init_guild_vault` với signer leader.  
2. Viết script `grant_member.ts`:
   - Gọi entry `grant_member` để cấp GuildMemberCap cho một địa chỉ test.  
3. Cập nhật dApp:
   - Thêm cấu hình `.env` / config cho packageId, vaultId, guildId.  
   - Màn hình debug hiển thị danh sách caps do Dev A exposed (thông qua view RPC/GraphQL nếu kịp).[web:83]

---

## Day 3 – Walrus + Seal POC & create_capsule end‑to‑end

**Mục tiêu chung ngày 3**: Cho chạy end‑to‑end flow "create capsule": user nhập nội dung → Seal encrypt → Walrus store → on‑chain lưu metadata capsule.

### Dev A (On‑chain)

1. Rà soát lại types `walrus_blob_id` và `seal_policy_id` (kiểu `vector<u8>` hoặc `string` BCS‑encoded) để Dev B dùng thống nhất. [web:103][web:110][web:102]  
2. Thêm validation cơ bản trong `create_capsule` (ví dụ unlock_time_ms > now_ms). [web:71][web:77]  
3. Cập nhật thêm event `CapsuleCreated` để chứa đủ thông tin cho indexer/UX (capsule_id, guild_id, mode, unlock_time_ms).  
4. Hỗ trợ Dev B debug nếu có lỗi về type khi gọi Move từ TS.

### Dev B (Off‑chain)

1. Walrus POC:
   - Dùng Walrus client/SDK/HTTP demo: `storeBlob(plaintext)` → `blob_id`, `getBlob(blob_id)` → xác nhận pipeline hoạt động. [web:103][web:110][web:101]  
2. Seal POC:
   - Dùng Seal SDK encrypt một chuỗi JSON dummy (vd: `{ title, body }`) theo policy đơn giản; lưu `seal_policy_id`/ref. [web:102][web:95][web:109]  
3. Kết hợp POC vào dApp:
   - Màn hình "Create Capsule": form nhập nội dung + chọn mode + beneficiary + unlock time.  
   - Flow: plaintext → Seal encrypt → Walrus store → nhận `blob_id` + `policy_id` → gửi tx `create_capsule` (TS script hoặc direct từ dApp).  
4. Xác nhận từ UI: capsule mới xuất hiện trong list (đọc qua RPC/GraphQL).

---

## Day 4 – Claim/decrypt flow & dApp UX

**Mục tiêu chung ngày 4**: Hoàn thành flow "open capsule": claim on‑chain + load blob + Seal decrypt + hiển thị nội dung, tối thiểu cho ARCHIVE và PRIVATE_INHERIT.

### Dev A (On‑chain)

1. Hoàn thiện logic `claim_capsule` cho 2 mode:
   - `ARCHIVE`: chỉ cho phép nếu caller có GuildMemberCap (đúng guild), `now_ms >= unlock_time_ms`.  
   - `PRIVATE_INHERIT`: chỉ beneficiary (địa chỉ chỉ định) có thể claim sau thời điểm.  
2. Hoàn thiện `DeadMan` skeleton (có thể chưa dùng full trong UI nhưng logic đã sẵn sàng):
   - `heartbeat` cập nhật `last_ping_ms`.  
   - `trigger_dead_man` cho phép claim ở mode DEADMANSWITCH khi timeout. [web:76][web:71]  
3. Emit `CapsuleClaimed` với đầy đủ dữ liệu cho front/indexer.

### Dev B (Off‑chain)

1. DApp "Open Capsule":
   - UI hiển thị danh sách capsules (ARCHIVE + PRIVATE_INHERIT) với trạng thái (locked/unlocked/claimed).  
   - Nút "Open" sẽ:
     - Gửi tx `claim_capsule`.  
     - Nếu thành công: đọc lại Capsule hoặc event để lấy `walrus_blob_id`, `seal_policy_id`.  
     - Gọi Walrus `getBlob(blob_id)` để lấy `encrypted_payload`. [web:103][web:110]  
     - Gọi Seal decrypt với policy/id tương ứng để lấy plaintext và render trên UI. [web:102][web:95][web:109]
2. Thử nghiệm end‑to‑end với nhiều user address (leader, member, outsider) để bảo đảm access control đúng.
3. Thêm tối thiểu style/UI để demo không quá thô (title, mô tả, loading state, error state).

---

## Day 5 – Stabilize, polish & demo prep

**Mục tiêu chung ngày 5**: Ổn định, vá edge case, viết docs ngắn, chuẩn bị demo kịch bản rõ ràng.

### Dev A (On‑chain)

1. Rà soát bảo mật & best‑practices:
   - Đảm bảo không có entry nào cho phép bypass capability pattern. [web:113][web:115][web:121]  
   - Kiểm tra kỹ các assert cho guild_id/role/beneficiary.  
   - Kiểm tra overflow/underflow đơn giản liên quan đến thời gian (sử dụng checked ops nếu cần).  
2. Tối ưu event cho indexer (không log thừa, nhưng đủ thông tin UX).  
3. Viết README on‑chain ngắn mô tả:
   - Structs chính, constraints, cách tích hợp World/Smart Assembly tương lai.

### Dev B (Off‑chain)

1. Clean up dApp:
   - Xử lý lỗi thân thiện (ví dụ: "Too early to open", "Not authorized", network error).  
   - Thêm một vài copy rõ ràng giải thích cơ chế time‑lock & quyền truy cập.
2. Viết `README.md` ở root:
   - Hướng dẫn setup dev env, cách deploy contract, chạy dApp, demo flows.  
   - Nêu rõ hạn chế hiện tại (chưa move item trong World, chỉ quản lý bí mật/metadata) và hướng mở rộng. [web:48][web:16]
3. Chuẩn bị kịch bản demo:
   - Flow 1: Leader tạo capsule ARCHIVE, member mở sau khi tới thời điểm.  
   - Flow 2: Leader tạo PRIVATE_INHERIT cho một member, chỉ member đó mở được.  
   - (Nếu kịp) Flow 3: Dead man’s switch – leader không heartbeat, officer trigger và đọc capsule.

---

## 10. Buffer & lưu ý

- Mỗi ngày nên chừa 10–20% thời gian cho debug môi trường (network, wallet, Walrus/Seal endpoints).  
- Nếu bị chậm ngày 2–3, có thể giảm scope: tạm thời bỏ DEADMANSWITCH và chỉ giữ ARCHIVE + PRIVATE_INHERIT nhưng vẫn giữ cấu trúc để thêm vào sau.
