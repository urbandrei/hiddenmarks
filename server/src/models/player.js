const config = require('../config');

if (config.useMemory) {
  const mem = require('../db/memoryStore');
  module.exports = { createPlayer: mem.createPlayer, findById: mem.findPlayerById };
} else {
  const pool = require('../db/pool');

  async function createPlayer(displayName) {
    const result = await pool.query(
      'INSERT INTO players (display_name) VALUES ($1) RETURNING id, display_name, created_at',
      [displayName]
    );
    return result.rows[0];
  }

  async function findById(id) {
    const result = await pool.query(
      'SELECT id, display_name, created_at FROM players WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  module.exports = { createPlayer, findById };
}
