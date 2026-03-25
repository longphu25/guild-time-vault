# Guild Time Vault – Product Requirements Document (PRD)

## 1. Product Overview

**One‑liner**  
Guild Time Vault là một Smart Assembly gắn với kho của hội (guild storage), cho phép guild tạo các "time‑locked capsules" chứa tài sản và bí mật, chỉ những thành viên được cấp quyền mới có thể xem và sử dụng, với hỗ trợ treasure hunts, inheritance và dead man’s switch.

**Context hackathon**  
EVE Frontier × Sui Hackathon 2026 tập trung vào việc xây dựng mods và công cụ như một "toolkit for civilization", khuyến khích người chơi tạo hạ tầng xã hội và kinh tế mới trên nền tảng Smart Assemblies và Sui.[web:18][web:15][web:139]  
Smart Assemblies hiện tại (Smart Storage Unit, Smart Turret, Smart Gate…) cho phép cắm thêm lớp smart contract để trở thành marketplace, quest giver, bounty board, v.v.; Guild Time Vault là một lớp hạ tầng như vậy, tập trung vào quản lý tài sản và bí mật của hội.[web:56][web:135]

## 2. Problem Statement

Guild trong EVE Frontier thiếu một công cụ on‑chain để:

- Lưu trữ bí mật, chiến lược, tài liệu nội bộ dưới dạng dữ liệu bền vững, có kiểm soát truy cập.  
- Thiết lập cơ chế time‑locked cho thông tin/tài sản (ví dụ di chúc, kho báu mở trong tương lai).  
- Triển khai dead man’s switch để bảo vệ tài sản guild nếu leader/officer biến mất.  
- Xây dựng một "living archive" về lịch sử và lore của guild/civilization trong shared universe.[web:128][web:132]

Hiện tại Smart Storage chủ yếu chứa resource/items mà không có lớp quyền dựa trên cấp bậc guild + time‑lock + encryption off‑chain.

## 3. Product Goals & Non‑Goals

### 3.1 Goals

1. Cung cấp một **Guild Vault Smart Assembly** có phân quyền member/officer rõ ràng trên Sui bằng capability pattern (không hard‑code danh sách địa chỉ).[web:113][web:121]  
2. Hỗ trợ tạo **time‑locked capsules** gắn với guild, với các mode:
   - Guild archive (chỉ member/officer đọc được sau thời điểm T).  
   - Private inheritance (một beneficiary cụ thể).  
   - Dead man’s switch cho tài sản/knowledge guild.  
   - (Tuỳ thời gian) Public treasure hunt.  
3. Lưu nội dung bí mật (message, file, hint, lore) trên **Walrus** để tối ưu chi phí, độ bền, và kích thước; chỉ lưu metadata nhỏ on‑chain.[web:103][web:110][web:101]  
4. Bảo vệ dữ liệu bằng **Seal** (client‑side encryption + on‑chain access control), để chỉ người có role/điều kiện phù hợp mới giải mã được nội dung.[web:102][web:95][web:109]  
5. Tích hợp đúng với **EVE Frontier World / world‑contracts** và Smart Assemblies: mod gắn với storage/guild structure, không phá vỡ invariant kinh tế hoặc luồng tài nguyên của World.[web:48][web:52][web:16]

### 3.2 Non‑Goals (Hackathon Scope)

- Không xây full guild management system (đăng ký guild, diplomacy, thuế…).  
- Không làm document management hoàn chỉnh (search, versioning, ACL phức tạp).  
- Không can thiệp sâu vào UI in‑game của CCP; chỉ cung cấp UI web/dApp tối thiểu + integration mức cần thiết với Smart Assembly UI.

## 4. Target Users & Personas

- **Guild Leader / Founder**  
  - Nhu cầu: bảo vệ tài sản và bí mật của guild, thiết lập cơ chế kế thừa, kiểm soát ai được xem gì và khi nào.  
- **Guild Officer**  
  - Nhu cầu: vận hành kho bí mật, tạo event (treasure hunt), cập nhật archive, nhận quyền kiểm soát khi leader vắng mặt.  
- **Guild Member**  
  - Nhu cầu: tham gia hoạt động cộng đồng, đọc lore, nhận phần thưởng/inheritance, giải puzzle.  
- **Community Builder / RP Player**  
  - Nhu cầu: ghi lại lịch sử của base/guild/civilization, tạo narrative dài hạn trong universe.[web:132][web:5]

## 5. Key Use Cases

1. **Guild Secret Vault**  
   - Leader init một Guild Vault gắn với Smart Storage/structure.  
   - Leader/Officer cấp GuildMemberCap / GuildOfficerCap cho các địa chỉ on‑chain đại diện cho nhân vật guild.[web:113][web:116][web:121]  
   - Vault hiển thị các slot/capsule phù hợp với vai trò (member thấy slot level 0; officer thấy thêm slot level cao).

