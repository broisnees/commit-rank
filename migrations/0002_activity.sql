-- Active days (days with any contribution in the last 12 months) and an automation flag.
ALTER TABLE users ADD COLUMN active_days INTEGER;
ALTER TABLE users ADD COLUMN automated INTEGER NOT NULL DEFAULT 0;

-- Until each user is re-fetched with active days, flag the obvious outliers
-- (100+ commits or 150+ contributions per day across the whole year).
UPDATE users SET automated = 1 WHERE commits >= 36500 OR contributions >= 54750;
