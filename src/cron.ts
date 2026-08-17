import type { Env } from "./config";
import { listActiveRows, deleteRowById, type WatchlistRow } from "./db/watchlist";
import { recordCronRun } from "./db/status";
import { getQuotes } from "./stocks/finnhub";
import { isMarketOpen } from "./stocks/market-hours";
import { isCryptoTicker } from "./stocks/crypto";
import { sendPriceAlertTemplate } from "./whatsapp/send";

function isTriggered(row: WatchlistRow, price: number): boolean {
  switch (row.condition) {
    case "above":
      return price >= row.target_price;
    case "below":
      return price <= row.target_price;
    case "near": {
      const pct = row.near_pct ?? 1;
      return Math.abs(price - row.target_price) / row.target_price * 100 <= pct;
    }
  }
}

async function runPriceCheck(env: Env): Promise<{ tickersChecked: number; alertsSent: number }> {
  const allRows = await listActiveRows(env);
  if (allRows.length === 0) return { tickersChecked: 0, alertsSent: 0 };

  // Stocks only trade during US market hours; crypto trades 24/7, so it's checked
  // on every cron tick regardless of isMarketOpen().
  const marketOpen = isMarketOpen();
  const rows = allRows.filter((r) => isCryptoTicker(r.ticker) || marketOpen);
  if (rows.length === 0) return { tickersChecked: 0, alertsSent: 0 };

  const uniqueTickers = [...new Set(rows.map((r) => r.ticker))];
  const quotes = await getQuotes(env, uniqueTickers);
  const priceByTicker = new Map(quotes.map((q) => [q.ticker, q.price]));

  let alertsSent = 0;
  for (const row of rows) {
    const price = priceByTicker.get(row.ticker);
    if (price === undefined) continue;
    if (!isTriggered(row, price)) continue;

    const params = {
      ticker: row.ticker,
      currentPrice: price.toFixed(2),
      targetPrice: row.target_price.toFixed(2),
      condition: row.condition,
    };

    await sendPriceAlertTemplate(env, row.added_by, params);
    await deleteRowById(env, row.id);
    alertsSent++;
  }

  return { tickersChecked: rows.length, alertsSent };
}

export async function checkPrices(env: Env): Promise<void> {
  try {
    const { tickersChecked, alertsSent } = await runPriceCheck(env);
    await recordCronRun(env, "ok", `checked ${tickersChecked}, alerted ${alertsSent}`, tickersChecked, alertsSent);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await recordCronRun(env, "error", message, 0, 0);
    throw err;
  }
}
