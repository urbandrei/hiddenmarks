const { Router } = require('express');
const playerModel = require('../models/player');
const gameModel = require('../models/game');
const gamePlayerModel = require('../models/gamePlayer');
const gameActionModel = require('../models/gameAction');
const { requirePlayer } = require('../middleware/playerIdentity');
const { generateRoomCode } = require('../utils/roomCode');

const router = Router();

// Create a player identity
router.post('/players', async (req, res, next) => {
  try {
    const { displayName } = req.body;
    if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
      return res.status(400).json({ error: 'displayName is required' });
    }
    if (displayName.trim().length > 20) {
      return res.status(400).json({ error: 'displayName must be 20 characters or fewer' });
    }

    const player = await playerModel.createPlayer(displayName.trim());
    res.status(201).json(player);
  } catch (err) {
    next(err);
  }
});

// Create a game
router.post('/games', requirePlayer, async (req, res, next) => {
  try {
    // Generate unique room code
    let roomCode;
    let attempts = 0;
    do {
      roomCode = generateRoomCode();
      attempts++;
      if (attempts > 10) {
        return res.status(500).json({ error: 'Could not generate unique room code' });
      }
    } while (await gameModel.roomCodeExists(roomCode));

    const game = await gameModel.createGame(roomCode, req.playerId);

    // Host joins as seat 1
    await gamePlayerModel.joinGame(game.id, req.playerId, 1);

    res.status(201).json({
      id: game.id,
      roomCode: game.room_code,
      status: game.status,
      hostPlayerId: game.host_player_id,
    });
  } catch (err) {
    next(err);
  }
});

// List games by status
router.get('/games', async (req, res, next) => {
  try {
    const status = req.query.status || 'waiting';
    const games = await gameModel.listByStatus(status);
    res.json(games.map(g => ({
      id: g.id,
      roomCode: g.room_code,
      status: g.status,
      playerCount: parseInt(g.player_count, 10),
      createdAt: g.created_at,
    })));
  } catch (err) {
    next(err);
  }
});

// Get game details
router.get('/games/:roomCode', async (req, res, next) => {
  try {
    const game = await gameModel.findByRoomCode(req.params.roomCode);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const players = await gamePlayerModel.getPlayers(game.id);

    res.json({
      id: game.id,
      roomCode: game.room_code,
      status: game.status,
      hostPlayerId: game.host_player_id,
      players: players.map(p => ({
        id: p.player_id,
        displayName: p.display_name,
        seatNumber: p.seat_number,
        isConnected: p.is_connected,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Join a game
router.post('/games/:roomCode/join', requirePlayer, async (req, res, next) => {
  try {
    const game = await gameModel.findByRoomCode(req.params.roomCode);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    if (game.status !== 'waiting') {
      return res.status(409).json({ error: 'Game already started' });
    }

    // Check if player already in game
    const alreadyIn = await gamePlayerModel.isPlayerInGame(game.id, req.playerId);
    if (alreadyIn) {
      return res.status(409).json({ error: 'Already in this game' });
    }

    const playerCount = await gamePlayerModel.getPlayerCount(game.id);
    if (playerCount >= 4) {
      return res.status(409).json({ error: 'Game is full' });
    }

    const nextSeat = await gamePlayerModel.getNextSeat(game.id);
    await gamePlayerModel.joinGame(game.id, req.playerId, nextSeat);

    res.status(200).json({
      gameId: game.id,
      seatNumber: nextSeat,
    });
  } catch (err) {
    next(err);
  }
});

// Get game action history (for finished games or analysis)
router.get('/games/:gameId/history', async (req, res, next) => {
  try {
    const game = await gameModel.findById(req.params.gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const actions = await gameActionModel.getGameHistory(game.id);
    res.json(actions);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
