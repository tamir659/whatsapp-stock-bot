import type { Env } from "../config";

export interface Quote {
  ticker: string;
  price: number;
}

interface FinnhubQuoteResponse {
  c: number; // current price
}

export async function getQuote(env: Env, ticker: string): Promise<Quote | null> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${env.FINNHUB_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as FinnhubQuoteResponse;
  if (typeof data.c !== "number" || data.c === 0) return null;
  return { ticker, price: data.c };
}

// Fires one request per ticker in parallel. Fine at this project's scale
// (well under Finnhub's 60 calls/min free-tier limit and Workers' 50-subrequest cap).
export async function getQuotes(env: Env, tickers: string[]): Promise<Quote[]> {
  const results = await Promise.all(tickers.map((t) => getQuote(env, t)));
  return results.filter((q): q is Quote => q !== null);
}
