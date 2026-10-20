const pool = require('../config/database');
const sarvamService = require('../services/sarvamService');
const path = require('path');
const fs = require('fs');

async function getTranscriptsByRecording(req, res) {
    try {
        const { recordingId } = req.params;

        const query = `
            SELECT t.*, u.full_name AS reviewed_by_name
            FROM transcripts t
            LEFT JOIN users u ON u.id = t.reviewed_by
            WHERE t.recording_id = $1
            ORDER BY t.version_number DESC;
        `;
        const result = await pool.query(query, [recordingId]);

        return res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get transcripts error:', error);
        return res.status(500).json({ success: false, message: 'Unable to retrieve transcripts.' });
    }
}

async function updateTranscript(req, res) {
    try {
        const { id } = req.params;
        const { transcript_text, is_reviewed = true } = req.body;

        if (transcript_text === undefined || transcript_text === null) {
            return res.status(400).json({ success: false, message: 'Transcript text is required.' });
        }

        // Fetch current transcript to know recording_id and version_number
        const currentRes = await pool.query('SELECT * FROM transcripts WHERE id = $1', [id]);
        if (currentRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Transcript not found.' });
        }
        const current = currentRes.rows[0];

        // Create new corrected version or update
        const nextVersionRes = await pool.query(
            'SELECT COALESCE(MAX(version_number), 0) + 1 AS next_ver FROM transcripts WHERE recording_id = $1',
            [current.recording_id]
        );
        const nextVersion = nextVersionRes.rows[0].next_ver;

        const insertQuery = `
            INSERT INTO transcripts (
                recording_id,
                version_number,
                transcript_text,
                language_code,
                source,
                status,
                reviewed_at
            )
            VALUES ($1, $2, $3, $4, 'corrected', 'completed', $5)
            RETURNING *;
        `;

        const result = await pool.query(insertQuery, [
            current.recording_id,
            nextVersion,
            transcript_text,
            current.language_code || 'ta',
            is_reviewed ? new Date() : null
        ]);

        return res.status(200).json({
            success: true,
            message: 'Transcript corrections saved successfully.',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update transcript error:', error);
        return res.status(500).json({ success: false, message: 'Unable to save transcript corrections.' });
    }
}

async function regenerateTranscript(req, res) {
    try {
        const { recordingId } = req.params;

        const recRes = await pool.query('SELECT * FROM recordings WHERE id = $1', [recordingId]);
        if (recRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Recording not found.' });
        }
        const recording = recRes.rows[0];

        let regeneratedText = '';
        const targetFilename = recording.storage_key || recording.original_filename;
        if (targetFilename) {
            const targetFilePath = path.join(__dirname, '../../uploads/recordings', targetFilename);
            if (fs.existsSync(targetFilePath)) {
                try {
                    const sttRes = await sarvamService.transcribeAudio(targetFilePath, targetFilename, recording.mime_type || 'audio/webm');
                    if (sttRes && sttRes.transcript && sttRes.transcript.trim()) {
                        regeneratedText = await sarvamService.refineTamilTranscriptToGrammaticalProse(sttRes.transcript);
                    }
                } catch (sttErr) {
                    console.warn('Regenerate Sarvam STT notice:', sttErr.message);
                }
            }
        }

        if (!regeneratedText || regeneratedText.trim() === '') {
            regeneratedText = 'ஒலிப்பதிவில் பேச்சு எதுவும் கண்டறியப்படவில்லை (No speech detected in audio).';
        }

        let regeneratedEnglish = null;
        if (regeneratedText && !regeneratedText.includes('No speech detected in audio')) {
            try {
                regeneratedEnglish = await sarvamService.translateText(regeneratedText, 'ta-IN', 'en-IN');
            } catch (trErr) {
                console.warn('Sarvam translation notice:', trErr.message);
            }
        }

        const nextVersionRes = await pool.query(
            'SELECT COALESCE(MAX(version_number), 0) + 1 AS next_ver FROM transcripts WHERE recording_id = $1',
            [recordingId]
        );
        const nextVer = nextVersionRes.rows[0].next_ver;

        const insertQuery = `
            INSERT INTO transcripts (
                recording_id,
                version_number,
                transcript_text,
                transcript_text_english,
                language_code,
                source,
                status
            )
            VALUES ($1, $2, $3, $4, 'ta', 'speech_to_text', 'completed')
            RETURNING *;
        `;
        const result = await pool.query(insertQuery, [recordingId, nextVer, regeneratedText, regeneratedEnglish]);

        return res.status(200).json({
            success: true,
            message: 'Transcript regenerated successfully as grammatically correct written Tamil prose.',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Regenerate transcript error:', error);
        return res.status(500).json({ success: false, message: 'Unable to regenerate transcript.' });
    }
}

/**
 * Refine raw spoken/colloquial Tamil transcript text into grammatically correct written Tamil prose
 */
async function refineTranscriptText(req, res) {
    try {
        const { text } = req.body;
        if (!text || typeof text !== 'string' || text.trim() === '') {
            return res.status(400).json({ success: false, message: 'Text is required for refinement.' });
        }

        const refined = await sarvamService.refineTamilTranscriptToGrammaticalProse(text);
        let english = null;
        try {
            english = await sarvamService.translateText(refined, 'ta-IN', 'en-IN');
        } catch (_) {}

        return res.status(200).json({
            success: true,
            refined_text: refined,
            refined_english: english
        });
    } catch (error) {
        console.error('Refine transcript error:', error);
        return res.status(500).json({ success: false, message: 'Unable to refine transcript text.' });
    }
}

module.exports = {
    getTranscriptsByRecording,
    updateTranscript,
    regenerateTranscript,
    refineTranscriptText
};
