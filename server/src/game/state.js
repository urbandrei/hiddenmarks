const { createInitialState } = require('./setup');
const { getPlayerView } = require('./obfuscation');
const gameModel = require('../models/game');
const gameActionModel = require('../models/gameAction');
const logger = require('../utils/logger');

const CHECKPOINT_INTERVAL = 5; // checkpoint every N actions

/**
 * Manages a single active game instance in memory.
 */
class GameInstance {
  constructor(gameId, dbGameRecord) {
    this.gameId = gameId;
    this.state = null;
    this.stateVersion = dbGameRecord?.state_version || 0;
    this.actionsSinceCheckpoint = 0;
    this.reactionTimer = null;
    this.playerSockets = new Map(); // seatNumber -> socket
    this.playerIds = new Map(); // seatNumber -> playerId (UUID)
  }

  /**
   * Initialize a new game (called when host starts).
   */
  setup() {
    this.state = createInitialState();
    this.stateVersion = 1;
  }

  /**
   * Load state from a DB record.
   */
  loadFromDb(gameState, stateVersion) {
    this.state = gameState;
    this.stateVersion = stateVersion;
  }

  /**
   * Get filtered view for a specific player.
   */
  getViewForPlayer(seatNumber) {
    if (!this.state) return null;
    return getPlayerView(this.state, seatNumber);
  }

  /**
   * Log an action and optionally checkpoint to DB.
   */
  async logAction(playerId, seatNumber, actionType, actionData) {
    this.stateVersion++;
    this.actionsSinceCheckpoint++;

    await gameActionModel.logAction(
      this.gameId,
      playerId,
      seatNumber,
      actionType,
      actionData,
      this.stateVersion
    );

    if (this.actionsSinceCheckpoint >= CHECKPOINT_INTERVAL) {
      await this.checkpoint();
    }
  }

  /**
   * Write current state to DB.
   */
  async checkpoint() {
    try {
      await gameModel.updateGameState(this.gameId, this.state, this.stateVersion);
      this.actionsSinceCheckpoint = 0;
    } catch (err) {
      logger.error('Failed to checkpoint game state', { gameId: this.gameId, error: err.message });
    }
  }

  /**
   * Broadcast state to all connected players.
   */
  broadcastState() {
    for (const [seatNum, socket] of this.playerSockets) {
      const view = this.getViewForPlayer(seatNum);
      if (view) {
        socket.emit('game:state', view);
      }
    }
  }

  /**
   * Emit an event to all connected players.
   */
  broadcastEvent(event, data) {
    for (const [, socket] of this.playerSockets) {
      socket.emit(event, data);
    }
  }

  /**
   * Emit an event to a specific player.
   */
  emitToPlayer(seatNumber, event, data) {
    const socket = this.playerSockets.get(seatNumber);
    if (socket) {
      socket.emit(event, data);
    }
  }
}

/**
 * Global manager for all active game instances.
 */
class GameManager {
  constructor() {
    this.games = new Map(); // gameId -> GameInstance
  }

  /**
   * Create and register a new game instance.
   */
  create(gameId, dbGameRecord) {
    const instance = new GameInstance(gameId, dbGameRecord);
    this.games.set(gameId, instance);
    return instance;
  }

  /**
   * Get an active game instance.
   */
  get(gameId) {
    return this.games.get(gameId) || null;
  }

  /**
   * Remove a finished game from memory.
   */
  remove(gameId) {
    const instance = this.games.get(gameId);
    if (instance?.reactionTimer) {
      clearTimeout(instance.reactionTimer);
    }
    this.games.delete(gameId);
  }

  /**
   * Checkpoint all active games (for graceful shutdown).
   */
  async checkpointAll() {
    const promises = [];
    for (const instance of this.games.values()) {
      if (instance.state) {
        promises.push(instance.checkpoint());
      }
    }
    await Promise.all(promises);
  }
}

// Singleton
const gameManager = new GameManager();

module.exports = { GameInstance, GameManager, gameManager };
