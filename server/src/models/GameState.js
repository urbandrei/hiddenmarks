const db = require('../config/database');

class GameState {
  static async create(sessionId, gameData) {
    const query = `
      INSERT INTO game_state (
        session_id, draw_pile, discard_pile, extra_mark,
        unused_marks, bounties, current_player, actions_remaining,
        skipped_players, last_draw_mode
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const result = await db.query(query, [
      sessionId,
      JSON.stringify(gameData.drawPile),
      JSON.stringify(gameData.discardPile),
      gameData.extraMark,
      JSON.stringify(gameData.unusedMarks),
      JSON.stringify(gameData.bounties),
      gameData.currentPlayer,
      gameData.actionsRemaining,
      JSON.stringify(gameData.skippedPlayers),
      gameData.lastDrawMode
    ]);
    return result.rows[0];
  }

  static async findBySession(sessionId) {
    const query = 'SELECT * FROM game_state WHERE session_id = $1';
    const result = await db.query(query, [sessionId]);
    return result.rows[0];
  }

  static async update(sessionId, gameData) {
    const query = `
      UPDATE game_state
      SET
        draw_pile = $2,
        discard_pile = $3,
        extra_mark = $4,
        unused_marks = $5,
        bounties = $6,
        current_player = $7,
        actions_remaining = $8,
        skipped_players = $9,
        last_draw_mode = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE session_id = $1
      RETURNING *
    `;
    const result = await db.query(query, [
      sessionId,
      JSON.stringify(gameData.drawPile),
      JSON.stringify(gameData.discardPile),
      gameData.extraMark,
      JSON.stringify(gameData.unusedMarks),
      JSON.stringify(gameData.bounties),
      gameData.currentPlayer,
      gameData.actionsRemaining,
      JSON.stringify(gameData.skippedPlayers),
      gameData.lastDrawMode
    ]);
    return result.rows[0];
  }

  static async delete(sessionId) {
    const query = 'DELETE FROM game_state WHERE session_id = $1';
    await db.query(query, [sessionId]);
  }
}

module.exports = GameState;
