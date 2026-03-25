#!/usr/bin/env bash
# Build, publish smart_gate_extension, and update .env with BUILDER_PACKAGE_ID + EXTENSION_CONFIG_ID.
# Runs inside the Docker container.
set -euo pipefail

SCAFFOLD_DIR="/workspace/builder-scaffold"
MOVE_PKG="${1:-$SCAFFOLD_DIR/move-contracts/smart_gate_extension}"
NETWORK="${SUI_NETWORK:-localnet}"
SCAFFOLD_ENV="$SCAFFOLD_DIR/.env"

info()  { printf "\033[36m[publish]\033[0m %s\n" "$1"; }
error() { printf "\033[31m[publish] ERROR:\033[0m %s\n" "$1" >&2; exit 1; }
ok()    { printf "\033[32m[publish]\033[0m %s\n" "$1"; }

# ─── Clean stale publish entries ────────────────────────
# force-regenesis creates a new chain each time, so old entries are invalid
info "Cleaning stale publish entries..."
rm -f "$MOVE_PKG/Move.lock"

# Remove this package's entry from Pub.localnet.toml if it exists
if [ "$NETWORK" = "localnet" ]; then
  PUB_FILE="$SCAFFOLD_DIR/deployments/localnet/Pub.localnet.toml"
  if [ -f "$PUB_FILE" ]; then
    # Remove [[published]] block that references this package
    python3 -c "
import re, sys
content = open('$PUB_FILE').read()
# Remove [[published]] blocks whose source contains smart_gate_extension
pattern = r'\[\[published\]\]\nsource = \{[^}]*smart_gate_extension[^}]*\}[^\[]*'
content = re.sub(pattern, '', content)
open('$PUB_FILE', 'w').write(content)
" 2>/dev/null || true
  fi
fi

# ─── Build ──────────────────────────────────────────────
info "Building $MOVE_PKG..."
sui move build --path "$MOVE_PKG" -e testnet || error "Build failed"

# ─── Publish ────────────────────────────────────────────
info "Publishing $MOVE_PKG on $NETWORK..."
cd "$MOVE_PKG"

PUBLISH_OUTPUT=""
if [ "$NETWORK" = "localnet" ]; then
  PUB_FILE="$SCAFFOLD_DIR/deployments/localnet/Pub.localnet.toml"
  [ -f "$PUB_FILE" ] || error "Pub.localnet.toml not found at $PUB_FILE. Deploy world first."
  RAW_OUTPUT=$(sui client test-publish --build-env testnet --pubfile-path "$PUB_FILE" --json 2>&1) || {
    echo "$RAW_OUTPUT"
    error "Publish failed"
  }
else
  RAW_OUTPUT=$(sui client publish -e testnet --json 2>&1) || {
    echo "$RAW_OUTPUT"
    error "Publish failed"
  }
fi

# sui CLI may print non-JSON lines (build output) before the JSON — extract only the JSON object
PUBLISH_OUTPUT=$(echo "$RAW_OUTPUT" | sed -n '/^{/,/^}/p')

# ─── Parse output ───────────────────────────────────────
info "Parsing publish output..."

# Extract BUILDER_PACKAGE_ID — objectType === "package"
BUILDER_PACKAGE_ID=$(echo "$PUBLISH_OUTPUT" | jq -r '
  .objectChanges[]
  | select(.type == "published")
  | .packageId
' 2>/dev/null) || true

[ -n "$BUILDER_PACKAGE_ID" ] && [ "$BUILDER_PACKAGE_ID" != "null" ] || {
  echo "$RAW_OUTPUT" | tail -30
  error "Could not extract BUILDER_PACKAGE_ID from publish output"
}

# Extract EXTENSION_CONFIG_ID — objectType ends with config::ExtensionConfig
EXTENSION_CONFIG_ID=$(echo "$PUBLISH_OUTPUT" | jq -r '
  .objectChanges[]
  | select(.objectType? // "" | endswith("config::ExtensionConfig"))
  | .objectId
' 2>/dev/null) || true

[ -n "$EXTENSION_CONFIG_ID" ] && [ "$EXTENSION_CONFIG_ID" != "null" ] || {
  echo "$RAW_OUTPUT" | tail -30
  error "Could not extract EXTENSION_CONFIG_ID from publish output"
}

ok "BUILDER_PACKAGE_ID=$BUILDER_PACKAGE_ID"
ok "EXTENSION_CONFIG_ID=$EXTENSION_CONFIG_ID"

# ─── Update .env ────────────────────────────────────────
info "Updating $SCAFFOLD_ENV..."

[ -f "$SCAFFOLD_ENV" ] || cp "$SCAFFOLD_DIR/.env.example" "$SCAFFOLD_ENV"

# Helper: set or append key=value in .env
set_env() {
  local key="$1" val="$2" file="$3"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$file"
  else
    echo "${key}=${val}" >> "$file"
  fi
}

set_env "BUILDER_PACKAGE_ID" "$BUILDER_PACKAGE_ID" "$SCAFFOLD_ENV"
set_env "EXTENSION_CONFIG_ID" "$EXTENSION_CONFIG_ID" "$SCAFFOLD_ENV"

ok "Updated $SCAFFOLD_ENV"
ok "Done! Ready to run: make configure-rules"
