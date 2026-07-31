-- Allow the same ticker to appear more than once per user with different
-- targets (e.g. AAPL above 200 AND AAPL below 150 at the same time).
DROP INDEX IF EXISTS idx_ticker_owner;
