const express = require('express');
const levelController = require('../controllers/levelController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.get('/', levelController.getLevels);

module.exports = router;
