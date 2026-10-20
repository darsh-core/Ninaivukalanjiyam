const express = require('express');
const {
    getTimelineByNarrator,
    createLifeEvent,
    updateLifeEventStatus,
    updateLifeEvent,
    deleteLifeEvent
} = require('../controllers/timelineController');

const router = express.Router();

router.get('/narrators/:narratorId', getTimelineByNarrator);
router.post('/narrators/:narratorId', createLifeEvent);
router.patch('/events/:id/status', updateLifeEventStatus);
router.put('/events/:id', updateLifeEvent);
router.delete('/events/:id', deleteLifeEvent);

module.exports = router;
