.PHONY: help install install-all dapp-install zklogin-install \
       dev dapp-dev dapp-build dapp-preview \
       docker-up docker-up-indexer docker-down docker-shell docker-local \
       fmt fmt-ts fmt-check lint \
       build-move publish-move \
       configure-rules authorise-gate authorise-storage \
       issue-permit jump collect-bounty \
       setup-world deploy-world deploy-world-testnet \
       init-submodules zklogin clean

# ─── Default ────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-28s\033[0m %s\n", $$1, $$2}'

# ─── Install ────────────────────────────────────────────
init-submodules: ## Init git submodules (world-contracts)
	git submodule update --init --recursive

install: ## Install root dependencies
	bun install

dapp-install: ## Install dApp dependencies
	cd dapps && bun install

zklogin-install: ## Install zkLogin dependencies
	cd zklogin && bun install

install-all: init-submodules install dapp-install zklogin-install ## Install all dependencies

# ─── Development ────────────────────────────────────────
dev: install ## Start dApp dev server
	cd dapps && bun run dev

dapp-dev: dapp-install ## Start dApp dev server (with install)
	cd dapps && bun run dev

dapp-build: ## Build dApp for production
	cd dapps && bun run build

dapp-preview: ## Preview dApp production build
	cd dapps && bun run preview

# ─── Docker ─────────────────────────────────────────────
docker-up: ## Start Sui dev container (localnet)
	docker compose -f docker/compose.yml up --build -d

docker-up-indexer: ## Start Sui dev container + PostgreSQL indexer
	docker compose -f docker/compose.yml -f docker/docker-compose.override.yml up --build -d

docker-down: ## Stop all containers
	docker compose -f docker/compose.yml -f docker/docker-compose.override.yml down

docker-shell: ## Open shell in Sui dev container
	docker compose -f docker/compose.yml exec sui-dev bash

docker-local: ## Full local flow: start node → deploy world → publish contract → update .env
	@echo "── Starting Sui dev container ──"
	docker compose -f docker/compose.yml up --build -d
	@echo "── Waiting for RPC on port 9009 (timeout 90s) ──"
	@for i in $$(seq 1 90); do \
		curl -sf -X POST http://127.0.0.1:9009 \
			-H "Content-Type: application/json" \
			-d '{"jsonrpc":"2.0","method":"rpc.discover","id":1}' \
			-o /dev/null 2>/dev/null && echo "" && break; \
		printf "\r  ⏳ waiting... %ds / 90s" "$$i"; \
		if [ "$$i" -eq 90 ]; then echo "\nERROR: RPC not ready after 90s"; exit 1; fi; \
		sleep 1; \
	done
	@echo "── RPC ready. Deploying world-contracts ──"
	docker compose -f docker/compose.yml exec sui-dev bash -c "\
		cd /workspace/builder-scaffold && \
		bash setup-world/deploy-world.sh"
	@echo "── Publishing custom contract ──"
	docker compose -f docker/compose.yml exec sui-dev bash -c "\
		cd /workspace/builder-scaffold && \
		bash scripts/publish-and-update-env.sh"
	@echo ""
	@echo "══════════════════════════════════════════"
	@echo " Local environment ready!"
	@echo " RPC: http://127.0.0.1:9009"
	@echo " Keys: docker/.env.sui"
	@echo " .env: filled with all IDs"
	@echo ""
	@echo " Next: make configure-rules"
	@echo "══════════════════════════════════════════"

# ─── Format & Lint ──────────────────────────────────────
fmt: ## Format Move files
	bun run fmt

fmt-ts: ## Format TypeScript files
	bun run fmt:ts

fmt-check: ## Check formatting (Move + TS)
	bun run fmt:check

lint: ## Lint all Move packages
	bun run lint

# ─── Move Contracts ─────────────────────────────────────
MOVE_PKG ?= move-contracts/smart_gate_extension
ENV ?= testnet

build-move: ## Build Move package (MOVE_PKG=path ENV=testnet)
	sui move build --path $(MOVE_PKG) -e $(ENV)

publish-move: ## Publish Move package (MOVE_PKG=path ENV=testnet)
	cd $(MOVE_PKG) && sui client publish -e $(ENV)

# ─── Smart Gate Scripts ─────────────────────────────────
configure-rules: ## Configure tribe + bounty rules (admin)
	bun run configure-rules

authorise-gate: ## Authorize XAuth on gates
	bun run authorise-gate-extension

authorise-storage: ## Authorize XAuth on storage unit
	bun run authorise-storage-unit-extension

issue-permit: ## Issue tribe jump permit
	bun run issue-tribe-jump-permit

jump: ## Jump with permit (sponsored tx)
	bun run jump-with-permit

collect-bounty: ## Collect corpse bounty
	bun run collect-corpse-bounty

# ─── Full Flow ──────────────────────────────────────────
setup-world: ## Deploy + configure world-contracts (legacy)
	bash setup-world/setup-world.sh

deploy-world: ## Clone, deploy world-contracts, auto-fill .env (full auto)
	bash setup-world/deploy-world.sh

deploy-world-testnet: ## Deploy world-contracts on testnet
	SUI_NETWORK=testnet bash setup-world/deploy-world.sh

zklogin: zklogin-install ## Run zkLogin CLI
	cd zklogin && bun run zklogin

# ─── Cleanup ────────────────────────────────────────────
clean: ## Remove node_modules and build artifacts
	rm -rf node_modules dist
	rm -rf dapps/node_modules dapps/dist
	rm -rf zklogin/node_modules
