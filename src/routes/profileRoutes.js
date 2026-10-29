const express = require('express');
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.get('/', profileController.getProfile);
router.post('/progress', profileController.recordProgress);
router.get('/scoreboard', profileController.getScoreboard);

module.exports = router;
