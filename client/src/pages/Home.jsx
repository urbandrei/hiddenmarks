import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import '../styles/Home.css';

function Home() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [publicSessions, setPublicSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPublicSessions();
  }, []);

  const loadPublicSessions = async () => {
    try {
      const result = await api.getPublicSessions();
      if (result.success) {
        setPublicSessions(result.sessions);
      }
    } catch (error) {
      console.error('Error loading public sessions:', error);
    }
  };

  const createPrivateSession = async () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const result = await api.createSession(sessionName || 'Private Game', false);
      if (result.success) {
        const joinResult = await api.joinSession(result.session.id, playerName);
        if (joinResult.success) {
          localStorage.setItem('playerId', joinResult.player.id);
          localStorage.setItem('playerName', playerName);
          navigate(`/lobby/${result.session.id}`);
        }
      }
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session');
    }
    setLoading(false);
  };

  const createPublicSession = async () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const result = await api.createSession(sessionName || 'Public Game', true);
      if (result.success) {
        const joinResult = await api.joinSession(result.session.id, playerName);
        if (joinResult.success) {
          localStorage.setItem('playerId', joinResult.player.id);
          localStorage.setItem('playerName', playerName);
          navigate(`/lobby/${result.session.id}`);
        }
      }
    } catch (error) {
      console.error('Error creating public session:', error);
      alert('Failed to create public session');
    }
    setLoading(false);
  };

  const joinPublicSession = async (sessionId) => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const result = await api.joinSession(sessionId, playerName);
      if (result.success) {
        localStorage.setItem('playerId', result.player.id);
        localStorage.setItem('playerName', playerName);
        navigate(`/lobby/${sessionId}`);
      } else {
        alert(result.error || 'Failed to join session');
      }
    } catch (error) {
      console.error('Error joining session:', error);
      alert('Failed to join session');
    }
    setLoading(false);
  };

  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="game-title">Hidden Marks</h1>
        <p className="game-subtitle">Be the last assassin standing</p>

        <div className="player-setup">
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="input-field"
            maxLength={20}
          />
        </div>

        <div className="session-setup">
          <input
            type="text"
            placeholder="Session name (optional)"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="input-field"
            maxLength={30}
          />

          <div className="button-group">
            <button
              onClick={createPrivateSession}
              disabled={loading}
              className="btn btn-primary"
            >
              Create Private Game
            </button>
            <button
              onClick={createPublicSession}
              disabled={loading}
              className="btn btn-secondary"
            >
              Create Public Game
            </button>
          </div>
        </div>

        {publicSessions.length > 0 && (
          <div className="public-sessions">
            <h2>Join Public Game</h2>
            <div className="sessions-list">
              {publicSessions.map((session) => (
                <div key={session.id} className="session-card">
                  <div className="session-info">
                    <h3>{session.name}</h3>
                    <p>{session.player_count}/4 players</p>
                  </div>
                  <button
                    onClick={() => joinPublicSession(session.id)}
                    disabled={loading}
                    className="btn btn-join"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rules-link">
          <a href="#rules" onClick={(e) => { e.preventDefault(); alert('Rules: Be the last player alive! Use cards to kill opponents and protect yourself.'); }}>
            How to Play
          </a>
        </div>
      </div>
    </div>
  );
}

export default Home;
