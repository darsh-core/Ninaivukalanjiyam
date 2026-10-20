const express = require('express');
const { login, register, getMe } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', getMe);

module.exports = router;
