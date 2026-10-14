import type { Env } from "./config";
import { extractMessages, type TelegramUpdate } from "./telegram/types";
import { sendMessage } from "./telegram/send";
import { verifySecret } from "./telegram/verify";
import { isAuthorized, authorize } from "./db/authorized";
import { parseCommand } from "./commands/parser";
import { handleAdd } from "./commands/add";
import { handleRemove } from "./commands/remove";
import { handleList } from "./commands/list";
import { handlePrices } from "./commands/prices";
import { handleClear } from "./commands/clear";
import { triggerScreenerScan, triggerReboundScan } from "./screener";

const HELP_TEXT = [
  "Commands:",
  "ticker above/below price — e.g. AAPL above 220 (\"add\" is optional)",
  "ticker near price pct% — alerts within a % range",
  "crypto tickers also work: BTC, ETH, SOL (or bitcoin/ethereum/solana)",
  "remove ticker — removes it from your list",
  "list — shows your watchlist",
  "prices — live prices for your list",
  "clear — empties your list",
  "150 — finds stocks near their 150-day average",
  "20 — finds stocks near their 20-day average",
  "rebound / ath — deep-dive: stocks well below their all-time high with oversold signals, plus an AI writeup per candidate",
  "menu / help — shows this list",
].join("\n");

async function handleIncomingMessages(request: Request, env: Env): Promise<Response> {
  const secretHeader = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (!verifySecret(secretHeader, env.TELEGRAM_WEBHOOK_SECRET)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const messages = extractMessages(update);

  for (const msg of messages) {
    if (!(await isAuthorized(env, msg.from))) {
      if (env.BOT_PASSWORD && msg.text.trim() === env.BOT_PASSWORD) {
        await authorize(env, msg.from);
        await sendMessage(env, msg.from, `Correct — you're authorized.\n\n${HELP_TEXT}`);
      } else {
        await sendMessage(env, msg.from, "This bot is private. Enter the password to continue.");
      }
      continue;
    }

    const cmd = parseCommand(msg.text);
    let reply: string;

    switch (cmd.action) {
      case "add":
        reply = await handleAdd(env, cmd, msg.from);
        break;
      case "remove":
        reply = await handleRemove(env, cmd, msg.from);
        break;
      case "list":
        reply = await handleList(env, msg.from);
        break;
      case "prices":
        reply = await handlePrices(env, msg.from);
        break;
      case "clear":
        reply = await handleClear(env, msg.from);
        break;
      case "help":
        reply = HELP_TEXT;
        break;
      case "screener":
        try {
          await triggerScreenerScan(env, msg.from, cmd.period);
          reply = `Scanning the S&P 500 for stocks closest to their ${cmd.period}-day moving average — I'll message you the list in a few minutes.`;
        } catch {
          reply = "Couldn't start the screener scan right now, sorry — try again in a bit.";
        }
        break;
      case "rebound":
        try {
          await triggerReboundScan(env, msg.from);
          reply =
            "Scanning for stocks well below their all-time high with oversold signals, plus writing up an analysis for each — this one takes a few extra minutes since it includes an AI writeup.";
        } catch {
          reply = "Couldn't start the rebound scan right now, sorry — try again in a bit.";
        }
        break;
      default:
        reply = `Not sure what you mean — here's what I can do:\n\n${HELP_TEXT}`;
    }

    await sendMessage(env, msg.from, reply);
  }

  // Always 200 quickly — Telegram retries with backoff if it doesn't get one.
  return new Response("OK", { status: 200 });
}

export async function handleWebhookRequest(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET") return new Response("ok", { status: 200 });
  if (request.method === "POST") return handleIncomingMessages(request, env);
  return new Response("Method Not Allowed", { status: 405 });
}
