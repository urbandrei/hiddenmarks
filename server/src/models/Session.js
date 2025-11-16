const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Session {
  static async create(name, isPublic = false) {
    const id = uuidv4();
    const query = `
      INSERT INTO sessions (id, name, is_public, status)
      VALUES ($1, $2, $3, 'waiting')
      RETURNING *
    `;
    const result = await db.query(query, [id, name, isPublic]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM sessions WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findPublicWaiting() {
    const query = `
      SELECT s.*, COUNT(p.id) as player_count
      FROM sessions s
      LEFT JOIN players p ON s.id = p.session_id
      WHERE s.is_public = true AND s.status = 'waiting'
      GROUP BY s.id
      HAVING COUNT(p.id) < 4
      ORDER BY s.created_at DESC
    `;
    const result = await db.query(query);
    return result.rows;
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE sessions
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [status, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM sessions WHERE id = $1';
    await db.query(query, [id]);
  }
}

module.exports = Session;
