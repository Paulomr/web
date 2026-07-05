const express = require('express');
const router = express.Router();
const controller = require('../controllers/concurso.controller');

router.post('/', controller.crear);
router.get('/top', controller.top);
router.get('/exists', controller.existe);

module.exports = router;
