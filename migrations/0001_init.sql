-- Every developer we track. `loc` is the curated location slug (or 'other').
-- Stats are the last 12 months; NULL commits = discovered but not fetched yet.
CREATE TABLE IF NOT EXISTS users (
  login TEXT PRIMARY KEY COLLATE NOCASE,
  id INTEGER NOT NULL,
  name TEXT,
  location TEXT,
  company TEXT,
  loc TEXT NOT NULL,
  followers INTEGER NOT NULL DEFAULT 0,
  commits INTEGER,
  prs INTEGER,
  reviews INTEGER,
  issues INTEGER,
  contributions INTEGER,
  fetched_at INTEGER
);
CREATE INDEX IF NOT EXISTS users_loc_fetched ON users (loc, fetched_at);

-- Precomputed leaderboard per location: one row read serves a whole page.
CREATE TABLE IF NOT EXISTS boards (
  loc TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  built_at INTEGER NOT NULL
);

-- Crawler bookkeeping per location.
CREATE TABLE IF NOT EXISTS crawl (
  loc TEXT PRIMARY KEY,
  total INTEGER,
  discovered_at INTEGER,
  refreshed_at INTEGER
);
