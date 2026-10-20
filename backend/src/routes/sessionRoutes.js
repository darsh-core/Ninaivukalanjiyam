const express = require('express');
const {
    getAllSessions,
    getSessionById,
    createSession,
    updateSessionStatus,
    addQuestionToSession,
    updateQuestionStatus
} = require('../controllers/sessionController');

const router = express.Router();

router.get('/', getAllSessions);
router.post('/', createSession);
router.get('/:id', getSessionById);
router.patch('/:id/status', updateSessionStatus);
router.post('/:sessionId/questions', addQuestionToSession);
router.patch('/questions/:questionId/status', updateQuestionStatus);

module.exports = router;
