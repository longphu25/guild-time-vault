#!/usr/bin/env bash
# ============================================================================
# deploy-world.sh — Init submodule, configure, deploy world-contracts, copy artifacts
#
# Automates the full flow:
#   1. Init world-contracts git submodule (pinned at v0.0.18)
#   2. Generate world-contracts/.env from Sui keytool or docker/.env.sui
#   3. Deploy, configure, seed test resources
#   4. Copy artifacts back to builder-scaffold
#   5. Fill builder-scaffold .env with WORLD_PACKAGE_ID
#
# Usage:
#   ./setup-world/deploy-world.sh                  # localnet (default)
#   SUI_NETWORK=testnet ./setup-world/deploy-world.sh
#
# Env vars (all optional, sensible defaults):
#   SUI_NETWORK          localnet | testnet (default: localnet)
#   WORLD_CONTRACTS_DIR  path to world-contracts (default: ./world-contracts)
#   DELAY_SECONDS        pause between deploy steps (default: 2)
# ============================================================================
set -euo pipefail

# ─── Config ─────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCAFFOLD_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NETWORK="${SUI_NETWORK:-localnet}"
WORLD_DIR="${WORLD_CONTRACTS_DIR:-$SCAFFOLD_DIR/world-contracts}"
DELAY="${DELAY_SECONDS:-2}"
DOCKER_ENV_SUI="$SCAFFOLD_DIR/docker/.env.sui"

info()  { printf "\033[36m[deploy-world]\033[0m %s\n" "$1"; }
error() { printf "\033[31m[deploy-world] ERROR:\033[0m %s\n" "$1" >&2; exit 1; }
ok()    { printf "\033[32m[deploy-world]\033[0m %s\n" "$1"; }

# ─── Step 1: Init world-contracts submodule ─────────────
if [ ! -d "$WORLD_DIR/.git" ] && [ ! -f "$WORLD_DIR/.git" ]; then
  info "Initializing world-contracts submodule..."
  git -C "$SCAFFOLD_DIR" submodule update --init --recursive world-contracts || \
    error "Failed to init submodule. Run: git submodule update --init world-contracts"
else
  info "world-contracts submodule found at $WORLD_DIR"
fi

[ -d "$WORLD_DIR" ] || error "world-contracts not found at $WORLD_DIR"

# ─── Step 2: Generate world-contracts/.env ──────────────
info "Generating world-contracts/.env for $NETWORK"

# Source keys: prefer docker/.env.sui, then Sui keytool, then existing env vars
if [ -f "$DOCKER_ENV_SUI" ]; then
  info "Reading keys from docker/.env.sui"
  set -a
  # shellcheck disable=SC1090
  source <(sed 's/\r$//' "$DOCKER_ENV_SUI")
  set +a
elif command -v sui &>/dev/null && sui keytool list &>/dev/null 2>&1; then
  info "Reading keys from Sui keytool"
  get_address() { sui keytool export --key-identity "$1" --json 2>/dev/null | jq -r '.key.suiAddress' 2>/dev/null || echo ""; }
  get_key()     { sui keytool export --key-identity "$1" --json 2>/dev/null | jq -r '.exportedPrivateKey' 2>/dev/null || echo ""; }

  # Try common alias names
  for alias_admin in ADMIN admin; do
    ADMIN_ADDRESS="${ADMIN_ADDRESS:-$(get_address "$alias_admin")}"
    ADMIN_PRIVATE_KEY="${ADMIN_PRIVATE_KEY:-$(get_key "$alias_admin")}"
    [ -n "$ADMIN_ADDRESS" ] && [ "$ADMIN_ADDRESS" != "null" ] && break
    ADMIN_ADDRESS="" && ADMIN_PRIVATE_KEY=""
  done

  for alias_pa in PLAYER_A player-a player_a; do
    PLAYER_A_PRIVATE_KEY="${PLAYER_A_PRIVATE_KEY:-$(get_key "$alias_pa")}"
    [ -n "$PLAYER_A_PRIVATE_KEY" ] && [ "$PLAYER_A_PRIVATE_KEY" != "null" ] && break
    PLAYER_A_PRIVATE_KEY=""
  done

  for alias_pb in PLAYER_B player-b player_b; do
    PLAYER_B_PRIVATE_KEY="${PLAYER_B_PRIVATE_KEY:-$(get_key "$alias_pb")}"
    [ -n "$PLAYER_B_PRIVATE_KEY" ] && [ "$PLAYER_B_PRIVATE_KEY" != "null" ] && break
    PLAYER_B_PRIVATE_KEY=""
  done
