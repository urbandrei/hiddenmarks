const config = require('../config');

if (config.useMemory) {
  const mem = require('../db/memoryStore');
  module.exports = {
    logAction: mem.logAction,
    getGameHistory: mem.getGameHistory,
    getActionCount: mem.getActionCount,
  };
} else {
  const pool = require('../db/pool');

  async function logAction(gameId, playerId, seatNumber, actionType, actionData, stateVersion) {
    const result = await pool.query(
      `INSERT INTO game_actions (game_id, player_id, seat_number, action_type, action_data, state_version)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [gameId, playerId, seatNumber, actionType, JSON.stringify(actionData), stateVersion]
    );
    return result.rows[0];
  }

  async function getGameHistory(gameId) {
    const result = await pool.query(
      `SELECT id, player_id, seat_number, action_type, action_data, state_version, created_at
       FROM game_actions
       WHERE game_id = $1
       ORDER BY id ASC`,
      [gameId]
    );
    return result.rows;
  }

  async function getActionCount(gameId) {
    const result = await pool.query(
      'SELECT COUNT(*) AS count FROM game_actions WHERE game_id = $1',
      [gameId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  module.exports = { logAction, getGameHistory, getActionCount };
}
