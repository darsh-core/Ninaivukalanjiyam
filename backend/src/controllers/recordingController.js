const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const sarvamService = require('../services/sarvamService');

async function getAllRecordings(req, res) {
    try {
        const { narrator_id, session_id, status, createdBy } = req.query;

        let query = `
            SELECT 
                r.*,
                sq.question_tamil,
                sq.question_english,
                sq.question_type,
                s.id AS session_id,
                s.session_number,
                s.title AS session_title,
                n.id AS narrator_id,
                n.full_name_tamil,
                n.full_name_english,
                n.preferred_name,
                n.created_by,
                u.email AS creator_email,
                u.full_name AS creator_name,
                t.id AS transcript_id,
                t.transcript_text,
                t.source AS transcript_source,
                t.status AS transcript_status,
                t.reviewed_at AS transcript_reviewed_at
            FROM recordings r
            JOIN session_questions sq ON sq.id = r.session_question_id
            JOIN interview_sessions s ON s.id = sq.session_id
            JOIN narrators n ON n.id = s.narrator_id
            LEFT JOIN users u ON u.id = n.created_by
            LEFT JOIN transcripts t ON t.recording_id = r.id AND t.version_number = (
                SELECT MAX(version_number) FROM transcripts WHERE recording_id = r.id
            )
            WHERE r.is_active = TRUE
        `;
        const params = [];

        if (narrator_id) {
            params.push(narrator_id);
            query += ` AND n.id = $${params.length}`;
        }
        if (session_id) {
            params.push(session_id);
            query += ` AND s.id = $${params.length}`;
        }
        if (createdBy) {
            params.push(createdBy);
            query += ` AND n.created_by = $${params.length}`;
        }
        if (status) {
            if (status === 'reviewed') {
                query += ` AND t.reviewed_at IS NOT NULL`;
            } else if (status === 'pending') {
                query += ` AND (t.reviewed_at IS NULL OR t.status = 'pending')`;
            }
        }

        query += ` ORDER BY r.created_at DESC;`;

        const result = await pool.query(query, params);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Get recordings error:', error);
        return res.status(500).json({ success: false, message: 'Unable to retrieve recordings.' });
    }
}

