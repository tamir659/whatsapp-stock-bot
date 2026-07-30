import type { Env } from "../config";
import { listRows } from "../db/watchlist";

export async function handleList(env: Env, from: string): Promise<string> {
  const rows = await listRows(env, from);
  if (rows.length === 0) {
    return "Your watchlist is empty. Add one with: add AAPL 220";
  }

  const lines = rows.map((r) => {
    const status = r.triggered ? " (alert already sent)" : "";
    const target =
      r.condition === "near"
        ? `within ${r.near_pct}% of ${r.target_price}`
        : `${r.condition} ${r.target_price}`;
    return `${r.ticker}: ${target}${status}`;
  });

  return `Watchlist:\n${lines.join("\n")}`;
}