2. **Time‑Locked Guild Archive**  
   - Officer tạo capsule chứa câu chuyện, tài liệu, log chiến dịch, đặt unlock sau X ngày hoặc sau cycle cụ thể.  
   - Dữ liệu được mã hoá bằng Seal và lưu trên Walrus; đến thời điểm unlock, mọi member có thể mở capsule để đọc. [web:103][web:110][web:102]

3. **Private Inheritance**  
   - Leader tạo capsule cho một member/guild beneficiary duy nhất.  
   - Nội dung có thể là hướng dẫn vận hành base, seed phụ, hoặc quyền truy cập thông tin quan trọng; chỉ beneficiary đọc được sau ngày N hoặc khi leader mất tích (dead man’s switch).  

4. **Dead Man’s Switch cho Guild Assets**  
   - Leader có một Heartbeat object; phải gọi `heartbeat` định kỳ (hoặc thông qua tool tự động) để cập nhật `last_ping`. [web:76][web:71]  
   - Nếu `now_ms - last_ping_ms > timeout_ms` (kiểm tra bằng Sui Clock), capsule DEADMANSWITCH cho phép officer/guild đọc nội dung, và (ở phiên bản nâng cao) claim capability/quyền quản lý asset. [web:77][web:80]

5. **(Phase 2) Public Treasure Hunt**  
   - Guild tạo capsule public với hint và reward; sau thời điểm T hoặc khi puzzle được giải, bất kỳ người chơi nào đáp ứng điều kiện có thể claim thông tin để tiếp tục chuỗi quest.  
   - Nội dung lớn của hunt (map, lore, toạ độ…) nằm trên Walrus; tuỳ mode mà có thể mã hoá hoặc để public.

## 6. Functional Requirements

### 6.1 On‑Chain (Move / Sui)

1. **GuildVault (shared object)**  
   - Thuộc về `guild_id` hoặc owner address.  
   - Lưu các slot/capsule thông qua dynamic fields hoặc Table (slot_id → SlotMeta / CapsuleRef).[web:125][web:117]  
   - Cung cấp entry để:
     - Khởi tạo vault.  
     - Liệt kê số lượng capsule/slot (cho UI).  

2. **Role Capabilities**  
   - `GuildMemberCap { guild_id }` – resource `has key, store`, cấp cho các member.  
   - `GuildOfficerCap { guild_id }` – resource cho officers/leader (superset quyền).  
   - Entry:
     - `grant_member` – chỉ được gọi bởi holder của `GuildOfficerCap`.  
     - (Tuỳ thời gian) `grant_officer` / `revoke_member` – có thể để phase 2.  
   - Kiểm tra quyền luôn dựa trên capability pattern, không dựa trên mapping trong vault (best‑practice security).[web:113][web:115][web:121]

3. **Capsule Object & Modes**  
   - Struct `Capsule` tối thiểu gồm:
     - `guild_id`, `creator`, `mode`, `unlock_time_ms`, `beneficiary`, `walrus_blob_id`, `seal_policy_id`, `claimed`.  
   - Modes (MVP):
     - `ARCHIVE` – guild‑only xem sau thời gian.  
     - `PRIVATE_INHERIT` – chỉ beneficiary đọc được sau thời gian.  
     - `DEAD_MAN` – chỉ guild/officer đọc được nếu heartbeat timeout.  
   - Entry:
     - `create_capsule` – tạo capsule mới, kiểm tra người gọi có đủ quyền (member/officer tuỳ mode).  
     - `claim_capsule` – kiểm tra time‑lock qua `Clock::timestamp_ms`, quyền role, heartbeat state nếu cần; cập nhật `claimed` và emit event. [web:71][web:77][web:80]

4. **Heartbeat / Dead Man’s Switch**  
   - Struct `Heartbeat { owner, last_ping_ms, timeout_ms }`.  
   - Entry:
     - `heartbeat` – cập nhật `last_ping_ms = now_ms`.  
     - `trigger_dead_man` – cho phép gọi `claim_capsule` ở mode DEADMANSWITCH khi `now_ms - last_ping_ms > timeout_ms`. [web:76][web:71]

5. **Events**  
   - `CapsuleCreated { capsule_id, guild_id, creator, mode, unlock_time_ms }`.  
   - `CapsuleClaimed { capsule_id, claimant, time_ms }`.  
   - `DeadManTriggered { owner, guild_id, capsule_id, time_ms }`.  
   - `SlotAccessEvent { caller, slot_id, level, ok }` (nếu dùng khái niệm slot level).  
   - Dùng để index off‑chain và xây dựng timeline "living archive" cho guild/civilization.

6. **World / Smart Assembly Integration (v1)**  
   - Mod được triển khai như custom contract tương thích với world‑contracts, sử dụng witness type để được phép tương tác với World khi cần (ví dụ trong phiên bản nâng cao: chuyển item từ storage).[web:48][web:52][web:6]  
   - Trong MVP hackathon, integration với World có thể dừng ở mức:
     - Mod gắn khái niệm "guild_id" / owner với một assembly cụ thể.  
     - Không bắt buộc thao tác trực tiếp lên item trong World, chỉ quản lý bí mật + metadata.

### 6.2 Off‑Chain