async function getRecordingById(req, res) {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                r.*,
                sq.question_tamil,
                sq.question_english,
                sq.question_type,
                s.id AS session_id,
                s.session_number,
                s.title AS session_title,
                n.id AS narrator_id,
                n.full_name_tamil,
                n.full_name_english,
                n.preferred_name,
                t.id AS transcript_id,
                t.transcript_text,
                t.source AS transcript_source,
                t.status AS transcript_status,
                t.reviewed_at AS transcript_reviewed_at
            FROM recordings r
            JOIN session_questions sq ON sq.id = r.session_question_id
            JOIN interview_sessions s ON s.id = sq.session_id
            JOIN narrators n ON n.id = s.narrator_id
            LEFT JOIN transcripts t ON t.recording_id = r.id AND t.version_number = (
                SELECT MAX(version_number) FROM transcripts WHERE recording_id = r.id
            )
            WHERE r.id = $1;
        `;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Recording not found.' });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get recording by ID error:', error);
        return res.status(500).json({ success: false, message: 'Unable to retrieve recording.' });
    }
}

async function uploadRecording(req, res) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            session_question_id,
            duration_seconds = 0,
            transcript_text,
            base64_data,
            mime_type = 'audio/webm'
        } = req.body;

        if (!session_question_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'session_question_id is required.' });
        }

        // Check current recordings for this question to calculate version_number
        const versionRes = await client.query(
            'SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM recordings WHERE session_question_id = $1',
            [session_question_id]
        );
        const nextVersion = versionRes.rows[0].next_version;

        // Deactivate older active recordings for this question (retain version history)
        await client.query(
            'UPDATE recordings SET is_active = FALSE WHERE session_question_id = $1',
            [session_question_id]
        );

        let filename;
        let fileSizeBytes = 0;

        if (req.file) {
            filename = req.file.filename;
            fileSizeBytes = req.file.size;
        } else if (base64_data) {
            // Save base64 audio
            const buffer = Buffer.from(base64_data.replace(/^data:audio\/\w+;base64,/, ''), 'base64');
            fileSizeBytes = buffer.length;
            const ext = mime_type.includes('wav') ? 'wav' : 'webm';
            filename = `rec_${Date.now()}_v${nextVersion}.${ext}`;
            const targetPath = path.join(__dirname, '../../uploads/recordings', filename);
            fs.writeFileSync(targetPath, buffer);
        } else {
            return res.status(400).json({ success: false, message: 'Audio file or audio recording data is required.' });
        }

        const insertRecQuery = `
            INSERT INTO recordings (
                session_question_id,
                version_number,
                storage_key,
                original_filename,
                mime_type,
                file_size_bytes,
                duration_seconds,
                status,
                is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'saved', TRUE)
            RETURNING *;
        `;
        const recResult = await client.query(insertRecQuery, [
            session_question_id,
            nextVersion,
            filename,
            filename,
            mime_type,
            fileSizeBytes,
            parseFloat(duration_seconds) || 0
        ]);
        const recording = recResult.rows[0];

        // Mark question as answered
        await client.query(
            `UPDATE session_questions 
             SET status = 'answered', answered_at = NOW() 
             WHERE id = $1`,
            [session_question_id]
        );

        // Update session last activity
        await client.query(
            `UPDATE interview_sessions 
             SET last_activity_at = NOW() 
             WHERE id = (SELECT session_id FROM session_questions WHERE id = $1)`,
            [session_question_id]
        );

        // Generate speech-to-text transcript draft via Sarvam Saaras v4 and refine into grammatically correct written Tamil
        let initialTranscriptText = transcript_text;
        if (!initialTranscriptText || initialTranscriptText.trim() === '') {
            try {
                const targetFilePath = path.join(__dirname, '../../uploads/recordings', filename);
                if (fs.existsSync(targetFilePath) && fileSizeBytes > 200) {
                    const sttRes = await sarvamService.transcribeAudio(targetFilePath, filename, mime_type);
                    if (sttRes && sttRes.transcript && sttRes.transcript.trim()) {
                        initialTranscriptText = await sarvamService.refineTamilTranscriptToGrammaticalProse(sttRes.transcript);
                    }
                }
            } catch (sttErr) {
                console.warn('Sarvam Saaras STT notice:', sttErr.message);
            }

            if (!initialTranscriptText || initialTranscriptText.trim() === '') {
                initialTranscriptText = 'ஒலிப்பதிவில் பேச்சு எதுவும் கண்டறியப்படவில்லை (No speech detected in audio).';
            }
        } else {
            try {
                initialTranscriptText = await sarvamService.refineTamilTranscriptToGrammaticalProse(initialTranscriptText);
            } catch (_) {}
        }

        let initialTranscriptEnglish = null;
        if (initialTranscriptText && !initialTranscriptText.includes('No speech detected in audio')) {
            try {
                initialTranscriptEnglish = await sarvamService.translateText(initialTranscriptText, 'ta-IN', 'en-IN');
            } catch (trErr) {
                console.warn('Sarvam translation notice:', trErr.message);
            }
        }

        const insertTranscriptQuery = `
            INSERT INTO transcripts (
                recording_id,
                version_number,
                transcript_text,
                transcript_text_english,
                language_code,
                source,
                status
            )
            VALUES ($1, 1, $2, $3, 'ta', 'speech_to_text', 'completed')
            RETURNING *;
        `;
        const transcriptRes = await client.query(insertTranscriptQuery, [
            recording.id,
            initialTranscriptText,
            initialTranscriptEnglish
        ]);

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: `Recording v${nextVersion} saved successfully.`,
            data: {
                ...recording,
                transcript: transcriptRes.rows[0]
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Upload recording error:', error);
        return res.status(500).json({ success: false, message: 'Unable to save audio recording.' });
    } finally {
        client.release();
    }
}

module.exports = {
    getAllRecordings,
    getRecordingById,
    uploadRecording
};
