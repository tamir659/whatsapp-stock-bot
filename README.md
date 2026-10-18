# Stock Alert Bot (Telegram)

A serverless Telegram bot that tracks stock and crypto price targets and alerts you when a
target is hit. Runs on **Cloudflare Workers** with a **D1** (SQLite) database, checks prices
every minute on a cron trigger, and can kick off on-demand market screeners
([ma150-screener](https://github.com/tamir659/ma150-screener)) that report back through the bot.

## Features

- **Per-user watchlists** — every authorized user manages an independent list of targets
- **Price targets** — `above`, `below` or `near` a price; the same ticker can have several targets
- **Automatic alerts** — a cron job checks live quotes every minute (market-hours aware) and
  notifies the user when a target is crossed, then removes the fulfilled entry
- **Stocks and crypto** — US stocks via Finnhub; BTC / ETH / SOL with friendly aliases
- **On-demand screeners** — triggers GitHub Actions workflows (SMA proximity, oversold rebound,
  Fibonacci retracement) and relays the results back to the chat
- **Daily crypto briefing** at a fixed local time
- **Access control** — the bot is private; new chats must enter a password once
- **Ticker validation** against an allowlist stored in the database

## Commands

```
AAPL above 220        add a target (the word "add" is optional)
TSLA below 180
NVDA near 120
list                  show your watchlist
remove <ticker>       remove a ticker
clear                 clear your whole watchlist
prices                current prices for your list
menu / help           command list
```

## Architecture

```
Telegram ──webhook──▶ Cloudflare Worker ──▶ D1 (watchlists, auth, tickers)
                        │   ▲
              cron 1/min│   │results (authenticated POST)
                        ▼   │
                 Finnhub API   GitHub Actions screeners
```

## Tech stack

- TypeScript, Cloudflare Workers (webhook + cron triggers)
- Cloudflare D1 (SQLite) with SQL migrations
- Telegram Bot API (webhook verified with a secret token)
- Finnhub market-data API
- GitHub Actions (`workflow_dispatch`) for long-running screener jobs

## Project structure

```
src/index.ts            # Worker entry: routes webhook, screener callbacks and cron
src/webhook.ts          # Telegram update handling and command dispatch
src/commands/           # command parser and handlers (add, list, remove, clear, prices)
src/cron.ts             # scheduled price checks and alerts
src/stocks/             # Finnhub quotes, crypto aliases, market-hours logic
src/db/                 # D1 data access (watchlist, auth, tickers, status)
src/screener.ts         # triggers screener workflows and receives their results
src/morningBriefing.ts  # daily crypto price message
migrations/             # D1 schema migrations
```

## Setup

```bash
npm install
npx wrangler d1 create watchlist-db          # put the printed database_id in wrangler.toml
npx wrangler d1 migrations apply watchlist-db --remote
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put BOT_PASSWORD
npx wrangler secret put FINNHUB_KEY
npm run deploy
```

Then register the Worker URL as the bot's webhook with Telegram's `setWebhook` method, passing
the same `secret_token`. All secrets live in Cloudflare — none are stored in this repository.
