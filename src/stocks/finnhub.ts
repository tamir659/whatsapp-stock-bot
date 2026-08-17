import type { Env } from "../config";
import { toFinnhubSymbol } from "./crypto";

export interface Quote {
  ticker: string;
  price: number;
}

interface FinnhubQuoteResponse {
  c: number; // current price
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retries with a short delay before giving up — a single failed/zero response can be
// a transient Finnhub hiccup (network blip, momentary no-data), not proof the ticker
// is invalid. Found via real cases: WULF and BMNR (both genuine tickers) got rejected
// as "invalid" on transient failures; a no-delay double-attempt still wasn't always
// enough (BMNR took the user 3 manual retries), so this waits briefly between tries.
export async function getQuote(env: Env, ticker: string): Promise<Quote | null> {
  const apiSymbol = toFinnhubSymbol(ticker);
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(apiSymbol)}&token=${env.FINNHUB_KEY}`;
  const maxAttempts = 4;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as FinnhubQuoteResponse;
      if (typeof data.c === "number" && data.c !== 0) {
        return { ticker, price: data.c };
      }
    } else {
      // Drain the body even on failure — an unread response body on a retried fetch()
      // is what triggers Workers' "stalled HTTP response" deadlock-prevention cancellation
      // (seen live in production cron logs, multiple tickers retrying in parallel).
      await res.text().catch(() => {});
    }
    if (attempt < maxAttempts - 1) {
      await sleep(400);
    }
  }

  return null;
}

// Fires one request per ticker in parallel. Fine at this project's scale
// (well under Finnhub's 60 calls/min free-tier limit and Workers' 50-subrequest cap).
export async function getQuotes(env: Env, tickers: string[]): Promise<Quote[]> {
  const results = await Promise.all(tickers.map((t) => getQuote(env, t)));
  return results.filter((q): q is Quote => q !== null);
}
