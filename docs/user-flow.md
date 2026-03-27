Mô hình user flow cho dApp này mình sẽ chia theo 3 nhóm hành động chính: **kết nối – tạo capsule – mở capsule**. Mình giả định bạn dùng EVE Vault (Sui wallet của Frontier) + React SDK như trong tutorial hackathon. [facebook](https://www.facebook.com/evefrontier/videos/how-to-build-in-eve-frontier-hackathon-tutorial-2-is-now-live-80000-prize-pool-h/1886939438623637/)

***

## 1. Bước 0 – Truy cập & kết nối ví

**User types:** leader, officer, member, cả người ngoài guild (nếu sau này có treasure hunt public).

1. User mở dApp Guild Time Vault (web) trong browser.  
2. DApp hiển thị nút **“Connect Wallet”**.  
3. User bấm **Connect** → popup EVE Vault hiện lên, yêu cầu user unlock (nhập PIN) và chọn account. [youtube](https://www.youtube.com/watch?v=5OZWy8MdE8s)
4. Sau khi connect thành công:
   - UI hiển thị địa chỉ Sui (zkLogin) hiện tại.  
   - Gọi RPC check user có `GuildMemberCap` / `GuildOfficerCap` và `guild_id` tương ứng hay không → set role trên UI (Leader/Officer/Member/Guest).  

***

## 2. Bước 1 – Leader/officer khởi tạo vault & cấp quyền

*(thường chỉ làm 1 lần cho mỗi guild / test env)*

### 2.1. Init Guild Vault (leader)

1. Leader (đã connect ví) mở tab **“Admin”**.  
2. Bấm **“Init Guild Vault”**, nhập:
   - `guild_id` (có thể là address/app‑level id),  
   - `timeout` cho dead man’s switch (ví dụ 30 ngày).  
3. DApp gửi tx gọi `init_guild_vault`; EVE Vault popup ký tx, gửi lên Sui. [github](https://github.com/evefrontier/evevault)
4. Sau khi tx thành công, UI lưu `vault_id`/`heartbeat_id` vào config/local storage và hiển thị trạng thái vault đã tạo.

### 2.2. Cấp Member/Officer Cap

1. Leader/officer vào tab **“Members”**.  
2. Nhập Sui address của member, chọn **Grant Member** hoặc **Grant Officer**.  
3. DApp gửi tx `grant_member` hoặc `grant_officer`; member nhận được capability object trong ví (on‑chain).  
4. Member sau khi connect dApp, UI tự động detect role qua on‑chain state → hiển thị đúng permissions.

***

## 3. Bước 2 – Tạo capsule (archive / inheritance / dead‑man)

### 3.1. Chọn loại capsule

User có role phù hợp (thường là officer, đôi khi member):

1. Mở tab **“Create Capsule”**.  
2. Chọn **Mode** (radio/select):
   - Archive (guild‑only, time‑locked).  
   - Private inheritance (1 beneficiary).  
   - Dead man’s switch (gắn với heartbeat).  

3. Nhập thông tin:
   - **Tiêu đề** + **nội dung** (text hoặc JSON).  
   - Thời điểm unlock (datetime picker → convert sang ms).  
   - Beneficiary address (nếu mode = PRIVATE_INHERIT).  

### 3.2. Encrypt + store bằng Seal + Walrus

Trên client (ẩn với user, chỉ thấy progress):

1. DApp dùng **Seal SDK** để mã hoá nội dung:
   - Tạo policy tương ứng với mode (guild‑only / 1 beneficiary / dead‑man). [seal-docs.wal](https://seal-docs.wal.app)
2. Nhận `encrypted_payload` + `seal_policy_id` từ Seal SDK.  
3. DApp gọi **Walrus client**:
   - `storeBlob(encrypted_payload) → blob_id + proof`. [walrus](https://www.walrus.xyz/blog/how-walrus-blob-storage-works)

### 3.3. Tạo capsule on‑chain

1. DApp gửi tx `create_capsule` với:
   - `mode`, `unlock_time_ms`, `beneficiary`, `walrus_blob_id`, `seal_policy_id`.  
2. EVE Vault popup cho user ký tx, gửi lên Sui. [youtube](https://www.youtube.com/watch?v=5OZWy8MdE8s)
3. Sau khi tx success:
   - UI cập nhật danh sách capsules (gọi RPC/GraphQL đọc `GuildVault`).  
   - Capsule mới hiển thị trạng thái **Locked** (chưa tới thời gian unlock).

***

## 4. Bước 3 – Heartbeat (leader)

Đối với **dead man’s switch**:

1. Leader mở tab **“Heartbeat”**.  
2. Bấm **“Ping now”** để gửi tx `heartbeat` (có thể mỗi vài ngày / tuần, hoặc tự động hoá bằng script background). [intro.sui-book](https://intro.sui-book.com/unit-three/lessons/6_clock_and_locked_coin.html)
3. UI hiển thị `last_ping` và `next_deadline` dựa trên `timeout_ms`.  

Nếu leader ngưng ping quá lâu → khi tới Day X, officer có thể trigger dead man’s capsule.

***

## 5. Bước 4 – Mở capsule (claim + decrypt)

### 5.1. Xem danh sách capsules

1. User (member/officer/beneficiary) mở tab **“Vault”**.  
2. DApp:
   - Gọi RPC/GraphQL đọc danh sách capsules từ `GuildVault`. [docs.sui](https://docs.sui.io/references/sui-api/sui-graphql/beta/reference/types/objects/move-object)
   - Với mỗi capsule:
     - Tính trạng thái: `Locked` / `Unlockable` / `Claimed`.  
     - Check role hiện tại để quyết định có hiển thị nút **Open** hay không.  

### 5.2. Claim capsule on‑chain

Khi user bấm **“Open”**:

1. DApp gửi tx `claim_capsule` với `capsule_id`.  
2. EVE Vault popup ký tx; chain kiểm tra:
   - Time‑lock: `Clock::timestamp_ms >= unlock_time_ms`. [docs.sui](https://docs.sui.io/guides/developer/sui-101/access-time)
   - Quyền: user có MemberCap/OfficerCap / đúng beneficiary / dead‑man timeout.  
3. Nếu tx thành công:
   - DApp đọc lại capsule hoặc event `CapsuleClaimed` để lấy `walrus_blob_id` + `seal_policy_id`.  

### 5.3. Lấy dữ liệu từ Walrus + giải mã bằng Seal

1. DApp gọi Walrus: `getBlob(blob_id) → encrypted_payload`. [docs.wal](https://docs.wal.app/docs/walrus-client/storing-blobs)
2. Dùng Seal SDK:
   - Gửi `encrypted_payload` + `seal_policy_id` + chứng minh (địa chỉ, capsule id, v.v.). [seal.mystenlabs](https://seal.mystenlabs.com/how-it-works)
   - Seal servers kiểm tra on‑chain điều kiện → cấp key tạm → client decrypt.  
3. DApp hiển thị nội dung plaintext (message, JSON, file link…) trong UI:
   - Ví dụ: nội dung lore, hướng dẫn, seed phụ, toạ độ kho báu…

***

## 6. Bước 5 – Use‑case cụ thể từ góc nhìn user

Để bạn dễ hình dung demo:

### 6.1. Leader tạo “Guild Archive Capsule”

- Day 1: Leader connect dApp → init vault → grant member cho vài tài khoản.  
- Day 1: Leader vào **Create Capsule**, chọn mode ARCHIVE, set unlock sau 7 ngày, paste story/nhật ký chiến dịch.  
- DApp tự Seal encrypt + Walrus store + create_capsule.  
- Day 8: Member vào Vault, thấy capsule status **Unlockable**, bấm **Open** → claim + decrypt → đọc câu chuyện.

### 6.2. Private inheritance

- Leader chọn mode PRIVATE_INHERIT, chọn beneficiary là officer B, set unlock trong 30 ngày.  
- Sau 30 ngày, chỉ officer B (địa chỉ đó) thấy nút Open, open ra để đọc nội dung (ví dụ chỉ dẫn quản lý guild khi leader nghỉ game).

### 6.3. Dead man’s switch

- Leader config Heartbeat timeout 14 ngày, thỉnh thoảng vào tab Heartbeat bấm Ping.  
- Nếu leader bỏ game > 14 ngày không ping:
  - Officer vào Vault, thấy capsule mode DEADMANSWITCH đổi sang Unlockable → bấm Open → đọc hướng dẫn, kế hoạch, “di chúc” tài sản.

***