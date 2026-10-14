// Small, deliberately fixed allowlist (not the full valid_tickers approach used for
// stocks) — crypto trades 24/7 under a different Finnhub symbol format (EXCHANGE:PAIR),
// so it needs its own validation + quote-symbol mapping rather than reusing the
// NASDAQ/NYSE-only D1 table.
const CRYPTO_FINNHUB_SYMBOL: Record<string, string> = {
  BTC: "BINANCE:BTCUSDT",
  ETH: "BINANCE:ETHUSDT",
  SOL: "BINANCE:SOLUSDT",
};

export function isCryptoTicker(ticker: string): boolean {
  return ticker in CRYPTO_FINNHUB_SYMBOL;
}

// Casual names people actually type for the few crypto tickers this bot supports.
// Expects an already-uppercased token in, returns it unchanged if there's no alias.
const CRYPTO_ALIASES: Record<string, string> = {
  BITCOIN: "BTC",
  ביטקוין: "BTC",
  ETHEREUM: "ETH",
  אתריום: "ETH",
  SOLANA: "SOL",
  סולנה: "SOL",
};

export function resolveCryptoAlias(upperTicker: string): string {
  return CRYPTO_ALIASES[upperTicker] ?? upperTicker;
}

// The watchlist stores/displays the friendly ticker (e.g. "BTC"); only the outbound
// Finnhub request needs the exchange-prefixed symbol.
export function toFinnhubSymbol(ticker: string): string {
  return CRYPTO_FINNHUB_SYMBOL[ticker] ?? ticker;
}
