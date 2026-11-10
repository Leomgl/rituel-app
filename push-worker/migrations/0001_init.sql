CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  morning_time TEXT NOT NULL DEFAULT '07:30',
  evening_time TEXT NOT NULL DEFAULT '21:30',
  morning_on INTEGER NOT NULL DEFAULT 1,
  evening_on INTEGER NOT NULL DEFAULT 1,
  nudge_on INTEGER NOT NULL DEFAULT 0,
  stock_on INTEGER NOT NULL DEFAULT 0,
  special_on INTEGER NOT NULL DEFAULT 0,
  stock_low INTEGER NOT NULL DEFAULT 0,
  done_date TEXT,
  done_morning INTEGER NOT NULL DEFAULT 0,
  done_evening INTEGER NOT NULL DEFAULT 0,
  last_test INTEGER NOT NULL DEFAULT 0,
  last_seen INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS delivery_log (
  device_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (device_id, local_date, kind)
);
CREATE INDEX IF NOT EXISTS idx_delivery_log_created_at ON delivery_log(created_at);
