import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL);
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinSession(sessionId, playerId) {
    if (this.socket) {
      this.socket.emit('join-session', { sessionId, playerId });
    }
  }

  leaveSession(sessionId) {
    if (this.socket) {
      this.socket.emit('leave-session', { sessionId });
    }
  }

  sendGameAction(sessionId, action, playerId, data) {
    if (this.socket) {
      this.socket.emit('game-action', { sessionId, action, playerId, data });
    }
  }

  onGameUpdate(callback) {
    if (this.socket) {
      this.socket.on('game-update', callback);
    }
  }

  onPlayerJoined(callback) {
    if (this.socket) {
      this.socket.on('player-joined', callback);
    }
  }

  offGameUpdate() {
    if (this.socket) {
      this.socket.off('game-update');
    }
  }

  offPlayerJoined() {
    if (this.socket) {
      this.socket.off('player-joined');
    }
  }
}

export default new SocketService();