1. **Walrus Integration**  
   - Sử dụng Walrus client/SDK để:
     - `storeBlob(encrypted_payload) → blob_id + proof object on Sui`.[web:103][web:110]  
     - `getBlob(blob_id) → encrypted_payload`.  
   - Metadata (tags, TTL) cấu hình tối thiểu; có thể để nâng cao sau hackathon.[web:101][web:104]

2. **Seal Integration**  
   - Sử dụng Seal SDK để:
     - Encrypt nội dung (message, file, JSON) theo policy app‑specific liên kết với module Guild Time Vault. [web:102][web:95][web:109]  
     - Lưu `seal_policy_id` hoặc tham chiếu policy trong Capsule.  
   - Decrypt flow:
     - Client gọi Seal, cung cấp `encrypted_payload`, `seal_policy_id`, và bằng chứng (địa chỉ Sui, capsule id…).  
     - Seal key servers kiểm tra điều kiện on‑chain (capsule `claimed == true`, caller có capability phù hợp). [web:102][web:91]  
     - Nếu pass, trả một khoá tạm cho client để giải mã.

3. **dApp / UI (Web)**  
   - Web dApp (React/TypeScript) sử dụng EVE Vault / Sui wallet và Frontier React SDK để tương tác với network hackathon.[web:53][web:4]  
   - Màn hình tối thiểu:
     - **Guild Vault Dashboard**: list capsules theo mode, trạng thái (locked/unlocked/claimed).  
     - **Create Capsule Form**: chọn mode, thời điểm unlock, beneficiary (nếu có), nhập nội dung, Seal encrypt → Walrus upload → call `create_capsule`.  
     - **Open Capsule Flow**: gọi `claim_capsule` → fetch blob từ Walrus → Seal decrypt → hiển thị nội dung.

4. **Indexer (Optional for MVP, Recommended)**  
   - Service nhỏ (Node.js/Rust) subscribe các event trên module:
     - Lưu timeline vào DB (Postgres/KV).  
     - Cung cấp API cho UI để hiển thị history/living archive.

## 7. Non‑Functional Requirements

- **Bảo mật**:  
  - Không bao giờ lưu plaintext bí mật on‑chain; chỉ lưu blob id, policy id, hash. [web:102][web:109][web:115]  
  - Sử dụng capability pattern để giảm attack surface cho việc giả mạo quyền. [web:113][web:121]  
- **Hiệu năng & Chi phí**:  
  - Chỉ metadata nhỏ (u64, address, blob id) nằm on‑chain.  
  - Nội dung lớn (text dài, file, JSON) luôn đặt trên Walrus. [web:103][web:86]  
- **Khả năng nâng cấp**:  
  - Module Guild Time Vault thiết kế với cấu trúc dữ liệu versionable (có thể thêm mode, thêm field) mà không phá vỡ dữ liệu cũ. [web:117][web:79]  
- **Developer Experience**:  
  - Tuân thủ Move best‑practices (object security, capability design pattern, tránh shared mutable state không cần thiết). [web:79][web:115][web:121]

## 8. MVP Scope (Hackathon)

**MVP On‑Chain**

- `GuildVault` + `GuildMemberCap` + `GuildOfficerCap`.  
- `Capsule` với 3 mode: ARCHIVE, PRIVATE_INHERIT, DEAD_MAN.  
- Time‑lock bằng `Clock::timestamp_ms`. [web:71][web:77][web:80]  
- Heartbeat + trigger dead‑man tối thiểu (chỉ kiểm tra timeout, chưa tự động chuyển asset trong World).  
- Events: `CapsuleCreated`, `CapsuleClaimed`, `DeadManTriggered`.

**MVP Off‑Chain**

- Walrus: `storeBlob` + `getBlob` cho contents của capsule. [web:103][web:110]  
- Seal: encrypt/decrypt cho PRIVATE_INHERIT và DEAD_MAN (ARCHIVE có thể dùng policy đơn giản hoặc semi‑public). [web:102][web:109]  
- Web dApp đơn giản với 3 flow: connect wallet, create capsule, open capsule.

**Out‑of‑Scope cho MVP**

- Public treasure hunt full feature (leaderboard, integration ngoài guild).  
- Full item transfer integration với World (chỉ mô tả ở mức roadmap).  
- UI/UX polishing, mobile optimization sâu.

## 9. Success Metrics (Hackathon)

- Chạy được end‑to‑end flow demo trên network hackathon:  
  - Tạo capsule ARCHIVE & PRIVATE_INHERIT & DEAD_MAN.  
  - Mở thành công và giải mã nội dung qua Walrus + Seal.  
- Có ít nhất 1 guild dùng thử trong hackathon (hoặc demo với 2–3 tài khoản khác nhau đóng vai guild). [web:18][web:16]  
- Được jury công nhận là:
  - Sử dụng tốt đặc trưng Sui (object model, Clock, capability, Walrus, Seal). [web:72][web:71][web:101][web:102]  
  - Phù hợp chủ đề "A Toolkit for Civilization" của hackathon. [web:15][web:18]
