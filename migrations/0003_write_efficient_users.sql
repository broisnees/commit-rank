-- Write-efficient layout: WITHOUT ROWID keeps rows in the primary-key b-tree (no separate
-- PK index) and the only secondary index is on `loc`, which a stats refresh never changes.
-- A stats update now costs 1 written row instead of 2, an insert 2 instead of 3.
CREATE TABLE users_v3 (
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
  fetched_at INTEGER,
  active_days INTEGER,
  automated INTEGER NOT NULL DEFAULT 0
) WITHOUT ROWID;

INSERT INTO users_v3 (login, id, name, location, company, loc, followers, commits, prs, reviews,
                      issues, contributions, fetched_at, active_days, automated)
SELECT login, id, name, location, company, loc, followers, commits, prs, reviews,
       issues, contributions, fetched_at, active_days, automated
FROM users;

DROP TABLE users;
ALTER TABLE users_v3 RENAME TO users;
CREATE INDEX users_loc ON users (loc);
