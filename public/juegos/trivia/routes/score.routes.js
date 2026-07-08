const express = require('express');
const router = express.Router();
const controller = require('../controllers/score.controller');

router.post('/', controller.crear);
router.get('/:gameId/top', controller.top);

module.exports = router;
