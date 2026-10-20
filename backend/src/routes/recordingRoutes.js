const express = require('express');
const multer = require('multer');
const path = require('path');
const {
    getAllRecordings,
    getRecordingById,
    uploadRecording
} = require('../controllers/recordingController');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads/recordings'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.webm';
        cb(null, `audio-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const router = express.Router();

router.get('/', getAllRecordings);
router.get('/:id', getRecordingById);
router.post('/upload', upload.single('audio_file'), uploadRecording);

module.exports = router;
