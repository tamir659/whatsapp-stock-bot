import type { Env } from "../config";

export type Condition = "above" | "below" | "near";

export interface WatchlistRow {
  id: number;
  ticker: string;
  target_price: number;
  condition: Condition;
  near_pct: number | null;
  added_by: string;
  created_at: number;
  last_alert_price: number | null;
  last_alert_at: number | null;
  triggered: number;
}

// Always inserts a new row — the same ticker can appear more than once per user
// with different targets (e.g. AAPL above 200 AND AAPL below 150 at once).
export async function addRow(
  env: Env,
  ticker: string,
  targetPrice: number,
  condition: Condition,
  nearPct: number | null,
  addedBy: string
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO watchlist
       (ticker, target_price, condition, near_pct, added_by, created_at, last_alert_price, last_alert_at, triggered)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, NULL, 0)`
  )
    .bind(ticker, targetPrice, condition, nearPct, addedBy, Date.now())
    .run();
}

// Removes every entry for this ticker (if there are duplicates with different
// targets, all of them go — there's no partial-remove syntax).
export async function removeRow(env: Env, ticker: string, addedBy: string): Promise<boolean> {
  const result = await env.DB.prepare(
    `DELETE FROM watchlist WHERE ticker = ?1 AND added_by = ?2`
  )
    .bind(ticker, addedBy)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function clearRows(env: Env, addedBy: string): Promise<number> {
  const result = await env.DB.prepare(`DELETE FROM watchlist WHERE added_by = ?1`)
    .bind(addedBy)
    .run();
  return result.meta.changes ?? 0;
}

export async function listRows(env: Env, addedBy: string): Promise<WatchlistRow[]> {
  const result = await env.DB.prepare(
    `SELECT * FROM watchlist WHERE added_by = ?1 ORDER BY ticker ASC`
  )
    .bind(addedBy)
    .all<WatchlistRow>();
  return result.results ?? [];
}

// Every surviving row is "active" — a triggered row gets deleted immediately
// (see deleteRowById) rather than kept around with a flag.
export async function listActiveRows(env: Env): Promise<WatchlistRow[]> {
  const result = await env.DB.prepare(`SELECT * FROM watchlist`).all<WatchlistRow>();
  return result.results ?? [];
}

export async function deleteRowById(env: Env, id: number): Promise<void> {
  await env.DB.prepare(`DELETE FROM watchlist WHERE id = ?1`).bind(id).run();
}
