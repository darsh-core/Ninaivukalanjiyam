const express = require('express');
const { getExportPreview, downloadExport } = require('../controllers/exportController');

const router = express.Router();

router.post('/preview', getExportPreview);
router.get('/download/:narratorId', downloadExport);

module.exports = router;
