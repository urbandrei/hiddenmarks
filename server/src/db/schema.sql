CREATE TABLE games (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code       VARCHAR(6) UNIQUE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'waiting'
                    CHECK (status IN ('waiting', 'in_progress', 'finished')),
    host_player_id  UUID NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    game_state      JSONB,
    state_version   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_games_room_code ON games(room_code);
CREATE INDEX idx_games_status ON games(status);

CREATE TABLE players (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name    VARCHAR(20) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE game_players (
    game_id         UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id       UUID NOT NULL REFERENCES players(id),
    seat_number     INTEGER NOT NULL CHECK (seat_number BETWEEN 1 AND 4),
    is_connected    BOOLEAN NOT NULL DEFAULT true,
    joined_at       TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (game_id, player_id),
    UNIQUE (game_id, seat_number)
);

CREATE INDEX idx_game_players_player ON game_players(player_id);

CREATE TABLE game_actions (
    id              BIGSERIAL PRIMARY KEY,
    game_id         UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id       UUID,
    seat_number     INTEGER,
    action_type     VARCHAR(50) NOT NULL,
    action_data     JSONB NOT NULL,
    state_version   INTEGER NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_game_actions_game ON game_actions(game_id, state_version);
CREATE INDEX idx_game_actions_type ON game_actions(game_id, action_type);
