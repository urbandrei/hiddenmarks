const { v4: uuidv4 } = require('uuid');

// In-memory data stores
const players = new Map();
const games = new Map();
const gamePlayers = new Map(); // gameId -> [{ player_id, seat_number, is_connected, joined_at, display_name }]
const gameActions = new Map(); // gameId -> [action]
let actionIdCounter = 1;

// --- Player ---

async function createPlayer(displayName) {
  const player = {
    id: uuidv4(),
    display_name: displayName,
    created_at: new Date().toISOString(),
  };
  players.set(player.id, player);
  return player;
}

async function findPlayerById(id) {
  return players.get(id) || null;
}

// --- Game ---

async function createGame(roomCode, hostPlayerId) {
  const game = {
    id: uuidv4(),
    room_code: roomCode,
    status: 'waiting',
    host_player_id: hostPlayerId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    game_state: null,
    state_version: 0,
  };
  games.set(game.id, game);
  return game;
}

async function findGameByRoomCode(roomCode) {
  for (const game of games.values()) {
    if (game.room_code === roomCode) return game;
  }
  return null;
}

async function findGameById(id) {
  return games.get(id) || null;
}

async function listGamesByStatus(status) {
  const results = [];
  for (const game of games.values()) {
    if (game.status === status) {
      const gp = gamePlayers.get(game.id) || [];
      results.push({ ...game, player_count: gp.length });
    }
  }
  return results.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function updateGameStatus(gameId, status) {
  const game = games.get(gameId);
  if (!game) return null;
  game.status = status;
  game.updated_at = new Date().toISOString();
  return game;
}

async function updateGameState(gameId, gameState, stateVersion) {
  const game = games.get(gameId);
  if (!game) return null;
  game.game_state = gameState;
  game.state_version = stateVersion;
  game.updated_at = new Date().toISOString();
  return { id: game.id, state_version: stateVersion };
}

async function roomCodeExists(roomCode) {
  for (const game of games.values()) {
    if (game.room_code === roomCode) return true;
  }
  return false;
}

// --- GamePlayer ---

async function joinGame(gameId, playerId, seatNumber) {
  if (!gamePlayers.has(gameId)) gamePlayers.set(gameId, []);
  const entry = {
    game_id: gameId,
    player_id: playerId,
    seat_number: seatNumber,
    is_connected: true,
    joined_at: new Date().toISOString(),
  };
  gamePlayers.get(gameId).push(entry);
  return entry;
}

async function getPlayers(gameId) {
  const entries = gamePlayers.get(gameId) || [];
  return entries
    .map(e => {
      const player = players.get(e.player_id);
      return { ...e, display_name: player?.display_name || 'Unknown' };
    })
    .sort((a, b) => a.seat_number - b.seat_number);
}

async function getPlayerCount(gameId) {
  return (gamePlayers.get(gameId) || []).length;
}

async function getNextSeat(gameId) {
  const entries = gamePlayers.get(gameId) || [];
  if (entries.length === 0) return 1;
  return Math.max(...entries.map(e => e.seat_number)) + 1;
}

async function isPlayerInGame(gameId, playerId) {
  const entries = gamePlayers.get(gameId) || [];
  return entries.some(e => e.player_id === playerId);
}

async function updateConnection(gameId, playerId, isConnected) {
  const entries = gamePlayers.get(gameId) || [];
  const entry = entries.find(e => e.player_id === playerId);
  if (entry) entry.is_connected = isConnected;
}

async function findPlayerSeat(gameId, playerId) {
  const entries = gamePlayers.get(gameId) || [];
  const entry = entries.find(e => e.player_id === playerId);
  return entry?.seat_number || null;
}

// --- GameAction ---

async function logAction(gameId, playerId, seatNumber, actionType, actionData, stateVersion) {
  if (!gameActions.has(gameId)) gameActions.set(gameId, []);
  const action = {
    id: actionIdCounter++,
    game_id: gameId,
    player_id: playerId,
    seat_number: seatNumber,
    action_type: actionType,
    action_data: actionData,
    state_version: stateVersion,
    created_at: new Date().toISOString(),
  };
  gameActions.get(gameId).push(action);
  return { id: action.id, created_at: action.created_at };
}

async function getGameHistory(gameId) {
  return (gameActions.get(gameId) || []).sort((a, b) => a.id - b.id);
}

async function getActionCount(gameId) {
  return (gameActions.get(gameId) || []).length;
}

module.exports = {
  // player
  createPlayer,
  findPlayerById,
  // game
  createGame,
  findGameByRoomCode,
  findGameById,
  listGamesByStatus,
  updateGameStatus,
  updateGameState,
  roomCodeExists,
  // gamePlayer
  joinGame,
  getPlayers,
  getPlayerCount,
  getNextSeat,
  isPlayerInGame,
  updateConnection,
  findPlayerSeat,
  // gameAction
  logAction,
  getGameHistory,
  getActionCount,
};
