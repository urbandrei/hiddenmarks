import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';
import socketService from '../utils/socket';
import CardZone from '../components/CardZone';
import { MARK_NAMES, getCardValue } from '../utils/cardInfo';
import '../styles/Game.css';

function Game() {
  const { sessionId } = useParams();
  const [gameData, setGameData] = useState(null);
  const [myPlayerIndex, setMyPlayerIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState(null);

  useEffect(() => {
    loadGameState();
    const socket = socketService.connect();
    const playerId = localStorage.getItem('playerId');

    socketService.joinSession(sessionId, playerId);

    socketService.onGameUpdate(() => {
      loadGameState();
    });

    return () => {
      socketService.offGameUpdate();
    };
  }, [sessionId]);

  const loadGameState = async () => {
    try {
      const result = await api.getSession(sessionId);
      if (result.success && result.gameState) {
        setGameData({
          ...result.gameState,
          players: result.players
        });

        const playerId = localStorage.getItem('playerId');
        const myIndex = result.players.findIndex(p => p.id === playerId);
        setMyPlayerIndex(myIndex);
      }
    } catch (error) {
      console.error('Error loading game state:', error);
    }
    setLoading(false);
  };

  const handleDraw = async () => {
    const playerId = localStorage.getItem('playerId');
    try {
      const result = await api.performAction(sessionId, 'DRAW', playerId, {});
      if (result.success) {
        socketService.sendGameAction(sessionId, 'DRAW', playerId, {});
        await loadGameState();
      } else {
        alert(result.error || 'Failed to draw card');
      }
    } catch (error) {
      console.error('Error drawing card:', error);
      alert('Failed to draw card');
    }
  };

  const handleBank = async (cardId, index) => {
    const playerId = localStorage.getItem('playerId');
    try {
      const result = await api.performAction(sessionId, 'BANK', playerId, { cardIndex: index });
      if (result.success) {
        socketService.sendGameAction(sessionId, 'BANK', playerId, { cardIndex: index });
        await loadGameState();
      } else {
        alert(result.error || 'Failed to bank card');
      }
    } catch (error) {
      console.error('Error banking card:', error);
      alert('Failed to bank card');
    }
  };

  const handlePlay = async (cardId, index) => {
    const playerId = localStorage.getItem('playerId');

    // Get target selection if needed
    const targets = await selectTargets(cardId);
    if (targets === null) return; // Cancelled

    try {
      const result = await api.performAction(sessionId, 'PLAY', playerId, {
        cardIndex: index,
        targets,
        swapData: {}
      });
      if (result.success) {
        socketService.sendGameAction(sessionId, 'PLAY', playerId, { cardIndex: index, targets });
        await loadGameState();
      } else {
        alert(result.error || 'Failed to play card');
      }
    } catch (error) {
      console.error('Error playing card:', error);
      alert('Failed to play card');
    }
  };

  const selectTargets = async (cardId) => {
    // Simplified target selection - in a real implementation this would be a modal
    const cardName = require('../utils/cardInfo').getCardName(cardId);

    if (cardName.includes('BOUNTY') || cardName === 'GREED') {
      return [];
    }

    if (cardName === 'BODY SWAP') {
      const target1 = prompt('Select first player (0-3):');
      const target2 = prompt('Select second player (0-3):');
      if (target1 === null || target2 === null) return null;
      return [parseInt(target1), parseInt(target2)];
    }

    const target = prompt('Select target player (0-3):');
    if (target === null) return null;
    return [parseInt(target)];
  };

  const handleAccuse = async () => {
    const targetIndex = parseInt(prompt('Accuse which player? (0-3):'));
    const markIndex = parseInt(prompt('Which mark? (0=♣, 1=♥, 2=♠, 3=♦, 4=🃏):'));

    if (isNaN(targetIndex) || isNaN(markIndex)) return;

    const playerId = localStorage.getItem('playerId');
    try {
      const result = await api.performAction(sessionId, 'ACCUSE', playerId, {
        targetIndex,
        accusedMark: markIndex
      });
      if (result.success) {
        socketService.sendGameAction(sessionId, 'ACCUSE', playerId, { targetIndex, accusedMark: markIndex });
        await loadGameState();
        if (result.result?.gameOver) {
          alert(result.result.message);
        }
      } else {
        alert(result.error || 'Failed to make accusation');
      }
    } catch (error) {
      console.error('Error making accusation:', error);
      alert('Failed to make accusation');
    }
  };

  if (loading || !gameData) {
    return <div className="loading">Loading game...</div>;
  }

  const myPlayer = gameData.players[myPlayerIndex];
  const currentPlayer = gameData.players[gameData.current_player];
  const isMyTurn = myPlayerIndex === gameData.current_player;
  const bankValue = myPlayer?.bank?.reduce((sum, cardId) => sum + getCardValue(cardId), 0) || 0;

  return (
    <div className="game-container">
      <div className="game-board">
        <div className="game-header">
          <h1>Hidden Marks</h1>
          <div className="game-info">
            <div className="turn-info">
              <strong>Current Turn:</strong> {currentPlayer?.player_name}
              {isMyTurn && <span className="your-turn"> (Your Turn)</span>}
            </div>
            <div className="actions-info">
              <strong>Actions Remaining:</strong> {gameData.actions_remaining}/3
            </div>
            <div className="draw-pile-info">
              <strong>Draw Pile:</strong> {gameData.draw_pile?.length || 0} cards
            </div>
          </div>
        </div>

        <div className="opponents-area">
          {gameData.players.map((player, index) => {
            if (index === myPlayerIndex) return null;
            return (
              <div key={player.id} className={`opponent ${!player.is_alive ? 'dead' : ''}`}>
                <div className="opponent-info">
                  <h3>{player.player_name}</h3>
                  <p className="player-status">{player.is_alive ? '⚡ Alive' : '💀 Dead'}</p>
                  {!player.is_alive && player.mark !== null && (
                    <p className="revealed-mark">Mark: {MARK_NAMES[player.mark]}</p>
                  )}
                </div>
                <div className="opponent-cards">
                  <div className="card-info">
                    <strong>Hand:</strong> {player.hand?.length || 0} cards
                  </div>
                  <div className="card-info">
                    <strong>Bank:</strong> {player.bank?.length || 0} cards
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="center-area">
          <div className="bounties-section">
            <h3>Active Bounties</h3>
            {gameData.bounties && gameData.bounties.length > 0 ? (
              <div className="bounties-list">
                {gameData.bounties.map((bounty, index) => (
                  <div key={index} className="bounty-card">
                    <div className="bounty-suit">{MARK_NAMES[bounty.suit]}</div>
                    <div className="bounty-turns">
                      {bounty.turnsLeft > 0 ? `${bounty.turnsLeft} turns` : 'OPEN'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-bounties">No active bounties</p>
            )}
          </div>

          {isMyTurn && (
            <div className="action-buttons">
              <button onClick={handleDraw} className="btn btn-action">
                Draw Card
              </button>
              {gameData.last_draw_mode && (
                <button onClick={handleAccuse} className="btn btn-accuse">
                  Make Accusation
                </button>
              )}
            </div>
          )}
        </div>

        <div className="my-area">
          <div className="player-stats">
            <h2>{myPlayer?.player_name} (You)</h2>
            <div className="stats">
              <span>Bank Value: {bankValue}</span>
              <span>Status: {myPlayer?.is_alive ? '⚡ Alive' : '💀 Dead'}</span>
            </div>
          </div>

          <div className="my-cards">
            <CardZone
              cards={myPlayer?.hand}
              zoneName="hand"
              onPlay={isMyTurn ? handlePlay : null}
              onBank={isMyTurn ? handleBank : null}
              showBacks={false}
              playerName="Your"
              isCurrentPlayer={isMyTurn}
            />

            <CardZone
              cards={myPlayer?.bank}
              zoneName="bank"
              showBacks={true}
              playerName="Your"
              isCurrentPlayer={isMyTurn}
            />
          </div>

          {isMyTurn && (
            <div className="instructions">
              <p>💡 Click a card to play it | Right-click to bank it</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Game;
