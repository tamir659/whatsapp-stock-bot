import type { Env } from "../config";
import { isCryptoTicker } from "../stocks/crypto";

// Local lookup against a pre-seeded list of ~13k real NASDAQ/NYSE/NYSE Arca/BATS/AMEX
// symbols (migrations/0005+0006) — fast and network-failure-proof, unlike depending
// on Finnhub's /quote endpoint for ticker validity (that endpoint can transiently
// fail even for genuine tickers; see WULF/BMNR gotchas in CLAUDE.md). Crypto tickers
// (BTC/ETH/SOL) aren't in that stock-only table, so check the small fixed allowlist first.
export async function isKnownTicker(env: Env, ticker: string): Promise<boolean> {
  if (isCryptoTicker(ticker)) return true;

  const row = await env.DB.prepare(`SELECT 1 FROM valid_tickers WHERE symbol = ?1`)
    .bind(ticker)
    .first();
  return row !== null;
}
