const config = require('../config');

if (config.useMemory) {
  const mem = require('../db/memoryStore');
  module.exports = {
    createGame: mem.createGame,
    findByRoomCode: mem.findGameByRoomCode,
    findById: mem.findGameById,
    listByStatus: mem.listGamesByStatus,
    updateStatus: mem.updateGameStatus,
    updateGameState: mem.updateGameState,
    roomCodeExists: mem.roomCodeExists,
  };
} else {
  const pool = require('../db/pool');

  async function createGame(roomCode, hostPlayerId) {
    const result = await pool.query(
      `INSERT INTO games (room_code, host_player_id)
       VALUES ($1, $2)
       RETURNING id, room_code, status, host_player_id, created_at`,
      [roomCode, hostPlayerId]
    );
    return result.rows[0];
  }

  async function findByRoomCode(roomCode) {
    const result = await pool.query(
      'SELECT id, room_code, status, host_player_id, created_at, updated_at, state_version FROM games WHERE room_code = $1',
      [roomCode]
    );
    return result.rows[0] || null;
  }

  async function findById(id) {
    const result = await pool.query(
      'SELECT id, room_code, status, host_player_id, game_state, created_at, updated_at, state_version FROM games WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async function listByStatus(status) {
    const result = await pool.query(
      `SELECT g.id, g.room_code, g.status, g.host_player_id, g.created_at,
              COUNT(gp.player_id) AS player_count
       FROM games g
       LEFT JOIN game_players gp ON g.id = gp.game_id
       WHERE g.status = $1
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
      [status]
    );
    return result.rows;
  }

  async function updateStatus(gameId, status) {
    const result = await pool.query(
      `UPDATE games SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, gameId]
    );
    return result.rows[0] || null;
  }

  async function updateGameState(gameId, gameState, stateVersion) {
    const result = await pool.query(
      `UPDATE games SET game_state = $1, state_version = $2, updated_at = NOW() WHERE id = $3 RETURNING id, state_version`,
      [JSON.stringify(gameState), stateVersion, gameId]
    );
    return result.rows[0] || null;
  }

  async function roomCodeExists(roomCode) {
    const result = await pool.query(
      'SELECT 1 FROM games WHERE room_code = $1',
      [roomCode]
    );
    return result.rows.length > 0;
  }

  module.exports = {
    createGame,
    findByRoomCode,
    findById,
    listByStatus,
    updateStatus,
    updateGameState,
    roomCodeExists,
  };
}
