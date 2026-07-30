CREATE TABLE watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT NOT NULL,
  target_price REAL NOT NULL,
  condition TEXT NOT NULL,           -- 'above' | 'below' | 'near'
  near_pct REAL,                     -- only used when condition = 'near'
  added_by TEXT NOT NULL,            -- WhatsApp phone number of whoever added it
  created_at INTEGER NOT NULL,
  last_alert_price REAL,
  last_alert_at INTEGER,
  triggered INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX idx_ticker ON watchlist(ticker);
