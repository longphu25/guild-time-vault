# Chapter 5: Docker Development Environment

Welcome back, builder! In our previous chapters, you've learned a lot about the EVE Frontier: from the foundational [Smart Assemblies](01_eve_frontier_world__smart_assemblies__.md) and how to extend them with [Move Contracts & Extensions](02_move_contracts___extensions_.md), to interacting with the blockchain using [TypeScript Interaction Scripts](03_typescript_interaction_scripts_.md) and even how your scripts reliably find objects using [Object ID Derivation](04_object_id_derivation_.md).

Now, imagine you have all these amazing tools and blueprints for building, but your workbench is a mess! You might need to install the Sui CLI, Node.js, `pnpm`, and deal with different versions or operating systems. It can get complicated quickly.

This is where the **Docker Development Environment** comes to the rescue! It provides you with a clean, ready-to-use, and isolated "workbench" that has all the tools you need pre-installed and perfectly organized.

## The Problem: A Messy Local Setup

Developing on a blockchain like Sui often requires several tools:

*   **Sui CLI:** To build and publish your Move contracts, and interact directly with the Sui network.
*   **Node.js:** To run your TypeScript interaction scripts.
*   **`pnpm`:** A package manager for Node.js projects, used by `builder-scaffold`.
*   **A local Sui blockchain node:** To test your contracts without using public testnets.

Installing and configuring all these manually can be tricky. You might run into:

*   **Operating System differences:** What works on macOS might break on Windows or Linux.
*   **Version conflicts:** An update to Node.js might break your Sui CLI.
*   **Dependency hell:** Managing all the different software packages.

It's like having to set up a new woodworking shop every time you start a project – you have to find all your tools, make sure they work together, and clean up the sawdust.

## The Solution: A Portable Workbench with Docker

Docker solves this problem by providing a consistent, isolated environment.

Imagine a **shipping container** for your software. Inside this container, we've carefully packed:

*   The latest **Sui CLI**
*   **Node.js**
*   **`pnpm`**
*   Even a **local Sui blockchain** that starts up automatically!

This "Docker container" runs on your computer, but it's completely separate from your computer's normal operating system. It's like having a mini-computer *inside* your computer, pre-configured for EVE Frontier development.

**Key Benefits:**

*   **Ready-to-use:** No manual installation of most tools on your computer.
*   **Isolated:** No conflicts with other software on your machine.
*   **Consistent:** Everyone on the team (or even just you across different machines) gets the exact same environment.
*   **Portable:** You can easily move your development setup between different computers.

Instead of installing everything, you just run the Docker container, and it gives you a command line where all the tools are already waiting for you.

## Your First Dockerized Development Session

Let's use the Docker Development Environment to set up our `builder-scaffold` project. This will allow us to deploy the EVE Frontier World, publish our extensions, and run our TypeScript interaction scripts – all within this clean, isolated container.

### Prerequisites

You only need one thing installed on your host computer:

