const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const api = {
  async createSession(name, isPublic) {
    const response = await fetch(`${API_BASE}/game/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, isPublic })
    });
    return response.json();
  },

  async getSession(sessionId) {
    const response = await fetch(`${API_BASE}/game/sessions/${sessionId}`);
    return response.json();
  },

  async getPublicSessions() {
    const response = await fetch(`${API_BASE}/game/sessions/public`);
    return response.json();
  },

  async joinSession(sessionId, playerName) {
    const response = await fetch(`${API_BASE}/game/sessions/${sessionId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName })
    });
    return response.json();
  },

  async startGame(sessionId) {
    const response = await fetch(`${API_BASE}/game/sessions/${sessionId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  },

  async performAction(sessionId, action, playerId, data) {
    const response = await fetch(`${API_BASE}/game/sessions/${sessionId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, playerId, data })
    });
    return response.json();
  }
};
