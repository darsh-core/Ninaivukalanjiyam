const express = require('express');
const { getQuestionBank } = require('../controllers/questionController');

const router = express.Router();

router.get('/', getQuestionBank);

module.exports = router;
