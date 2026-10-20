const express = require('express');
const {
    getFollowUpQuestions,
    extractMemories,
    generateStoryDraft,
    synthesizeSpeech
} = require('../controllers/aiController');

const router = express.Router();

router.post('/follow-up-questions', getFollowUpQuestions);
router.post('/narrators/:narratorId/extract-memories', extractMemories);
router.post('/narrators/:narratorId/generate-story-draft', generateStoryDraft);
router.post('/text-to-speech', synthesizeSpeech);

module.exports = router;
