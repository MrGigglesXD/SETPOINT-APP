-- Queue position and waiting timestamp for stable FIFO rotation
ALTER TABLE players ADD COLUMN waiting_since TEXT NOT NULL DEFAULT '';
ALTER TABLE players ADD COLUMN queue_position INTEGER NOT NULL DEFAULT 0;
