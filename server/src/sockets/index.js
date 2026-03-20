const { Server } = require('socket.io');
const { gameManager } = require('../game/state');
const gamePlayerModel = require('../models/gamePlayer');
const gameModel = require('../models/game');
const { executeDraw, executeBank, advanceTurn } = require('../game/turnActions');
const {
  executePlay, effectGreed, effectInsomnia, playKillCard, effectBounty,
  processBountyProgression, executeBountyOnMark, effectTiedUp, processStartOfTurn,
  effectArson, effectUnmasked, effectRevenge, effectAlterEgo, effectBodySwap,
  effectTradeOff, effectUpheaval, consumeEffectCard,
} = require('../game/cardEffects');
const { isLethalCard, isBountyCard } = require('../game/cardUtils');
const { startReactionWindow, submitReactionResponse, resolveReactionChain, getEligibleReactors } = require('../game/reactions');
const logger = require('../utils/logger');

// Cards that trigger reaction windows
const REACTIVE_EFFECT_TYPES = {
  'unmasked': 'peek',
  'alter ego': 'swap_extra',
  'body swap': 'swap_marks',
  'tied up': 'skip',
  'arson': 'arson',
  'trade off': 'trade',
  'upheaval': 'upheaval',
};

/**
 * After an action, check if actions hit 0 and consume effect cards or advance turn.
 */
async function checkActionsAndAdvance(inst, playerId, seatNumber) {
  while (inst.state.turn.actionsRemaining <= 0) {
    const consumed = consumeEffectCard(inst.state, seatNumber);
    if (consumed.consumed) {
      await inst.logAction(playerId, seatNumber, 'effect_consumed', {
        cardName: consumed.cardName,
        actionsGranted: consumed.actionsGranted,
      });
      inst.broadcastState();
    } else {
      // No more consumables — advance turn
      const { nextPlayerNum } = advanceTurn(inst.state);
      await inst.logAction(playerId, seatNumber, 'turn_advance', {
        from: seatNumber,
        to: nextPlayerNum,
        turnNumber: inst.state.currentTurnNumber,
      });

      // Process start of new turn (tied up, bounty progression)
      const startResult = processStartOfTurn(inst.state);
      if (startResult.skipped) {
        await inst.logAction(null, nextPlayerNum, 'turn_skipped', { reason: 'tied_up' });
        // Advance again from the skipped player
        const next2 = advanceTurn(inst.state);
        await inst.logAction(null, nextPlayerNum, 'turn_advance', {
          from: nextPlayerNum,
          to: next2.nextPlayerNum,
          turnNumber: inst.state.currentTurnNumber,
        });
        const startResult2 = processStartOfTurn(inst.state);
        if (startResult2.skipped) {
          // unlikely but handle double skip
          advanceTurn(inst.state);
          processStartOfTurn(inst.state);
        }
      }

      inst.broadcastEvent('game:turn-advanced', {
        currentPlayerNum: inst.state.turn.currentPlayerNum,
        actionsRemaining: inst.state.turn.actionsRemaining,
      });
      inst.broadcastState();
      break;
    }
  }
}

/**
 * Execute a card's specific effect after executePlay has run.
 * For reactive cards, starts a reaction window instead of executing immediately.
 */
function dispatchCardEffect(inst, state, seatNumber, cardObfId, cardName, action) {
  const effectType = REACTIVE_EFFECT_TYPES[cardName];
  const target = action.target;

  // Non-reactive effects: execute immediately
  if (!effectType) {
    if (cardName === 'greed') {
      return { result: effectGreed(state, seatNumber), immediate: true };
    }
    if (cardName === 'insomnia') {
      effectInsomnia(state, seatNumber, cardObfId);
      return { immediate: true };
    }
    return { immediate: true };
  }

  // Reactive effects: check if anyone can react
  const eligible = getEligibleReactors(state, seatNumber, target, effectType, false);

  if (eligible.length === 0) {
    // No one can react — execute immediately
    executeEffect(state, seatNumber, cardName, cardObfId, action);
    return { immediate: true };
  }

  // Start reaction window
  startReactionWindow(state, cardObfId, seatNumber, target, effectType, false);

  // Store pending effect data for after resolution
  state.reactionState.pendingEffect = {
    casterNum: seatNumber,
    cardObfId,
    cardName,
    action,
  };

  // Set up timeout
  inst.reactionTimer = setTimeout(() => {
    resolveAndExecute(inst);
  }, 5000);

  inst.broadcastEvent('game:reaction-start', {
    cardObfId,
    playerId: seatNumber,
    targetId: target,
    effectType,
    isLethal: false,
    eligibleReactors: eligible,
    timeRemaining: 5000,
  });

  return { immediate: false, reactionStarted: true };
}

