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

export async function addRow(
  env: Env,
  ticker: string,
  targetPrice: number,
  condition: Condition,
  nearPct: number | null,
  addedBy: string
): Promise<void> {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO watchlist
       (id, ticker, target_price, condition, near_pct, added_by, created_at, last_alert_price, last_alert_at, triggered)
     VALUES (
       (SELECT id FROM watchlist WHERE ticker = ?1 AND added_by = ?5),
       ?1, ?2, ?3, ?4, ?5, ?6, NULL, NULL, 0
     )`
  )
    .bind(ticker, targetPrice, condition, nearPct, addedBy, Date.now())
    .run();
}

export async function removeRow(env: Env, ticker: string, addedBy: string): Promise<boolean> {
  const result = await env.DB.prepare(
    `DELETE FROM watchlist WHERE ticker = ?1 AND added_by = ?2`
  )
    .bind(ticker, addedBy)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function listRows(env: Env, addedBy: string): Promise<WatchlistRow[]> {
  const result = await env.DB.prepare(
    `SELECT * FROM watchlist WHERE added_by = ?1 ORDER BY ticker ASC`
  )
    .bind(addedBy)
    .all<WatchlistRow>();
  return result.results ?? [];
}

export async function listActiveRows(env: Env): Promise<WatchlistRow[]> {
  const result = await env.DB.prepare(
    `SELECT * FROM watchlist WHERE triggered = 0`
  ).all<WatchlistRow>();
  return result.results ?? [];
}

export async function markAlerted(env: Env, ticker: string, addedBy: string, price: number): Promise<void> {
  await env.DB.prepare(
    `UPDATE watchlist SET last_alert_price = ?3, last_alert_at = ?4, triggered = 1 WHERE ticker = ?1 AND added_by = ?2`
  )
    .bind(ticker, addedBy, price, Date.now())
    .run();
}
