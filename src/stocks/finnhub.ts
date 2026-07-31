import type { Env } from "../config";

export interface Quote {
  ticker: string;
  price: number;
}

interface FinnhubQuoteResponse {
  c: number; // current price
}

// Retries once before giving up — a single failed/zero response can be a transient
// Finnhub hiccup (network blip, momentary no-data), not proof the ticker is invalid.
// Found via a real case: WULF (a genuine NASDAQ ticker) got rejected as "invalid" on
// a one-off Finnhub failure.
export async function getQuote(env: Env, ticker: string): Promise<Quote | null> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${env.FINNHUB_KEY}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as FinnhubQuoteResponse;
      if (typeof data.c === "number" && data.c !== 0) {
        return { ticker, price: data.c };
      }
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
