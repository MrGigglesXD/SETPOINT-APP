-- Match format columns for history display
ALTER TABLE matches ADD COLUMN match_type TEXT NOT NULL DEFAULT 'exhibition';
ALTER TABLE matches ADD COLUMN win_by_two INTEGER NOT NULL DEFAULT 1;
