# Smart Gate example

After publishing [move-contracts/smart_gate_extension](../../move-contracts/smart_gate_extension/), run these scripts from the repo root in order:

```bash
# 1. Configure extension rules (tribe config + bounty config)
bun run configure-rules

# 2. Authorize the extension on gates and storage unit extension
bun run authorise-gate-extension
bun run authorise-storage-unit-extension

# 3. Issue a jump permit (tribe-based) — typically in a dApp
bun run issue-tribe-jump-permit

# 4. Jump using the permit — typically in the game UI
bun run jump-with-permit

# 5. Collect corpse bounty for a jump permit
bun run collect-corpse-bounty
```
