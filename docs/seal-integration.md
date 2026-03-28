# Seal Integration — Guild Time Vault

Reference guide cho việc tích hợp [Seal](https://seal-docs.wal.app) vào Guild Time Vault.

## Seal là gì?

Seal là hệ thống mã hóa dữ liệu + kiểm soát truy cập on-chain trên Sui, sử dụng Identity-Based Encryption (IBE).

- Developer định nghĩa **access policy** bằng Move (`seal_approve*` functions)
- Seal key server kiểm tra policy on-chain (via `dry_run`) trước khi trả decryption key
- Dữ liệu được encrypt client-side, lưu trên Walrus hoặc bất kỳ storage nào
- Chỉ metadata (blob_id, policy_id) lưu on-chain

Docs chính thức:
- Design: https://seal-docs.wal.app/Design
- Using Seal: https://seal-docs.wal.app/UsingSeal
- Example Patterns: https://seal-docs.wal.app/ExamplePatterns

---

## Kiến trúc Seal

```
┌─────────────┐     encrypt(mpk, id, data)     ┌──────────────┐
│  Client/dApp │ ──────────────────────────────► │  Walrus Blob │
│              │                                 │  (encrypted) │
│              │     storeBlob(encrypted)        │              │
└──────┬───────┘                                 └──────────────┘
       │
       │  1. claim_capsule on-chain (set claimed=true)
       │  2. Build PTB calling seal_approve*
       │  3. Request decryption key
       ▼
┌──────────────┐     dry_run(PTB)     ┌─────────────────┐
│  Seal Key    │ ◄──────────────────► │  Sui Full Node  │
│  Server      │                      │  (chain state)  │
│              │  if pass → return    │                  │
│              │  derived secret key  │                  │
└──────┬───────┘                      └─────────────────┘
       │
       │  derived key
       ▼
┌─────────────┐
│  Client/dApp │  decrypt(derived_key, encrypted_blob) → plaintext
└─────────────┘
```

---

## IBE Identity Encoding

Seal dùng identity string dạng `[PackageId][custom_bytes]`.
- `PackageId` = address của Move package (tự động thêm bởi Seal)
- `custom_bytes` = phần do developer định nghĩa, truyền vào `seal_approve*` qua param `id`

### Guild Time Vault identity format

```
[mode:u8][capsule_id:u64][context_address:address]
```

| Mode | mode byte | context_address |
|------|-----------|-----------------|
| ARCHIVE (0) | `0x00` | guild_id |
| PRIVATE_INHERIT (1) | `0x01` | beneficiary address |
| DEAD_MAN (2) | `0x02` | vault_id (object address) |

Full IBE identity = `[PackageId][mode][capsule_id_bcs][context_addr_bcs]`

---

## seal_approve* Functions

Theo Seal spec, các function này phải:
- Tên bắt đầu bằng `seal_approve`
- Param đầu tiên: `id: vector<u8>` (identity suffix, không có PackageId prefix)
- Là `entry` function (non-public) — chỉ gọi được từ PTB, không composable
- Side-effect free — không modify on-chain state
- Abort nếu access denied (không return value)

### seal_approve_archive

```move
entry fun seal_approve_archive(
    id: vector<u8>,
    vault: &GuildVault,
    member_cap: &GuildMemberCap,
    clock: &Clock,
)
```

Kiểm tra:
1. Parse identity → mode=0, capsule_id, guild_id
2. Caller có `GuildMemberCap` đúng guild
3. guild_id trong identity == vault.guild_id
4. Capsule tồn tại, mode == ARCHIVE
5. Capsule đã claimed (on-chain claim phải xảy ra trước)
6. `clock.timestamp_ms() >= unlock_time_ms`

### seal_approve_private_inherit

```move
entry fun seal_approve_private_inherit(
    id: vector<u8>,
    vault: &GuildVault,
    clock: &Clock,
    ctx: &TxContext,
)
```

Kiểm tra:
1. Parse identity → mode=1, capsule_id, beneficiary
2. `ctx.sender() == beneficiary` (chỉ beneficiary decrypt được)
3. Capsule mode == PRIVATE_INHERIT
4. Capsule beneficiary == beneficiary trong identity
5. Capsule đã claimed
6. Time >= unlock_time

### seal_approve_dead_man

```move
entry fun seal_approve_dead_man(
    id: vector<u8>,
    vault: &GuildVault,
    heartbeat: &Heartbeat,
    clock: &Clock,
)
```

Kiểm tra:
1. Parse identity → mode=2, capsule_id, vault_id
2. vault_id == heartbeat.vault_id
3. Heartbeat đã timeout (`now > last_ping + timeout`)
4. Capsule mode == DEAD_MAN
5. Capsule đã claimed

---

## Client-side Flow (TypeScript)

### 1. Encrypt (khi tạo capsule)

```typescript
import { SealClient } from "@aspect-build/seal-sdk"; // hoặc @aspect-build/seal-sdk
import { fromHEX } from "@mysten/bcs";

// Build identity bytes (không có PackageId prefix)
const id = buildIdentity(mode, capsuleId, contextAddress);

const { encryptedObject, key } = await sealClient.encrypt({
    threshold: 2,
    packageId: fromHEX(VAULT_PACKAGE_ID),
    id: fromHEX(id),
    data: new TextEncoder().encode(JSON.stringify({ title, body })),
});

// Upload encrypted blob to Walrus
const blobId = await walrusClient.storeBlob(encryptedObject);

// Create capsule on-chain with blobId
```

### 2. Claim + Decrypt (khi mở capsule)

```typescript
// Step 1: Claim capsule on-chain (set claimed=true)
await claimCapsule(vaultId, capsuleId, mode);

// Step 2: Create SessionKey
const sessionKey = await SessionKey.create({
    address: userAddress,
    packageId: fromHEX(VAULT_PACKAGE_ID),
    ttlMin: 10,
    suiClient,
});
const message = sessionKey.getPersonalMessage();
const { signature } = await wallet.signPersonalMessage(message);
sessionKey.setPersonalMessageSignature(signature);

// Step 3: Build PTB for seal_approve
const tx = new Transaction();
tx.moveCall({
    target: `${VAULT_PACKAGE_ID}::vault_seal::seal_approve_archive`,
    arguments: [
        tx.pure.vector("u8", identityBytes),
        tx.object(vaultObjectId),
        tx.object(memberCapId),
        tx.object("0x6"), // Clock
    ],
});
const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });

// Step 4: Decrypt
const decryptedBytes = await sealClient.decrypt({
    data: encryptedBlob,
    sessionKey,
    txBytes,
});

const content = JSON.parse(new TextDecoder().decode(decryptedBytes));
```

---

## Seal Key Servers (Testnet)

### Decentralized server

```typescript
{
    objectId: "0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98",
    aggregatorUrl: "https://seal-aggregator-testnet.mystenlabs.com",
    weight: 1,
}
```

### Independent servers

```typescript
{
    objectId: "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
    weight: 1,
},
{
    objectId: "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8",
    weight: 1,
}
```

### SealClient setup

```typescript
import { SealClient } from "@aspect-build/seal-sdk";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

const suiClient = new SuiClient({ url: getFullnodeUrl("testnet") });
const sealClient = new SealClient({
    suiClient,
    serverConfigs: [
        {
            objectId: "0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98",
            aggregatorUrl: "https://seal-aggregator-testnet.mystenlabs.com",
            weight: 1,
        },
    ],
    verifyKeyServers: false,
});
```

---

## Seal Example Patterns (tham khảo)

| Pattern | Mô tả | Tương ứng vault mode |
|---------|--------|---------------------|
| Time-lock | Encrypt → unlock sau thời điểm T | ARCHIVE |
| Allowlist | Chỉ danh sách approved users decrypt | ARCHIVE (guild members) |
| Private data | Owned object, chỉ owner decrypt | PRIVATE_INHERIT |
| Subscription | Time-limited access | — (có thể mở rộng) |

---

## Lưu ý quan trọng

1. `seal_approve*` được evaluate bằng `dry_run` — không modify state, chỉ đọc
2. Capsule phải được **claimed on-chain trước** khi decrypt — đây là gate kiểm soát
3. Full node state có thể chưa sync ngay → retry nếu gặp `InvalidParameter`
4. JWT/session key có TTL ngắn — tạo mới nếu hết hạn
5. Encrypted data size không bị ẩn — pad nếu cần bảo mật kích thước
6. Package upgrade giữ nguyên identity namespace — nhưng policy có thể thay đổi
7. Dùng AES-256-GCM cho hầu hết use cases (nhanh hơn HMAC-CTR)
8. Cho file lớn: dùng envelope encryption (encrypt symmetric key bằng Seal, encrypt data bằng AES)
