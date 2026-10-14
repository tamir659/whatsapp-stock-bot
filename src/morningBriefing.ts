import type { Env } from "./config";
import { getQuotes } from "./stocks/finnhub";
import { sendMessage } from "./telegram/send";

// Fires once at 10:00 Asia/Jerusalem — computed from real local time (like isMarketOpen())
// rather than a fixed UTC cron entry, so it doesn't drift across Israel's DST transitions.
export function isBriefingTime(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return Number(get("hour")) === 10 && Number(get("minute")) === 0;
}

function formatBriefing(prices: Map<string, number>): string {
  const lines: string[] = [];
  for (const ticker of ["BTC", "ETH"]) {
    const price = prices.get(ticker);
    lines.push(price !== undefined ? `${ticker}: $${price.toFixed(2)}` : `${ticker}: unavailable right now`);
  }
  return lines.join("\n");
}

// Deliberately sent only to OWNER_CHAT_ID, not every authorized user — this is a personal
// daily digest for the one person who asked for it, not a broadcast.
export async function sendMorningBriefing(env: Env): Promise<void> {
  if (!env.OWNER_CHAT_ID) return;
  const quotes = await getQuotes(env, ["BTC", "ETH"]);
  const prices = new Map(quotes.map((q) => [q.ticker, q.price]));
  await sendMessage(env, env.OWNER_CHAT_ID, formatBriefing(prices));
}
