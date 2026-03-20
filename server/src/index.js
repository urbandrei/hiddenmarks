const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const config = require('./config');
const healthRouter = require('./routes/health');
const lobbyRouter = require('./routes/lobby');
const errorHandler = require('./middleware/errorHandler');
const { playerIdentity } = require('./middleware/playerIdentity');
const { setupSocketIO } = require('./sockets/index');
const { gameManager } = require('./game/state');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(playerIdentity);

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes
app.use('/', healthRouter);
app.use('/api', lobbyRouter);

// Error handler
app.use(errorHandler);

// Socket.IO
const io = setupSocketIO(server);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, checkpointing all games...');
  await gameManager.checkpointAll();
  server.close(() => {
    logger.info('Server shut down');
    process.exit(0);
  });
});

// Start server
server.listen(config.port, () => {
  logger.info(`Hidden Marks server listening on port ${config.port}`);
});

module.exports = { app, server, io };
