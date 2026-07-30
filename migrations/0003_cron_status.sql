CREATE TABLE cron_status (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_run_at INTEGER,
  status TEXT NOT NULL DEFAULT 'never_run',
  message TEXT,
  tickers_checked INTEGER,
  alerts_sent INTEGER
);
