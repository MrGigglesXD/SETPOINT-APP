-- Add explicit start/finish timestamps for match history display
ALTER TABLE matches ADD COLUMN started_at TEXT NOT NULL DEFAULT '';
ALTER TABLE matches ADD COLUMN finished_at TEXT NOT NULL DEFAULT '';
