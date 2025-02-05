# Arbi Arbitrage Bot

Arbi is a Discord bot which delivers real-time updates on arbitrage trades on Solana. Users can track up to one wallet at a time. Tracking uses Websocket connections to subscribe to real-time updates on accounts.

[![Discord](https://img.shields.io/discord/1331606919512850443?logo=discord)](https://discord.gg/VSMPyfC6vC)
[![Code Style](https://img.shields.io/badge/code%20style-prettier-%23FF69B4?style=flat&labelColor=gray)](https://github.com/prettier/prettier)

## Prerequisites

- [Node.js v18+](https://nodejs.org/)
- [pnpm](https://pnpm.io/)
- [PostgreSQL](https://www.postgresql.org/download/)

## Installation

> This project uses [pnpm](https://pnpm.io/), a fast, disk-efficient package manager. If you dont have `pnpm` installed, you can install it globally by running:
> ```bash
> npm install -g pnpm
> ```

### 1. Clone the repository:

```bash
git clone https://github.com/your-username/arbi.git
```

### 2. Navigate to the project directory:

```bash
cd arbi
```

### 3. Install dependencies using `pnpm`:

```bash
pnpm install
```

### 4. Create a `.env` file and populate it with the appropriate [environment variables](#environment-vaiables)

```bash
touch .env
```

### 5. Run the development bot:

```bash
pnpm dev
```

## Development Scripts

| Command                   | Description                                    |
|---------------------------|------------------------------------------------|
| `pnpm dev`                | Run the bot in a development environment.      |
| `pnpm start`              | Runs the bot in production.                    |
| `pnpm build`              | Builds the project.                            |
| `pnpm format`             | Runs prettier formatter on the code.           |
| `pnpm format:check`       | Runs a prettier formatting check on the code.  |
| `pnpm lint`               | Runs ESLint on the code.                       |

## Environment Vaiables

| Variable                  | Description                                    |
|---------------------------|------------------------------------------------|
| `DISCORD_TOKEN`           | Your Discord bot token secret.                 |
| `DATABASE_URL`            | Your Postgres DB URL.                          |
| `RPC_ENDPOINT`            | Your Solana RPC endpoint.                      |
| `RPC_WSS_ENDPOINT`        | Your Solana Websocket RPC endpoint.            |
| `LOGTAIL_SOURCE_TOKEN`    | Your Logtail source token for log transports.  |
| `NODE_ENV`                | The current Node environment.                  |
