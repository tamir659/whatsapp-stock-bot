import type { Env } from "../config";
import { listRows, type WatchlistRow } from "../db/watchlist";

export function formatWatchlist(rows: WatchlistRow[]): string {
  if (rows.length === 0) {
    return "Your watchlist is empty. Add one with: add AAPL 220";
  }

  const lines = rows.map((r) => {
    const target =
      r.condition === "near"
        ? `within ${r.near_pct}% of ${r.target_price}`
        : `${r.condition} ${r.target_price}`;
    return `${r.ticker}: ${target}`;
  });

  return `Watchlist:\n${lines.join("\n")}`;
}

export async function handleList(env: Env, from: string): Promise<string> {
  const rows = await listRows(env, from);
  return formatWatchlist(rows);
}