*   **Docker:** Follow the official instructions to install [Docker Desktop](https://docs.docker.com/get-docker/) for your operating system (Windows, macOS, Linux).

### Quick Start: Launching Your Environment

Open your terminal or command prompt, navigate to the `docker/` directory within your `builder-scaffold` project, and run this command:

```bash
cd docker
docker compose run --rm --service-ports sui-dev
```

*What this command does:*
*   `cd docker`: Navigates into the `docker` folder where the Docker configuration files live.
*   `docker compose run`: Tells Docker Compose (a tool to manage multiple Docker containers) to run a service.
*   `--rm`: Automatically removes the container once you exit it (keeps your system clean).
*   `--service-ports`: Maps the ports defined in the Docker configuration (like the Sui local node's port 9000) to your host machine.
*   `sui-dev`: This is the name of our development service, defined in `docker-compose.yml`.

### First Run Experience

The very first time you run this command, Docker will:

1.  **Build the image:** It will read the `Dockerfile` (the "recipe") and create the container image. This might take a few minutes as it installs Node.js, `pnpm`, and the Sui CLI.
2.  **Start up:** Once built, it will start the `sui-dev` container.
3.  **Key Generation:** Inside the container, a script will run that generates three new Sui keypairs for you (`ADMIN`, `PLAYER_A`, `PLAYER_B`) and saves them in `docker/.env.sui`.
4.  **Local Sui Node:** It will then start a fresh local Sui blockchain node.
5.  **Fund Accounts:** It will automatically fund your new `ADMIN`, `PLAYER_A`, and `PLAYER_B` accounts from the local faucet.
6.  **Drop to Shell:** Finally, you'll be dropped into a `bash` shell *inside* the container, ready to work!

You'll see output similar to this:

```
[sui-dev] First run — initialising keys...
[sui-dev] Creating keypairs: ADMIN, PLAYER_A, PLAYER_B...
# ... key generation output ...
[sui-dev] Starting local Sui node...
# ... Sui node startup logs ...
[sui-dev] RPC responding, waiting for full initialization...
[sui-dev] Node ready.
[sui-dev] Funding accounts from faucet...
# ... faucet funding logs ...

================================================
 Sui dev environment ready
 Local node RPC: http://127.00.1:9000
 Keys:           docker/.env.sui
================================================

root@<container-id>:/workspace#
```

Congratulations! You're now inside your portable development environment.

### Workspace Layout: Your Files, Inside the Container

While you're working inside the Docker container, your `builder-scaffold` project files are seamlessly shared. This is done using **Docker Volumes**.

Think of a Docker Volume as a special "window" that allows the container to see and modify files on your host computer.

```
Your Host Computer
├── builder-scaffold/    <-- This entire project folder
│   ├── move-contracts/
│   ├── ts-scripts/
│   └── docker/
│       ├── Dockerfile
│       ├── compose.yml
│       └── ...
└── (other files on your host)

Inside the Docker Container
/workspace/
├── builder-scaffold/    <-- This is your project, synced!
│   ├── move-contracts/
│   ├── ts-scripts/
│   └── docker/
│       ├── Dockerfile
│       ├── compose.yml
│       └── ...
└── world-contracts/     <-- A separate folder, also synced for the core world.
```
*What this simplified diagram means:* You edit your Move contracts or TypeScript scripts on your host machine using your favorite code editor (VS Code, Sublime Text, etc.). When you run commands inside the Docker container, it sees these updated files directly in `/workspace/builder-scaffold/`.

### Example: Building a Move Contract Inside Docker

Now that you're in the container, you can run all the commands we discussed in previous chapters. For instance, to build our `smart_gate_extension` from [Chapter 2: Move Contracts & Extensions](02_move_contracts___extensions_.md):

```bash
# Inside the Docker container (at root@<container-id>:/workspace#)
cd builder-scaffold/move-contracts/smart_gate_extension
sui move build -e testnet
```
*What this does:* The `sui move build` command runs *inside* the Docker container. It uses the Sui CLI that's installed there to compile your Move code, even though you might not have `sui` installed directly on your host machine!

## Under the Hood: How Docker Works Its Magic

Let's quickly peek at the core files that make this Docker setup possible in the `builder-scaffold` project.

### 1. `Dockerfile`: The Recipe for Your Environment

The `Dockerfile` in `docker/` is like a cooking recipe. It lists all the ingredients (base operating system) and steps (install Node.js, Sui CLI, `pnpm`) to create your perfect development environment.

```dockerfile
# docker/Dockerfile (simplified)
FROM docker.io/library/ubuntu:24.04 # Start with a clean Ubuntu system

# Install system dependencies (curl, git, nodejs, pnpm)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gnupg git nodejs && npm install -g pnpm

# Install Sui CLI via suiup
ENV PATH="/root/.local/bin:/root/.suiup/bin:${PATH}"
RUN curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/install.sh | sh \
    && echo y | suiup install sui

WORKDIR /workspace # Set the default working directory inside the container

# Copy our entrypoint script
COPY scripts/ /workspace/scripts/
RUN chmod +x /workspace/scripts/*.sh

ENTRYPOINT ["/workspace/scripts/entrypoint.sh"] # What to run when the container starts
```
*What this simplified code means:*
*   `FROM`: Specifies the base operating system (Ubuntu 24.04 in this case).
*   `RUN`: Executes commands to install necessary software like `nodejs`, `pnpm`, and the `sui` CLI.
*   `WORKDIR`: Sets the default folder you'll be in (`/workspace/`) when the container starts.
*   `ENTRYPOINT`: Specifies the script (`entrypoint.sh`) that runs automatically whenever the Docker container starts up.

### 2. `docker-compose.yml`: Running Your Services

The `docker-compose.yml` file in `docker/` defines how to run one or more Docker containers together. For `builder-scaffold`, it primarily sets up our `sui-dev` container.

```yaml
# docker/compose.yml (simplified)
services:
  sui-dev: # Our main development container
    build: . # Build using the Dockerfile in the current directory
    stdin_open: true # Keep stdin open for interactive sessions
    tty: true # Allocate a pseudo-TTY for an interactive shell
    ports:
      - "9000:9000" # Map host port 9000 to container port 9000 (for Sui node RPC)
    volumes:
      - sui-config:/root/.sui # Persistent storage for Sui keys and config
      - ../:/workspace/builder-scaffold # Sync your local project folder to /workspace/builder-scaffold
      - ./world-contracts:/workspace/world-contracts # Sync the world-contracts folder

volumes:
  sui-config: # Define a named volume for Sui configuration
```
*What this simplified code means:*
*   `services`: Defines different containers. We have `sui-dev`.
*   `build: .`: Tells Docker to build the container using the `Dockerfile` in the current directory (`docker/`).
*   `ports: - "9000:9000"`: This is crucial! It means that the Sui local node running *inside* the container on port 9000 can be accessed from your *host machine* at `http://127.0.0.1:9000`. This allows external tools (or even your host's `sui client`) to connect.
*   `volumes`: These lines set up the "windows" to your host machine's files.
    *   `sui-config:/root/.sui`: Creates a special persistent storage area for your Sui keys and client configuration, so they aren't lost when the container stops.
    *   `../:/workspace/builder-scaffold`: This maps the parent directory (your entire `builder-scaffold` project) to `/workspace/builder-scaffold` inside the container. This is how your local code edits appear instantly inside the container.

### 3. `entrypoint.sh`: The Startup Script

The `docker/scripts/entrypoint.sh` is a special shell script that runs when the `sui-dev` container starts. It automates all the setup tasks so you don't have to do them manually.

```bash
#!/usr/bin/env bash
# docker/scripts/entrypoint.sh (simplified)
set -e # Exit immediately if a command exits with a non-zero status

SUI_CFG="${SUI_CONFIG_DIR:-/root/.sui}" # Define Sui config directory
KEYSTORE="$SUI_CFG/sui.keystore"
INIT_MARKER="$SUI_CFG/.initialized"
ENV_FILE="/workspace/builder-scaffold/docker/.env.sui"

# --- first-run: create keys ---
if [ ! -f "$INIT_MARKER" ]; then # Check if keys have been created before
  echo "[sui-dev] First run — initialising keys..."
  # ... create client.yaml and keypairs (ADMIN, PLAYER_A, PLAYER_B) ...
  touch "$INIT_MARKER" # Mark as initialized
fi

# --- wait for postgres (if enabled in compose.override.yml) ---
# ... logic to wait for and reset the PostgreSQL database ...

# --- start local node ---
echo "[sui-dev] Starting local Sui node..."
sui start --with-faucet --force-regenesis & # Start Sui node in background
# ... wait for RPC to be ready ...

# --- fund accounts ---
echo "[sui-dev] Funding accounts from faucet..."
# ... loop through ADMIN, PLAYER_A, PLAYER_B and request faucet funds ...

# --- write .env.sui for TS scripts ---
# ... export private keys and addresses to ENV_FILE ...

# --- ready ---
echo "Sui dev environment ready"
exec "${@:-bash}" # Keep the container running and drop to an interactive bash shell
```
*What this simplified code means:*
*   **First Run Logic:** It checks for an `.initialized` marker. If it's the first time, it creates the Sui keystore, client configuration, and new keypairs.
*   **Postgres Setup (Optional):** If you use the optional PostgreSQL indexer (via `docker-compose.override.yml`), this part ensures the database is ready and resets it for a clean start.
*   **Sui Node Startup:** It runs `sui start --with-faucet --force-regenesis`, which launches a local Sui node with a faucet (for getting test coins) and resets the blockchain state every time for a fresh development environment. It then waits until the node's RPC (Remote Procedure Call) is available.
*   **Account Funding:** It uses the `sui client faucet` command to get test SUI coins for your newly created accounts.
*   **`.env.sui` Generation:** It extracts the private keys and addresses of your generated accounts and writes them to a `.env.sui` file, which your TypeScript scripts (as seen in [Chapter 3](03_typescript_interaction_scripts__.md)) will use to sign transactions.
*   **`exec "${@:-bash}"`:** This is the final and very important step. It replaces the `entrypoint.sh` process with an interactive `bash` shell, allowing you to type commands directly into the container.

This entire automated process ensures that every time you start your Docker development environment, you have a fresh, fully configured, and functional Sui blockchain, ready for you to build and test.

## Conclusion

You've successfully set up your **Docker Development Environment**! You now understand that Docker provides a robust, isolated "workbench" that bundles all your necessary EVE Frontier development tools, freeing you from complex local installations. You've walked through launching this environment, seen how your local files are synced, and gained insight into how the `Dockerfile`, `docker-compose.yml`, and `entrypoint.sh` script work together to automate your setup.

With this powerful, consistent environment at your fingertips, you're perfectly positioned to focus on building without worrying about your setup. In the next chapter, we'll connect all these concepts by exploring the **DApp Client (Frontend)**, showing you how users will interact with your on-chain creations through a web interface.

[Next Chapter: DApp Client (Frontend)](06_dapp_client__frontend__.md)

---

<sub><sup>Generated by [AI Codebase Knowledge Builder](https://github.com/The-Pocket/Tutorial-Codebase-Knowledge).</sup></sub> <sub><sup>**References**: [[1]](https://github.com/evefrontier/builder-scaffold/blob/ebc321a760e3701954e3d445fa92fe881267ea94/docker/Dockerfile), [[2]](https://github.com/evefrontier/builder-scaffold/blob/ebc321a760e3701954e3d445fa92fe881267ea94/docker/compose.yml), [[3]](https://github.com/evefrontier/builder-scaffold/blob/ebc321a760e3701954e3d445fa92fe881267ea94/docker/readme.md), [[4]](https://github.com/evefrontier/builder-scaffold/blob/ebc321a760e3701954e3d445fa92fe881267ea94/docker/scripts/entrypoint.sh)</sup></sub>