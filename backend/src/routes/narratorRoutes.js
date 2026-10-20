const express = require('express');

const {
    createNarrator,
    getAllNarrators,
    getNarratorById,
    updateNarrator,
    archiveNarrator
} = require('../controllers/narratorController');

const router = express.Router();

router.post('/', createNarrator);
router.get('/', getAllNarrators);
router.get('/:id', getNarratorById);
router.put('/:id', updateNarrator);
router.patch('/:id/archive', archiveNarrator);

module.exports = router;