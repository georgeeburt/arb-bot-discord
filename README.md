# Arbi Arbitrage Bot

Arbi is a Discord bot which delivers real-time updates on arbitrage trades on Solana. Users can track up to one wallet at a time. Tracking uses Websocket connections to subscribe to real-time updates on accounts.

![Discord](https://img.shields.io/discord/1331606919512850443?logo=discord&link=https%3A%2F%2Fdiscord.gg%2FVSMPyfC6vC)
[![Code Style](https://img.shields.io/badge/code%20style-prettier-%23FF69B4?style=flat&labelColor=gray)](https://github.com/prettier/prettier)

## Environment Vaiables

| Variable                  | Description                                    |
|---------------------------|------------------------------------------------|
| `DISCORD_TOKEN`           | Your Discorb bot token secret.                 |
| `DATABASE_URL`            | Your Postgres DB URL.                          |
| `RPC_ENDPOINT`            | Your Solana RPC endpoint.                      |
| `RPC_WSS_ENDPOINT`        | Your Solana Websocket RPC endpoint.            |
| `LOGTAIL_SOURCE_TOKEN`    | Your Logtail source token for log transports.  |
| `NODE_ENV`                | The current Node environment.                  |
