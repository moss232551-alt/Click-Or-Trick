const express = require('express');
const controller = require('../controllers/challengeController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/generate', controller.getChallenge);
router.get('/samples', controller.getSamples);
router.get('/results/recent', controller.getRecentResults);
router.post('/results', controller.recordResult);
router.post('/clues/reveal', authenticate, controller.handleClueReveal);

module.exports = router;
