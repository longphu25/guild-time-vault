---
inclusion: fileMatch
fileMatchPattern: "**/*.move"
---

# Sui Move Coding Standards

When working with `.move` files, always follow these rules derived from:
- [Sui Developer Cheat Sheet](https://docs.sui.io/guides/developer/dev-cheat-sheet)
- [Move Code Quality Checklist](https://move-book.com/guides/code-quality-checklist)
- [Move Best Practices](https://docs.sui.io/guides/developer/move-best-practices)

---

## Package & Module

- Use `edition = "2024"` in Move.toml.
- Do NOT declare explicit Sui framework dependency (implicit since Sui 1.45).
- Package name in PascalCase, named address in snake_case.
- Use module label syntax (no brackets): `module pkg::mod;`
- Design modules around 1 object or data structure.
- Move.lock should be committed (not in .gitignore).

## Code Organization

Structure files with section comments:

```move
// === Imports ===
// === Errors ===
// === Constants ===
// === Structs ===
// === Events ===
// === Public Functions ===
// === View Functions ===
// === Admin Functions ===
// === Package Functions ===
// === Private Functions ===
```

- `init` function should be first if it exists.
- Sort functions by purpose and user flow.
- Group imports by dependency.

## Naming Conventions

- Error constants: `EPascalCase` (e.g., `ENotAuthorized`).
- Regular constants: `ALL_CAPS_SNAKE` (e.g., `MAX_SUPPLY`).
- Capabilities: suffix with `Cap` (e.g., `AdminCap`).
- Events: past tense (e.g., `UserRegistered`, `CapsuleClaimed`).
- No "Potato" in struct names for hot-potato types.
- Dynamic field keys: positional struct with `Key` suffix (e.g., `ConfigKey() has copy, drop, store`).
- Getters: named after field, no `get_` prefix. Mutable: `field_mut`.
- CRUD: `new`, `empty`, `create`, `add`, `remove`, `exists`, `contains`, `borrow`, `borrow_mut`, `drop`, `destroy`, `destroy_empty`, `to_x`, `from_x`.

## Functions

- NEVER use `public entry fun`. Use `public fun` or `entry fun`.
  - `public` already allows PTB calls; `entry` on `public` is redundant and limits composability.
- Write composable functions: return objects instead of transferring inside the function.
- Parameter order: objects first → capabilities second → scalars → `Clock` → `TxContext`.
- Keep functions pure: avoid `transfer::transfer` / `transfer::public_transfer` in core logic.
- For shared objects: provide `new()` returning the object + `share()` to share it.
