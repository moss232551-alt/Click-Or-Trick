const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.me);
router.get('/discord/login', authController.startDiscordOAuth);
router.get('/discord/callback', authController.discordCallback);
router.get('/google/login', authController.startGoogleOAuth);
router.get('/google/callback', authController.googleCallback);

module.exports = router;
