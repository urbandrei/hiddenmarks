const express = require('express');
const router = express.Router();
const GameController = require('../controllers/gameController');

// Session routes
router.post('/sessions', GameController.createSession);
router.get('/sessions/public', GameController.getPublicSessions);
router.get('/sessions/:sessionId', GameController.getSession);
router.post('/sessions/:sessionId/join', GameController.joinSession);
router.post('/sessions/:sessionId/start', GameController.startGame);

// Game action routes
router.post('/sessions/:sessionId/action', GameController.performAction);

module.exports = router;
