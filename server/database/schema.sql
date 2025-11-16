-- Hidden Marks Database Schema

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255),
    is_public BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'waiting', -- waiting, in_progress, finished
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) REFERENCES sessions(id) ON DELETE CASCADE,
    player_name VARCHAR(255) NOT NULL,
    player_index INTEGER NOT NULL, -- 0-3
    is_alive BOOLEAN DEFAULT true,
    mark INTEGER, -- 0=clubs, 1=hearts, 2=spades, 3=diamonds, 4=jokers
    hand JSONB DEFAULT '[]'::jsonb,
    bank JSONB DEFAULT '[]'::jsonb,
    knowledge JSONB DEFAULT '[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_state (
    session_id VARCHAR(36) PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    draw_pile JSONB DEFAULT '[]'::jsonb,
    discard_pile JSONB DEFAULT '[]'::jsonb,
    extra_mark INTEGER,
    unused_marks JSONB DEFAULT '[]'::jsonb,
    bounties JSONB DEFAULT '[]'::jsonb, -- array of {suit: number, turnsLeft: number}
    current_player INTEGER DEFAULT 0,
    actions_remaining INTEGER DEFAULT 3,
    skipped_players JSONB DEFAULT '[]'::jsonb,
    last_draw_mode BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_public ON sessions(is_public, status);
CREATE INDEX idx_players_session ON players(session_id);
