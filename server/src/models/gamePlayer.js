const config = require('../config');

if (config.useMemory) {
  const mem = require('../db/memoryStore');
  module.exports = {
    joinGame: mem.joinGame,
    getPlayers: mem.getPlayers,
    getPlayerCount: mem.getPlayerCount,
    getNextSeat: mem.getNextSeat,
    isPlayerInGame: mem.isPlayerInGame,
    updateConnection: mem.updateConnection,
    findPlayerSeat: mem.findPlayerSeat,
  };
} else {
  const pool = require('../db/pool');

  async function joinGame(gameId, playerId, seatNumber) {
    const result = await pool.query(
      `INSERT INTO game_players (game_id, player_id, seat_number)
       VALUES ($1, $2, $3)
       RETURNING game_id, player_id, seat_number, joined_at`,
      [gameId, playerId, seatNumber]
    );
    return result.rows[0];
  }

  async function getPlayers(gameId) {
    const result = await pool.query(
      `SELECT gp.game_id, gp.player_id, gp.seat_number, gp.is_connected, gp.joined_at,
              p.display_name
       FROM game_players gp
       JOIN players p ON gp.player_id = p.id
       WHERE gp.game_id = $1
       ORDER BY gp.seat_number`,
      [gameId]
    );
    return result.rows;
  }

  async function getPlayerCount(gameId) {
    const result = await pool.query(
      'SELECT COUNT(*) AS count FROM game_players WHERE game_id = $1',
      [gameId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  async function getNextSeat(gameId) {
    const result = await pool.query(
      'SELECT MAX(seat_number) AS max_seat FROM game_players WHERE game_id = $1',
      [gameId]
    );
    const maxSeat = result.rows[0].max_seat;
    return maxSeat ? maxSeat + 1 : 1;
  }

  async function isPlayerInGame(gameId, playerId) {
    const result = await pool.query(
      'SELECT 1 FROM game_players WHERE game_id = $1 AND player_id = $2',
      [gameId, playerId]
    );
    return result.rows.length > 0;
  }

  async function updateConnection(gameId, playerId, isConnected) {
    await pool.query(
      'UPDATE game_players SET is_connected = $1 WHERE game_id = $2 AND player_id = $3',
      [isConnected, gameId, playerId]
    );
  }

  async function findPlayerSeat(gameId, playerId) {
    const result = await pool.query(
      'SELECT seat_number FROM game_players WHERE game_id = $1 AND player_id = $2',
      [gameId, playerId]
    );
    return result.rows[0]?.seat_number || null;
  }

  module.exports = {
    joinGame,
    getPlayers,
    getPlayerCount,
    getNextSeat,
    isPlayerInGame,
    updateConnection,
    findPlayerSeat,
  };
}
