const Session = require('../models/Session');
const Player = require('../models/Player');
const GameState = require('../models/GameState');
const { initializeGame, canAffordCost, payFromBank, checkLethalCondition, killPlayer, handleAccusation, advanceTurn, reshuffleDiscardIntoDraw } = require('../utils/gameLogic');
const { getCardType, getCardCost, isBounty, getBountyMark, isLethal } = require('../utils/cards');

class GameController {
  static async createSession(req, res) {
    try {
      const { name, isPublic } = req.body;
      const session = await Session.create(name || 'Game Room', isPublic || false);
      res.json({ success: true, session });
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getSession(req, res) {
    try {
      const { sessionId } = req.params;
      const session = await Session.findById(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }
      const players = await Player.findBySession(sessionId);
      const gameState = await GameState.findBySession(sessionId);
      res.json({ success: true, session, players, gameState });
    } catch (error) {
      console.error('Error getting session:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getPublicSessions(req, res) {
    try {
      const sessions = await Session.findPublicWaiting();
      res.json({ success: true, sessions });
    } catch (error) {
      console.error('Error getting public sessions:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async joinSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { playerName } = req.body;

      const session = await Session.findById(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      if (session.status !== 'waiting') {
        return res.status(400).json({ success: false, error: 'Game already started' });
      }

      const playerCount = await Player.countBySession(sessionId);
      if (playerCount >= 4) {
        return res.status(400).json({ success: false, error: 'Session is full' });
      }

      const player = await Player.create(sessionId, playerName, playerCount, null);
      res.json({ success: true, player });
    } catch (error) {
      console.error('Error joining session:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async startGame(req, res) {
    try {
      const { sessionId } = req.params;

      const playerCount = await Player.countBySession(sessionId);
      if (playerCount !== 4) {
        return res.status(400).json({ success: false, error: 'Need 4 players to start' });
      }

      const gameData = initializeGame();

      // Update session status
      await Session.updateStatus(sessionId, 'in_progress');

      // Create game state
      await GameState.create(sessionId, gameData);

      // Update players with their initial data
      const players = await Player.findBySession(sessionId);
      for (let i = 0; i < 4; i++) {
        await Player.update(players[i].id, {
          mark: gameData.players[i].mark,
          hand: gameData.players[i].hand,
          bank: gameData.players[i].bank,
          knowledge: gameData.players[i].knowledge,
          is_alive: true
        });
      }

      res.json({ success: true, message: 'Game started' });
    } catch (error) {
      console.error('Error starting game:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async performAction(req, res) {
    try {
      const { sessionId } = req.params;
      const { action, playerId, data } = req.body;

      const gameState = await GameState.findBySession(sessionId);
      if (!gameState) {
        return res.status(404).json({ success: false, error: 'Game not found' });
      }

      const players = await Player.findBySession(sessionId);
      const gameData = {
        drawPile: gameState.draw_pile,
        discardPile: gameState.discard_pile,
        extraMark: gameState.extra_mark,
        unusedMarks: gameState.unused_marks,
        bounties: gameState.bounties,
        currentPlayer: gameState.current_player,
        actionsRemaining: gameState.actions_remaining,
        skippedPlayers: gameState.skipped_players,
        lastDrawMode: gameState.last_draw_mode,
        players: players.map(p => ({
          id: p.id,
          playerIndex: p.player_index,
          isAlive: p.is_alive,
          mark: p.mark,
          hand: p.hand,
          bank: p.bank,
          knowledge: p.knowledge
        }))
      };

      const currentPlayerData = gameData.players[gameData.currentPlayer];
      if (currentPlayerData.id !== playerId) {
        return res.status(400).json({ success: false, error: 'Not your turn' });
      }

      let result = {};

      switch (action) {
        case 'DRAW':
          result = await GameController.handleDraw(gameData);
          break;
        case 'BANK':
          result = await GameController.handleBank(gameData, data);
          break;
        case 'PLAY':
          result = await GameController.handlePlay(gameData, data);
          break;
        case 'ACCUSE':
          result = await GameController.handleAccuse(gameData, data);
          break;
        default:
          return res.status(400).json({ success: false, error: 'Invalid action' });
      }

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Save updated game state
      await GameState.update(sessionId, gameData);

      // Update all players
      for (const player of gameData.players) {
        await Player.update(player.id, {
          is_alive: player.isAlive,
          hand: player.hand,
          bank: player.bank,
          knowledge: player.knowledge,
          mark: player.mark
        });
      }

      res.json({ success: true, result: result.message, gameData });
    } catch (error) {
      console.error('Error performing action:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async handleDraw(gameData) {
    if (gameData.drawPile.length === 0) {
      return { success: false, error: 'Draw pile is empty' };
    }

    const currentPlayer = gameData.players[gameData.currentPlayer];
    const card = gameData.drawPile.pop();
    currentPlayer.hand.push(card);

    if (gameData.drawPile.length === 0) {
      gameData.lastDrawMode = true;
    }

    advanceTurn(gameData);
    return { success: true, message: `Drew a card` };
  }

  static async handleBank(gameData, data) {
    const { cardIndex } = data;
    const currentPlayer = gameData.players[gameData.currentPlayer];

    if (cardIndex < 0 || cardIndex >= currentPlayer.hand.length) {
      return { success: false, error: 'Invalid card index' };
    }

    const card = currentPlayer.hand.splice(cardIndex, 1)[0];
    currentPlayer.bank.push(card);

    advanceTurn(gameData);
    return { success: true, message: `Banked a card` };
  }

  static async handlePlay(gameData, data) {
    const { cardIndex, targets, swapData } = data;
    const currentPlayer = gameData.players[gameData.currentPlayer];

    if (cardIndex < 0 || cardIndex >= currentPlayer.hand.length) {
      return { success: false, error: 'Invalid card index' };
    }

    const cardId = currentPlayer.hand[cardIndex];
    const cardType = getCardType(cardId);
    const cost = getCardCost(cardType);

    // Check if player can afford
    if (!canAffordCost(currentPlayer.bank, cost)) {
      return { success: false, error: `Cannot afford cost of ${cost}` };
    }

    // Pay cost
    if (cost > 0) {
      const { paid, updatedBank } = payFromBank([...currentPlayer.bank], cost);
      currentPlayer.bank = updatedBank;
      gameData.discardPile.push(...paid);
    }

    // Remove card from hand
    currentPlayer.hand.splice(cardIndex, 1);

    // Execute card effect
    const effectResult = await GameController.executeCardEffect(gameData, cardType, cardId, targets, swapData);

    if (!effectResult.success) {
      return effectResult;
    }

    // Discard the played card
    gameData.discardPile.push(cardId);

    advanceTurn(gameData);
    return { success: true, message: `Played ${cardType}` };
  }

  static async executeCardEffect(gameData, cardType, cardId, targets, swapData) {
    const currentPlayer = gameData.players[gameData.currentPlayer];
    const targetIndex = targets?.[0];

    switch (cardType) {
      case 'GREED':
        if (gameData.drawPile.length >= 2) {
          currentPlayer.hand.push(gameData.drawPile.pop(), gameData.drawPile.pop());
        } else if (gameData.drawPile.length === 1) {
          currentPlayer.hand.push(gameData.drawPile.pop());
        }
        break;

      case 'UNMASKED':
        if (targetIndex !== undefined && targetIndex !== gameData.currentPlayer) {
          const targetMark = gameData.players[targetIndex].mark;
          currentPlayer.knowledge[targetIndex][targetMark] = 1;
        }
        break;

      case 'BODY_SWAP':
        if (targets && targets.length === 2) {
          const [idx1, idx2] = targets;
          const temp = gameData.players[idx1].mark;
          gameData.players[idx1].mark = gameData.players[idx2].mark;
          gameData.players[idx2].mark = temp;

          // Swap knowledge
          gameData.players.forEach(p => {
            for (let m = 0; m < 5; m++) {
              const t = p.knowledge[idx1][m];
              p.knowledge[idx1][m] = p.knowledge[idx2][m];
              p.knowledge[idx2][m] = t;
            }
          });
        }
        break;

      case 'ALTER_EGO':
        if (targetIndex !== undefined) {
          const temp = gameData.players[targetIndex].mark;
          gameData.players[targetIndex].mark = gameData.extraMark;
          gameData.extraMark = temp;

          // Swap knowledge with extra mark (index 4)
          gameData.players.forEach(p => {
            for (let m = 0; m < 5; m++) {
              const t = p.knowledge[targetIndex][m];
              p.knowledge[targetIndex][m] = p.knowledge[4]?.[m] || 0;
              if (!p.knowledge[4]) p.knowledge[4] = [0, 0, 0, 0, 0];
              p.knowledge[4][m] = t;
            }
          });
        }
        break;

      case 'TIED_UP':
        if (targetIndex !== undefined) {
          gameData.skippedPlayers.push(targetIndex);
        }
        break;

      case 'INSOMNIA':
        gameData.actionsRemaining += 3;
        break;

      case 'TRADE_OFF':
        if (swapData) {
          // Complex swap logic would go here
          // For now, simplified version
        }
        break;

      case 'ARSON':
        if (targetIndex !== undefined) {
          const target = gameData.players[targetIndex];
          gameData.discardPile.push(...target.bank);
          target.bank = [];
        }
        break;

      case 'UPHEAVAL':
        if (swapData?.cutPosition !== undefined) {
          const cut = swapData.cutPosition;
          gameData.drawPile = [...gameData.drawPile.slice(cut), ...gameData.drawPile.slice(0, cut)];
        }
        break;

      default:
        if (isBounty(cardType)) {
          const mark = getBountyMark(cardType);
          gameData.bounties.push({ suit: mark, turnsLeft: 4 });
          // Draw 3 cards
          for (let i = 0; i < 3 && gameData.drawPile.length > 0; i++) {
            currentPlayer.hand.push(gameData.drawPile.pop());
          }
        } else if (isLethal(cardType)) {
          if (targetIndex !== undefined) {
            const canKill = checkLethalCondition(cardType, targetIndex, gameData.players);
            if (canKill) {
              killPlayer(gameData, targetIndex, gameData.currentPlayer);
              gameData.actionsRemaining += 2; // Killer gets 2 extra actions
            } else {
              return { success: false, error: 'Target does not meet lethal condition' };
            }
          }
        }
    }

    return { success: true };
  }

  static async handleAccuse(gameData, data) {
    const { targetIndex, accusedMark, bountyIndex } = data;

    if (bountyIndex !== undefined) {
      // Remove the specific bounty
      gameData.bounties.splice(bountyIndex, 1);
    }

    const killerGotActions = handleAccusation(gameData, gameData.currentPlayer, targetIndex, accusedMark);

    if (killerGotActions) {
      gameData.actionsRemaining += 2;
    }

    // Check win condition
    const alive = gameData.players.filter(p => p.isAlive);
    if (alive.length === 1) {
      // Game over
      return { success: true, message: `Player ${alive[0].playerIndex} wins!`, gameOver: true };
    }

    // If last draw mode and accuser died, reshuffle
    if (gameData.lastDrawMode && !gameData.players[gameData.currentPlayer].isAlive) {
      reshuffleDiscardIntoDraw(gameData);
      gameData.lastDrawMode = false;
    }

    advanceTurn(gameData);
    return { success: true, message: 'Accusation made' };
  }
}

module.exports = GameController;
