const express = require('express');
const {
    getTranscriptsByRecording,
    updateTranscript,
    regenerateTranscript,
    refineTranscriptText
} = require('../controllers/transcriptController');

const router = express.Router();

router.get('/by-recording/:recordingId', getTranscriptsByRecording);
router.put('/:id', updateTranscript);
router.post('/by-recording/:recordingId/regenerate', regenerateTranscript);
router.post('/refine-prose', refineTranscriptText);

module.exports = router;
