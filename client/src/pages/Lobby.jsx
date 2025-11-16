import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import socketService from '../utils/socket';
import '../styles/Lobby.css';

function Lobby() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canStart, setCanStart] = useState(false);

  useEffect(() => {
    loadSession();
    const socket = socketService.connect();
    const playerId = localStorage.getItem('playerId');

    socketService.joinSession(sessionId, playerId);

    socketService.onPlayerJoined(() => {
      loadSession();
    });

    const interval = setInterval(loadSession, 2000);

    return () => {
      clearInterval(interval);
      socketService.offPlayerJoined();
      socketService.leaveSession(sessionId);
    };
  }, [sessionId]);

  useEffect(() => {
    setCanStart(players.length === 4 && session?.status === 'waiting');
  }, [players, session]);

  const loadSession = async () => {
    try {
      const result = await api.getSession(sessionId);
      if (result.success) {
        setSession(result.session);
        setPlayers(result.players);

        if (result.session.status === 'in_progress') {
          navigate(`/game/${sessionId}`);
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
    setLoading(false);
  };

  const handleStartGame = async () => {
    try {
      const result = await api.startGame(sessionId);
      if (result.success) {
        navigate(`/game/${sessionId}`);
      } else {
        alert(result.error || 'Failed to start game');
      }
    } catch (error) {
      console.error('Error starting game:', error);
      alert('Failed to start game');
    }
  };

  const copySessionLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    alert('Session link copied to clipboard!');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="lobby-container">
      <div className="lobby-content">
        <h1>{session?.name || 'Game Lobby'}</h1>
        <p className="session-id">Session ID: {sessionId.substring(0, 8)}...</p>

        <div className="lobby-info">
          <button onClick={copySessionLink} className="btn btn-copy">
            Copy Invite Link
          </button>
        </div>

        <div className="players-container">
          <h2>Players ({players.length}/4)</h2>
          <div className="players-grid">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className={`player-slot ${players[index] ? 'filled' : 'empty'}`}>
                <div className="player-number">Player {index + 1}</div>
                <div className="player-name">
                  {players[index]?.player_name || 'Waiting...'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {canStart && (
          <div className="start-game-section">
            <p className="ready-message">All players ready!</p>
            <button onClick={handleStartGame} className="btn btn-start">
              Start Game
            </button>
          </div>
        )}

        {!canStart && players.length < 4 && (
          <p className="waiting-message">
            Waiting for {4 - players.length} more player(s)...
          </p>
        )}
      </div>
    </div>
  );
}

export default Lobby;
