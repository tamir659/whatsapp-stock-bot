DROP INDEX IF EXISTS idx_ticker;

CREATE UNIQUE INDEX idx_ticker_owner ON watchlist(ticker, added_by);
