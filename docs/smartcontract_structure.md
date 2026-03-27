Mình liệt kê theo **module (contract)** trong Sui Move, chỉ tên hàm (function) – không ghi nội dung chi tiết, đúng yêu cầu của bạn. [docs.sui](https://docs.sui.io/guides/developer/move-best-practices)

***

## 1. Module `guild_time_vault` (core on‑chain logic)

### 1.1. Khởi tạo & cấu hình vault

- `public entry fun init_guild_vault(leader: &signer, guild_id: address, timeout_ms: u64, ctx: &mut TxContext)`  
- `public entry fun set_heartbeat_timeout(heart: &mut Heartbeat, new_timeout_ms: u64)`  

### 1.2. Quản lý vai trò (capability pattern)

- `public entry fun grant_member(officer: &GuildOfficerCap, vault: &GuildVault, to: address, ctx: &mut TxContext)`  
- `public entry fun grant_officer(officer: &GuildOfficerCap, vault: &GuildVault, to: address, ctx: &mut TxContext)`  
- `public entry fun revoke_member(officer: &GuildOfficerCap, vault: &GuildVault, member_cap: GuildMemberCap)`  
- `public entry fun revoke_officer(officer: &GuildOfficerCap, vault: &GuildVault, officer_cap: GuildOfficerCap)`  

*(có thể để `revoke_*` vào phase 2 nếu thiếu thời gian, nhưng nên liệt kê từ đầu để kiến trúc rõ ràng, bám theo capability pattern best‑practice).* [github](https://github.com/sui-foundation/sui-move-intro-course/blob/main/unit-two/lessons/6_capability_design_pattern.md)

### 1.3. Heartbeat & dead‑man switch

- `public entry fun heartbeat(heart: &mut Heartbeat, clock: &Clock)`  
- `public entry fun trigger_dead_man(vault: &mut GuildVault, heart: &Heartbeat, capsule_id: u64, caller: &signer, clock: &Clock)`  

### 1.4. Quản lý capsule (tạo, claim, xoá)

- `public entry fun create_capsule(`
  - `vault: &mut GuildVault,`
  - `creator: &signer,`
  - `mode: u8,`
  - `unlock_time_ms: u64,`
  - `beneficiary: address,`
  - `walrus_blob_id: vector<u8>,`
  - `seal_policy_id: vector<u8>,`
  - `clock: &Clock,`
  - `ctx: &mut TxContext`
  - `)`  

- `public entry fun claim_capsule(`
  - `vault: &mut GuildVault,`
  - `capsule_id: u64,`
  - `caller: &signer,`
  - `clock: &Clock`
  - `)`  

- `public entry fun delete_capsule(`
  - `officer: &GuildOfficerCap,`
  - `vault: &mut GuildVault,`
  - `capsule_id: u64`
  - `)`  

*(delete optional, nhưng hữu ích để dọn rác / sửa lỗi trong guild; quyền nên giới hạn cho officer).*  

***

## 2. Module `guild_time_vault_views` (các hàm view / tiện ích)

### 2.1. View cho UI / indexer

- `public fun get_vault_info(vault: &GuildVault): VaultInfo`  
- `public fun list_capsule_ids(vault: &GuildVault): vector<u64>`  
- `public fun get_capsule(vault: &GuildVault, capsule_id: u64): &Capsule`  
- `public fun get_capsule_mode(vault: &GuildVault, capsule_id: u64): u8`  
- `public fun get_capsule_unlock_time(vault: &GuildVault, capsule_id: u64): u64`  
- `public fun is_capsule_claimed(vault: &GuildVault, capsule_id: u64): bool`  
- `public fun is_capsule_unlockable(vault: &GuildVault, capsule_id: u64, clock: &Clock): bool`  

### 2.2. View về role & heartbeat

- `public fun has_member_cap(guild_id: address, addr: address): bool` *(nếu bạn lưu mapping hỗ trợ; nếu không có thì bỏ)*  
- `public fun has_officer_cap(guild_id: address, addr: address): bool`  
- `public fun get_heartbeat_state(heart: &Heartbeat, clock: &Clock): HeartbeatState`  

*(module view này có thể gộp vào `guild_time_vault`, nhưng tách riêng sẽ sạch code hơn; docs Move cũng khuyên tách rõ logic & helpers khi có thể).* [movebit](https://www.movebit.xyz/blog/post/Sui-Objects-Security-Principles-and-Best-Practices.html)

***

## 3. Module `guild_time_vault_world_integration` (tích hợp EVE Frontier World – phase 2)

Nếu bạn muốn liệt kê luôn cho roadmap tích hợp sâu với World/Smart Assemblies: [github](https://github.com/evefrontier/world-contracts)

### 3.1. Đăng ký assembly / witness

- `public fun init_world_integration(ctx: &mut TxContext)` *(module initializer hoặc entry để đăng ký types với world)*  
- `public entry fun bind_vault_to_assembly(`
  - `officer: &GuildOfficerCap,`
  - `vault: &mut GuildVault,`
  - `assembly_id: address`
  - `)`  

### 3.2. Hook khi assembly tương tác với item

- `public entry fun assembly_deposit_item(`
  - `vault: &mut GuildVault,`
  - `assembly_witness: &AssemblyWitness,`
  - `item: &mut ItemType`
  - `)`  

- `public entry fun assembly_withdraw_item(`
  - `vault: &mut GuildVault,`
  - `assembly_witness: &AssemblyWitness,`
  - `capsule_id: u64,`
  - `receiver: address`
  - `)`  

*(các type như `AssemblyWitness`, `ItemType` phụ thuộc world‑contracts, nên ở mức PRD bạn chỉ cần tên hàm và ý nghĩa).*  

***

## 4. Module `guild_time_vault_events` (nếu muốn tách nhỏ)

Bạn có thể giữ event trong module chính; nếu thích rõ ràng có thể tách module chỉ khai báo struct event + hàm emit wrapper, nhưng không bắt buộc. [docs.sui](https://docs.sui.io/concepts/sui-move-concepts)

Các hàm (nếu tách):

- `public fun emit_capsule_created(/* params cần thiết */)`  
- `public fun emit_capsule_claimed(/* ... */)`  
- `public fun emit_dead_man_triggered(/* ... */)`  

***
