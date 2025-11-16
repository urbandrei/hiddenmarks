const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const gameRoutes = require('./routes/game');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/game', gameRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Socket.IO connection handling
const sessionRooms = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-session', ({ sessionId, playerId }) => {
    socket.join(sessionId);

    if (!sessionRooms.has(sessionId)) {
      sessionRooms.set(sessionId, new Set());
    }
    sessionRooms.get(sessionId).add(socket.id);

    console.log(`Player ${playerId} joined session ${sessionId}`);

    // Notify others in the room
    socket.to(sessionId).emit('player-joined', { playerId });
  });

  socket.on('game-action', async ({ sessionId, action, playerId, data }) => {
    // Broadcast action to all players in the session
    io.to(sessionId).emit('game-update', {
      action,
      playerId,
      data,
      timestamp: Date.now()
    });
  });

  socket.on('leave-session', ({ sessionId }) => {
    socket.leave(sessionId);
    if (sessionRooms.has(sessionId)) {
      sessionRooms.get(sessionId).delete(socket.id);
      if (sessionRooms.get(sessionId).size === 0) {
        sessionRooms.delete(sessionId);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Clean up session rooms
    for (const [sessionId, sockets] of sessionRooms.entries()) {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          sessionRooms.delete(sessionId);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };
