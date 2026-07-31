import type { Env } from "../config";
import { listRows } from "../db/watchlist";
import { getQuotes } from "../stocks/finnhub";

export async function handlePrices(env: Env, from: string): Promise<string> {
  const rows = await listRows(env, from);
  if (rows.length === 0) {
    return "Your watchlist is empty. Add one with: add AAPL 220";
  }

  const quotes = await getQuotes(env, rows.map((r) => r.ticker));
  const priceByTicker = new Map(quotes.map((q) => [q.ticker, q.price]));

  const lines = rows.map((r) => {
    const price = priceByTicker.get(r.ticker);
    const priceText = price !== undefined ? `$${price.toFixed(2)}` : "price unavailable";
    const target =
      r.condition === "near"
        ? `target: within ${r.near_pct}% of ${r.target_price}`
        : `target: ${r.condition} ${r.target_price}`;
    return `📈 ${r.ticker}: ${priceText} (${target})`;
  });

  return lines.join("\n");
}
