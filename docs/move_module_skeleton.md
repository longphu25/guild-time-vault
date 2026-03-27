Hoàn toàn có thể (và nên) chia nhỏ ra nhiều file/module trong cùng một package Move để dễ quản lý, miễn là bạn giữ nguyên package `Move.toml` và `address` thống nhất. [docs.sui](https://docs.sui.io/guides/developer/objects/object-model)

Dưới đây là cách mình khuyên chia cho dự án này:

***

## 1. Cấu trúc thư mục gợi ý

Trong `move-contracts/guild_time_vault/`:

```text
Move.toml
sources/
  vault_core.move          // GuildVault + Capsule + Heartbeat + events
  vault_roles.move         // GuildMemberCap / GuildOfficerCap + grant/revoke
  vault_capsule_api.move   // create_capsule / claim_capsule / delete_capsule
  vault_heartbeat_api.move // heartbeat / trigger_dead_man
  vault_views.move         // các hàm view & helper
  // (sau này) vault_world_integration.move  // tích hợp World/Smart Assembly
```

Tất cả modules cùng `address guild` để dễ import chéo:

```toml
[addresses]
guild = "0x0"
```

***

## 2. Chia module theo trách nhiệm

### 2.1. `vault_core.move`

Chứa struct & event, **không** chứa entry function:

```move
module guild::vault_core {
    use sui::object::UID;

    pub struct GuildVault has key {
        id: UID,
        guild_id: address,
        // ...
    }

    pub struct Capsule has key, store { /* ... */ }

    pub struct Heartbeat has key, store { /* ... */ }

    pub struct CapsuleCreated has copy, drop { /* ... */ }
    pub struct CapsuleClaimed has copy, drop { /* ... */ }
    pub struct DeadManTriggered has copy, drop { /* ... */ }
}
```

Các module khác `use guild::vault_core::{GuildVault, Capsule, Heartbeat, CapsuleCreated, ...};` để dùng lại type.

***

### 2.2. `vault_roles.move`

Quản lý capability:

```move
module guild::vault_roles {
    use sui::tx_context::TxContext;
    use guild::vault_core::GuildVault;

    pub struct GuildMemberCap has key, store { id: UID, guild_id: address }
    pub struct GuildOfficerCap has key, store { id: UID, guild_id: address }

    public entry fun init_guild_vault(
        leader: &signer,
        guild_id: address,
        timeout_ms: u64,
        ctx: &mut TxContext,
    ) {
        // tạo GuildVault + Heartbeat + OfficerCap
        abort 1;
    }

    public entry fun grant_member(
        officer: &GuildOfficerCap,
        vault: &GuildVault,
        to: address,
        ctx: &mut TxContext,
    ) { abort 1; }

    public entry fun grant_officer(
        officer: &GuildOfficerCap,
        vault: &GuildVault,
        to: address,
        ctx: &mut TxContext,
    ) { abort 1; }

    public entry fun revoke_member(
        officer: &GuildOfficerCap,
        vault: &GuildVault,
        member_cap: GuildMemberCap,
    ) { abort 1; }

    public entry fun revoke_officer(
        officer: &GuildOfficerCap,
        vault: &GuildVault,
        officer_cap: GuildOfficerCap,
    ) { abort 1; }
}
```

***

### 2.3. `vault_capsule_api.move`

Toàn bộ entry về capsule:

```move
module guild::vault_capsule_api {
    use sui::tx_context::TxContext;
    use sui::clock::Clock;
    use guild::vault_core::{GuildVault, Capsule};
    use guild::vault_roles::{GuildMemberCap, GuildOfficerCap};

    public entry fun create_capsule(
        vault: &mut GuildVault,
        creator: &signer,
        mode: u8,
        unlock_time_ms: u64,
        beneficiary: address,
        walrus_blob_id: vector<u8>,
        seal_policy_id: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) { abort 1; }

    public entry fun claim_capsule(
        vault: &mut GuildVault,
        capsule_id: u64,
        caller: &signer,
        clock: &Clock,
    ) { abort 1; }

    public entry fun delete_capsule(
        officer: &GuildOfficerCap,
        vault: &mut GuildVault,
        capsule_id: u64,
    ) { abort 1; }
}
```

***

### 2.4. `vault_heartbeat_api.move`

Tách riêng dead‑man switch:

```move
module guild::vault_heartbeat_api {
    use sui::clock::Clock;
    use guild::vault_core::{GuildVault, Heartbeat};

    public entry fun set_heartbeat_timeout(
        heart: &mut Heartbeat,
        new_timeout_ms: u64,
    ) { abort 1; }

    public entry fun heartbeat(
        heart: &mut Heartbeat,
        clock: &Clock,
    ) { abort 1; }

    public entry fun trigger_dead_man(
        vault: &mut GuildVault,
        heart: &Heartbeat,
        capsule_id: u64,
        caller: &signer,
        clock: &Clock,
    ) { abort 1; }
}
```

***

### 2.5. `vault_views.move`

Các hàm `public fun` cho UI/indexer:

```move
module guild::vault_views {
    use sui::clock::Clock;
    use guild::vault_core::{GuildVault, Capsule, Heartbeat};

    public fun list_capsule_ids(
        vault: &GuildVault,
    ): vector<u64> { abort 1; }

    public fun get_capsule(
        vault: &GuildVault,
        capsule_id: u64,
    ): &Capsule { abort 1; }

    public fun is_capsule_unlockable(
        vault: &GuildVault,
        capsule_id: u64,
        clock: &Clock,
    ): bool { abort 1; }

    public fun get_heartbeat_state(
        heart: &Heartbeat,
        clock: &Clock,
    ): () { abort 1; }
}
```

***

## 3. Lợi ích cách chia này

- Mỗi file tập trung một “concern”: core types, role, capsule API, heartbeat, views – dễ đọc, dễ review. [docs.sui](https://docs.sui.io/guides/developer/move-best-practices)
- Giảm xung đột merge khi 2 dev làm song song: on‑chain dev có thể chia nhau module.  
- Dễ nâng cấp: sau này thêm mode mới hoặc tích hợp World thì thêm module `vault_world_integration.move` mà không đụng nhiều file cũ. [docs.sui](https://docs.sui.io/guides/developer/objects/versioning)