else
  info "Using existing environment variables"
fi

# Validate required keys
for var in ADMIN_ADDRESS ADMIN_PRIVATE_KEY PLAYER_A_PRIVATE_KEY PLAYER_B_PRIVATE_KEY; do
  val="${!var:-}"
  [ -n "$val" ] && [ "$val" != "null" ] || error "$var is empty. Set it via docker/.env.sui, Sui keytool, or environment variable."
done

# Write world-contracts/.env
WORLD_ENV="$WORLD_DIR/.env"
if [ -f "$WORLD_DIR/env.example" ]; then
  cp "$WORLD_DIR/env.example" "$WORLD_ENV"
else
  cat > "$WORLD_ENV" <<ENVEOF
SUI_NETWORK=localnet
ADMIN_ADDRESS=
SPONSOR_ADDRESSES=
ADMIN_PRIVATE_KEY=
GOVERNOR_PRIVATE_KEY=
PLAYER_A_PRIVATE_KEY=
PLAYER_B_PRIVATE_KEY=
ENVEOF
fi

# macOS-compatible sed (no -i '' vs -i difference with temp file)
_sed_inplace() {
  local file="$1" expr="$2"
  local tmp
  tmp="$(mktemp)"
  sed "$expr" "$file" > "$tmp" && mv "$tmp" "$file"
}

_sed_inplace "$WORLD_ENV" "s|^SUI_NETWORK=.*|SUI_NETWORK=$NETWORK|"
_sed_inplace "$WORLD_ENV" "s|^ADMIN_ADDRESS=.*|ADMIN_ADDRESS=$ADMIN_ADDRESS|"
_sed_inplace "$WORLD_ENV" "s|^SPONSOR_ADDRESSES=.*|SPONSOR_ADDRESSES=$ADMIN_ADDRESS|"
_sed_inplace "$WORLD_ENV" "s|^ADMIN_PRIVATE_KEY=.*|ADMIN_PRIVATE_KEY=$ADMIN_PRIVATE_KEY|"
_sed_inplace "$WORLD_ENV" "s|^GOVERNOR_PRIVATE_KEY=.*|GOVERNOR_PRIVATE_KEY=$ADMIN_PRIVATE_KEY|"
_sed_inplace "$WORLD_ENV" "s|^PLAYER_A_PRIVATE_KEY=.*|PLAYER_A_PRIVATE_KEY=$PLAYER_A_PRIVATE_KEY|"
_sed_inplace "$WORLD_ENV" "s|^PLAYER_B_PRIVATE_KEY=.*|PLAYER_B_PRIVATE_KEY=$PLAYER_B_PRIVATE_KEY|"

ok "Generated $WORLD_ENV"

# ─── Step 3: Deploy world-contracts ─────────────────────
cd "$WORLD_DIR"

info "Installing world-contracts dependencies..."
pnpm install || error "pnpm install failed"

info "Deploying world contracts ($NETWORK)..."
pnpm deploy-world "$NETWORK" || error "deploy-world failed"
sleep "$DELAY"

info "Configuring world..."
pnpm configure-world "$NETWORK" || error "configure-world failed"
sleep "$DELAY"

info "Seeding test resources..."
pnpm create-test-resources "$NETWORK" || error "create-test-resources failed"

ok "World deployed successfully!"

