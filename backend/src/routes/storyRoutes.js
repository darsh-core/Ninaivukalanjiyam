const express = require('express');
const {
    getStoryDrafts,
    saveStoryDraft,
    updateStoryDraft
} = require('../controllers/storyController');

const router = express.Router();

router.get('/narrators/:narratorId', getStoryDrafts);
router.post('/narrators/:narratorId', saveStoryDraft);
router.put('/drafts/:id', updateStoryDraft);

module.exports = router;
