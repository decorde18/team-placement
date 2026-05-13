-- 1. Evaluation Groups
CREATE TABLE IF NOT EXISTS session_fields (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- 2. Session Players (Evaluation data)
-- Remove player_status, keep rank, field_id, and attendance
ALTER TABLE session_players DROP COLUMN IF EXISTS player_status;
ALTER TABLE session_players ADD COLUMN IF NOT EXISTS field_id INT NULL;
ALTER TABLE session_players ADD COLUMN IF NOT EXISTS rank INT DEFAULT 0;

-- 3. Season Players (Invitation/Selection data)
-- Ensure player_status lives here
ALTER TABLE season_players ADD COLUMN IF NOT EXISTS player_status VARCHAR(50) DEFAULT 'none';

-- 4. Foreign Key Cleanup
ALTER TABLE session_players DROP FOREIGN KEY IF EXISTS fk_session_field;
ALTER TABLE session_players ADD CONSTRAINT fk_session_field FOREIGN KEY (field_id) REFERENCES session_fields(id) ON DELETE SET NULL;
