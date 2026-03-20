const playerModel = require('../models/player');

/**
 * Middleware to extract and validate player identity from X-Player-Id header.
 * Sets req.playerId if valid. Does not reject — routes can decide if auth is required.
 */
async function playerIdentity(req, res, next) {
  const playerId = req.headers['x-player-id'];
  if (playerId) {
    req.playerId = playerId;
  }
  next();
}

/**
 * Middleware that requires a valid player ID.
 */
async function requirePlayer(req, res, next) {
  const playerId = req.headers['x-player-id'];
  if (!playerId) {
    return res.status(401).json({ error: 'X-Player-Id header required' });
  }

  const player = await playerModel.findById(playerId);
  if (!player) {
    return res.status(401).json({ error: 'Invalid player ID' });
  }

  req.playerId = playerId;
  req.player = player;
  next();
}

module.exports = { playerIdentity, requirePlayer };
