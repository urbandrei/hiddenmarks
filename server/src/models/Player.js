const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Player {
  static async create(sessionId, playerName, playerIndex, mark) {
    const id = uuidv4();
    const query = `
      INSERT INTO players (id, session_id, player_name, player_index, mark)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await db.query(query, [id, sessionId, playerName, playerIndex, mark]);
    return result.rows[0];
  }

  static async findBySession(sessionId) {
    const query = 'SELECT * FROM players WHERE session_id = $1 ORDER BY player_index';
    const result = await db.query(query, [sessionId]);
    return result.rows;
  }

  static async countBySession(sessionId) {
    const query = 'SELECT COUNT(*) as count FROM players WHERE session_id = $1';
    const result = await db.query(query, [sessionId]);
    return parseInt(result.rows[0].count);
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      fields.push(`${key} = $${paramCount}`);
      values.push(typeof value === 'object' ? JSON.stringify(value) : value);
      paramCount++;
    });

    values.push(id);
    const query = `
      UPDATE players
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async deleteBySession(sessionId) {
    const query = 'DELETE FROM players WHERE session_id = $1';
    await db.query(query, [sessionId]);
  }
}

module.exports = Player;