# ─── Step 4: Copy artifacts to builder-scaffold ─────────
info "Copying artifacts to builder-scaffold..."

DEPLOY_DIR="$SCAFFOLD_DIR/deployments/$NETWORK"
mkdir -p "$DEPLOY_DIR"

if [ -d "$WORLD_DIR/deployments" ]; then
  cp -r "$WORLD_DIR/deployments/"* "$SCAFFOLD_DIR/deployments/"
  ok "Copied deployments/"
fi

if [ -f "$WORLD_DIR/test-resources.json" ]; then
  cp "$WORLD_DIR/test-resources.json" "$SCAFFOLD_DIR/test-resources.json"
  ok "Copied test-resources.json"
fi

# Copy Pub.localnet.toml if localnet
if [ "$NETWORK" = "localnet" ] && [ -f "$WORLD_DIR/contracts/world/Pub.localnet.toml" ]; then
  cp "$WORLD_DIR/contracts/world/Pub.localnet.toml" "$DEPLOY_DIR/Pub.localnet.toml"
  ok "Copied Pub.localnet.toml"
fi

# ─── Step 5: Fill builder-scaffold .env ─────────────────
info "Updating builder-scaffold .env..."

SCAFFOLD_ENV="$SCAFFOLD_DIR/.env"
if [ ! -f "$SCAFFOLD_ENV" ]; then
  cp "$SCAFFOLD_DIR/.env.example" "$SCAFFOLD_ENV"
fi

# Extract WORLD_PACKAGE_ID from extracted-object-ids.json
EXTRACTED_FILE="$SCAFFOLD_DIR/deployments/$NETWORK/extracted-object-ids.json"
WORLD_PACKAGE_ID=""
if [ -f "$EXTRACTED_FILE" ] && command -v jq &>/dev/null; then
  WORLD_PACKAGE_ID="$(jq -r '.world.packageId // empty' "$EXTRACTED_FILE" 2>/dev/null || echo "")"
fi

_sed_inplace "$SCAFFOLD_ENV" "s|^SUI_NETWORK=.*|SUI_NETWORK=$NETWORK|"
_sed_inplace "$SCAFFOLD_ENV" "s|^ADMIN_ADDRESS=.*|ADMIN_ADDRESS=$ADMIN_ADDRESS|"
_sed_inplace "$SCAFFOLD_ENV" "s|^ADMIN_PRIVATE_KEY=.*|ADMIN_PRIVATE_KEY=$ADMIN_PRIVATE_KEY|"
_sed_inplace "$SCAFFOLD_ENV" "s|^PLAYER_A_PRIVATE_KEY=.*|PLAYER_A_PRIVATE_KEY=$PLAYER_A_PRIVATE_KEY|"
_sed_inplace "$SCAFFOLD_ENV" "s|^PLAYER_B_PRIVATE_KEY=.*|PLAYER_B_PRIVATE_KEY=$PLAYER_B_PRIVATE_KEY|"

if [ -n "$WORLD_PACKAGE_ID" ]; then
  _sed_inplace "$SCAFFOLD_ENV" "s|^WORLD_PACKAGE_ID=.*|WORLD_PACKAGE_ID=$WORLD_PACKAGE_ID|"
  ok "WORLD_PACKAGE_ID=$WORLD_PACKAGE_ID"
else
  echo "  ⚠  Could not extract WORLD_PACKAGE_ID — fill it manually in .env"
fi

ok "Updated $SCAFFOLD_ENV"

# ─── Done ───────────────────────────────────────────────
echo ""
echo "================================================"
echo " World deployment complete ($NETWORK)"
echo " Artifacts: $SCAFFOLD_DIR/deployments/$NETWORK/"
echo " Scaffold .env: $SCAFFOLD_ENV"
echo "================================================"
echo ""
echo "Next steps:"
echo "  cd $SCAFFOLD_DIR"
echo "  make build-move"
echo "  make publish-move"
echo ""