/**
 * Execute a specific card effect (called after reaction resolves or immediately).
 */
function executeEffect(state, casterNum, cardName, cardObfId, action) {
  const target = action.target;
  switch (cardName) {
    case 'unmasked':
      effectUnmasked(state, casterNum, target);
      break;
    case 'alter ego':
      effectAlterEgo(state, casterNum, target);
      break;
    case 'body swap':
      effectBodySwap(state, casterNum, target, action.target2);
      break;
    case 'tied up':
      effectTiedUp(state, casterNum, cardObfId, target);
      break;
    case 'arson':
      effectArson(state, target);
      break;
    case 'trade off':
      effectTradeOff(state, casterNum, action.ownCardId, action.targetCardId, action.ownZone, action.targetZone);
      break;
    case 'upheaval':
      effectUpheaval(state, action.splitIndex);
      break;
  }
}

/**
 * Resolve the reaction chain and execute effect if not blocked.
 */
async function resolveAndExecute(inst) {
  if (inst.reactionTimer) {
    clearTimeout(inst.reactionTimer);
    inst.reactionTimer = null;
  }

  const state = inst.state;
  if (!state.reactionState) return;

  const pendingEffect = state.reactionState.pendingEffect;
  const result = resolveReactionChain(state);

  if (result.execute && pendingEffect) {
    // Check for revenge special case
    if (result.revengeTriggered && pendingEffect.cardName === 'unmasked') {
      effectRevenge(state, pendingEffect.casterNum, result.revengeReactorNum);
    } else {
      executeEffect(state, pendingEffect.casterNum, pendingEffect.cardName, pendingEffect.cardObfId, pendingEffect.action);
    }
  }

  // If revenge was triggered on a peek, the peek is blocked but revenge reveals caster's mark
  if (!result.execute && result.revengeTriggered && pendingEffect?.cardName === 'unmasked') {
    effectRevenge(state, pendingEffect.casterNum, result.revengeReactorNum);
  }

  inst.broadcastEvent('game:reaction-resolve', {
    blocked: result.blocked,
    executed: result.execute,
    revengeTriggered: result.revengeTriggered || false,
  });

  inst.broadcastState();
}

function setupSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', async (socket) => {
    const { playerId, gameId } = socket.handshake.auth;

    if (!playerId || !gameId) {
      socket.emit('game:error', { message: 'playerId and gameId required in auth' });
      socket.disconnect();
      return;
    }

    const seatNumber = await gamePlayerModel.findPlayerSeat(gameId, playerId);
    if (!seatNumber) {
      socket.emit('game:error', { message: 'Player not in this game' });
      socket.disconnect();
      return;
    }

    socket.join(gameId);
    socket.data = { playerId, gameId, seatNumber };

    const instance = gameManager.get(gameId);
    if (instance) {
      instance.playerSockets.set(seatNumber, socket);
      instance.playerIds.set(seatNumber, playerId);
      await gamePlayerModel.updateConnection(gameId, playerId, true);

      if (instance.state) {
        socket.emit('game:state', instance.getViewForPlayer(seatNumber));
      }
    }

    logger.info('Player connected', { playerId, gameId, seatNumber });

    // --- lobby:start-game ---
    socket.on('lobby:start-game', async () => {
      try {
        const game = await gameModel.findById(gameId);
        if (!game || game.host_player_id !== playerId) {
          socket.emit('game:error', { message: 'Only the host can start the game' });
          return;
        }
        if (game.status !== 'waiting') {
          socket.emit('game:error', { message: 'Game already started' });
          return;
        }

        const playerCount = await gamePlayerModel.getPlayerCount(gameId);
        if (playerCount < 2) {
          socket.emit('game:error', { message: 'Need at least 2 players to start' });
          return;
        }

        let inst = gameManager.get(gameId);
        if (!inst) {
          inst = gameManager.create(gameId, game);
        }

        inst.setup();

        // Register ALL connected sockets in this room (not just the host)
        const roomSockets = await io.in(gameId).fetchSockets();
        for (const s of roomSockets) {
          if (s.data && s.data.seatNumber && s.data.playerId) {
            inst.playerSockets.set(s.data.seatNumber, s);
            inst.playerIds.set(s.data.seatNumber, s.data.playerId);
          }
        }

        await gameModel.updateStatus(gameId, 'in_progress');
        await inst.checkpoint();
        await inst.logAction(playerId, seatNumber, 'game_start', { playerCount });

        inst.broadcastState();
        inst.broadcastEvent('game:started', { currentTurnNumber: 1 });
        logger.info('Game started', { gameId, playerCount });
      } catch (err) {
        logger.error('Error starting game', { gameId, error: err.message });
        socket.emit('game:error', { message: 'Failed to start game' });
      }
    });

    // --- game:action ---
    socket.on('game:action', async (action) => {
      try {
        const inst = gameManager.get(gameId);
        if (!inst || !inst.state) {
          socket.emit('game:error', { message: 'Game not in progress' });
          return;
        }

        const { type } = action;

        switch (type) {
          case 'draw': {
            const result = executeDraw(inst.state, seatNumber);
            if (!result.success) {
              socket.emit('game:error', { message: result.error });
              return;
            }
            await inst.logAction(playerId, seatNumber, 'draw', {
              cardObfId: result.drawnCardObfId,
            });
            inst.broadcastState();
            await checkActionsAndAdvance(inst, playerId, seatNumber);
            break;
          }

          case 'bank': {
            const { cardId } = action;
            if (cardId === undefined) {
              socket.emit('game:error', { message: 'cardId required for bank action' });
              return;
            }
            const result = executeBank(inst.state, seatNumber, cardId);
            if (!result.success) {
              socket.emit('game:error', { message: result.error });
              return;
            }
            await inst.logAction(playerId, seatNumber, 'bank', { cardObfId: cardId });
            inst.broadcastState();
            await checkActionsAndAdvance(inst, playerId, seatNumber);
            break;
          }

          case 'play': {
            const { cardId, target, target2, splitIndex, ownCardId, targetCardId, ownZone, targetZone } = action;
            if (cardId === undefined) {
              socket.emit('game:error', { message: 'cardId required for play action' });
              return;
            }

            const cardInfo = inst.state.cardMap[cardId];
            if (!cardInfo) {
              socket.emit('game:error', { message: 'Unknown card' });
              return;
            }

            // Kill cards have their own flow
            if (isLethalCard(cardInfo.name)) {
              if (target === undefined) {
                socket.emit('game:error', { message: 'target required for kill cards' });
                return;
              }
              const result = playKillCard(inst.state, seatNumber, cardId, target);
              if (!result.success) {
                socket.emit('game:error', { message: result.error });
                return;
              }
              await inst.logAction(playerId, seatNumber, 'play_kill', {
                cardObfId: cardId, cardName: cardInfo.name, target,
              });
              if (result.winner) {
                inst.broadcastEvent('game:victory', { winnerNum: result.winner });
              }
              inst.broadcastState();
              await checkActionsAndAdvance(inst, playerId, seatNumber);
              break;
            }

            // Bounty cards
            if (isBountyCard(cardInfo.name)) {
              const playResult = executePlay(inst.state, seatNumber, cardId);
              if (!playResult.success) {
                socket.emit('game:error', { message: playResult.error });
                return;
              }
              const bountyResult = effectBounty(inst.state, seatNumber, cardId);
              await inst.logAction(playerId, seatNumber, 'play_bounty', {
                cardObfId: cardId, cardName: cardInfo.name, drawnCards: bountyResult.drawnCards,
              });
              inst.broadcastState();
              await checkActionsAndAdvance(inst, playerId, seatNumber);
              break;
            }

            // All other cards: executePlay + dispatch effect
            const playResult = executePlay(inst.state, seatNumber, cardId, target);
            if (!playResult.success) {
              socket.emit('game:error', { message: playResult.error });
              return;
            }

            await inst.logAction(playerId, seatNumber, 'play', {
              cardObfId: cardId, cardName: cardInfo.name, target,
            });

            const effectResult = dispatchCardEffect(inst, inst.state, seatNumber, cardId, cardInfo.name, action);

            if (effectResult.immediate) {
              inst.broadcastState();
              await checkActionsAndAdvance(inst, playerId, seatNumber);
            }
            // If reaction started, state broadcast happens via reaction flow
            break;
          }

          case 'bounty-use': {
            const { bountyCardId, target } = action;
            if (bountyCardId === undefined || target === undefined) {
              socket.emit('game:error', { message: 'bountyCardId and target required' });
              return;
            }
            const result = executeBountyOnMark(inst.state, seatNumber, bountyCardId, target);
            if (!result.success) {
              socket.emit('game:error', { message: result.error });
              return;
            }
            await inst.logAction(playerId, seatNumber, 'bounty_use', {
              bountyCardId, target, match: result.match,
            });
            inst.broadcastState();
            break;
          }

          case 'end-turn': {
            if (inst.state.turn.currentPlayerNum !== seatNumber) {
              socket.emit('game:error', { message: 'Not your turn' });
              return;
            }
            // Force turn advance
            inst.state.turn.actionsRemaining = 0;
            await checkActionsAndAdvance(inst, playerId, seatNumber);
            break;
          }

          case 'reaction': {
            if (!inst.state.reactionState || !inst.state.reactionState.active) {
              socket.emit('game:error', { message: 'No active reaction window' });
              return;
            }
            const { cardId: reactionCardId, pass } = action;
            if (pass) {
              submitReactionResponse(inst.state, seatNumber, null);
            } else {
              submitReactionResponse(inst.state, seatNumber, reactionCardId);
            }

            await inst.logAction(playerId, seatNumber, 'reaction_response', {
              cardObfId: reactionCardId || null, pass: !!pass,
            });

            // Check if all eligible reactors have responded
            const rs = inst.state.reactionState;
            if (rs) {
              const allResponded = rs.eligibleReactors.every(p => p in rs.responses);
              if (allResponded) {
                await resolveAndExecute(inst);
                // After reaction resolves, check actions
                const pendingCaster = rs?.pendingEffect?.casterNum || seatNumber;
                await checkActionsAndAdvance(inst, playerId, pendingCaster);
              } else {
                inst.broadcastState();
              }
            }
            break;
          }

          default:
            socket.emit('game:error', { message: `Unknown action type: ${type}` });
            return;
        }
      } catch (err) {
        logger.error('Error handling game action', { gameId, action, error: err.message, stack: err.stack });
        socket.emit('game:error', { message: 'Action failed' });
      }
    });

    // --- disconnect ---
    socket.on('disconnect', async () => {
      logger.info('Player disconnected', { playerId, gameId, seatNumber });
      await gamePlayerModel.updateConnection(gameId, playerId, false);

      const inst = gameManager.get(gameId);
      if (inst) {
        inst.playerSockets.delete(seatNumber);

        if (inst.state && inst.state.turn.currentPlayerNum === seatNumber) {
          const { nextPlayerNum } = advanceTurn(inst.state);
          await inst.logAction(null, seatNumber, 'disconnect_turn_advance', {
            from: seatNumber, to: nextPlayerNum,
          });
          processStartOfTurn(inst.state);
          inst.broadcastState();
          inst.broadcastEvent('game:turn-advanced', {
            currentPlayerNum: inst.state.turn.currentPlayerNum,
            actionsRemaining: inst.state.turn.actionsRemaining,
          });
        }
      }
    });
  });

  return io;
}

module.exports = { setupSocketIO };
