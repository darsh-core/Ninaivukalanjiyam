const pool = require('../config/database');

async function getAllSessions(req, res) {
    try {
        const { narrator_id } = req.query;
        let query = `
            SELECT 
                s.*,
                n.full_name_tamil,
                n.full_name_english,
                n.preferred_name,
                COUNT(sq.id) AS question_count,
                COUNT(CASE WHEN sq.status = 'answered' THEN 1 END) AS answered_count,
                COUNT(r.id) AS recording_count
            FROM interview_sessions s
            JOIN narrators n ON n.id = s.narrator_id
            LEFT JOIN session_questions sq ON sq.session_id = s.id
            LEFT JOIN recordings r ON r.session_question_id = sq.id AND r.is_active = TRUE
        `;
        const params = [];

        if (narrator_id) {
            query += ` WHERE s.narrator_id = $1`;
            params.push(narrator_id);
        }

        query += `
            GROUP BY s.id, n.id
            ORDER BY s.last_activity_at DESC;
        `;

        const result = await pool.query(query, params);
        return res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        return res.status(500).json({ success: false, message: 'Unable to retrieve interview sessions.' });
    }
}

async function getSessionById(req, res) {
    try {
        const { id } = req.params;

        const sessionQuery = `
            SELECT 
                s.*, 
                n.full_name_tamil, 
                n.full_name_english, 
                n.preferred_name, 
                n.birth_year, 
                n.place_of_birth, 
                n.tamil_dialect,
                n.created_by,
                u.email AS creator_email,
                u.full_name AS creator_name
            FROM interview_sessions s
            JOIN narrators n ON n.id = s.narrator_id
            LEFT JOIN users u ON u.id = n.created_by
            WHERE s.id = $1;
        `;
        const sessionRes = await pool.query(sessionQuery, [id]);

        if (sessionRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Interview session not found.' });
        }

        const session = sessionRes.rows[0];

        // Fetch questions with active recording and transcript
        const questionsQuery = `
            SELECT 
                sq.*,
                r.id AS recording_id,
                r.storage_key,
                r.duration_seconds,
                r.version_number AS recording_version,
                r.status AS recording_status,
                t.id AS transcript_id,
                t.transcript_text,
                t.transcript_text_english,
                t.source AS transcript_source,
                t.status AS transcript_status,
                t.reviewed_at AS transcript_reviewed_at
            FROM session_questions sq
            LEFT JOIN recordings r ON r.session_question_id = sq.id AND r.is_active = TRUE
            LEFT JOIN transcripts t ON t.recording_id = r.id AND t.version_number = (
                SELECT MAX(version_number) FROM transcripts WHERE recording_id = r.id
            )
            WHERE sq.session_id = $1
            ORDER BY sq.display_order ASC;
        `;
        const questionsRes = await pool.query(questionsQuery, [id]);

        return res.status(200).json({
            success: true,
            data: {
                ...session,
                questions: questionsRes.rows
            }
        });
    } catch (error) {
        console.error('Get session by ID error:', error);
        return res.status(500).json({ success: false, message: 'Unable to retrieve session.' });
    }
}

async function createSession(req, res) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            narrator_id,
            session_number,
            title,
            interview_mode = 'structured',
            preferred_language = 'ta',
            notes
        } = req.body;

        if (!narrator_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Narrator ID is required.' });
        }

        // Calculate next session number if not provided or if conflict exists
        let targetSessionNumber = parseInt(session_number, 10);
        if (!targetSessionNumber || isNaN(targetSessionNumber)) {
            const maxSessionRes = await client.query(
                'SELECT COALESCE(MAX(session_number), 0) + 1 AS next_num FROM interview_sessions WHERE narrator_id = $1',
                [narrator_id]
            );
            targetSessionNumber = parseInt(maxSessionRes.rows[0].next_num, 10);
        } else {
            const conflictRes = await client.query(
                'SELECT id FROM interview_sessions WHERE narrator_id = $1 AND session_number = $2',
                [narrator_id, targetSessionNumber]
            );
            if (conflictRes.rows.length > 0) {
                const maxSessionRes = await client.query(
                    'SELECT COALESCE(MAX(session_number), 0) + 1 AS next_num FROM interview_sessions WHERE narrator_id = $1',
                    [narrator_id]
                );
                targetSessionNumber = parseInt(maxSessionRes.rows[0].next_num, 10);
            }
        }

        const insertSessionQuery = `
            INSERT INTO interview_sessions (
                narrator_id,
                session_number,
                title,
                interview_mode,
                preferred_language,
                notes,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'in_progress')
            RETURNING *;
        `;
        const sessionRes = await client.query(insertSessionQuery, [
            narrator_id,
            targetSessionNumber,
            title || `Session ${targetSessionNumber}`,
            interview_mode,
            preferred_language,
            notes || null
        ]);

        const newSession = sessionRes.rows[0];

        // Seed initial questions based on interview mode
        if (interview_mode !== 'free_storytelling') {
            // Pick starter questions from questions bank
            const bankQuestionsRes = await client.query(
                `SELECT id, question_tamil, question_english 
                 FROM questions 
                 WHERE is_enabled = TRUE 
                 ORDER BY display_order ASC 
                 LIMIT 8;`
            );

            for (let i = 0; i < bankQuestionsRes.rows.length; i++) {
                const q = bankQuestionsRes.rows[i];
                await client.query(
                    `INSERT INTO session_questions (
                        session_id, question_id, question_tamil, question_english, question_type, display_order, status
                     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        newSession.id,
                        q.id,
                        q.question_tamil,
                        q.question_english,
                        interview_mode === 'intelligent' ? 'structured' : interview_mode,
                        i + 1,
                        'pending'
                    ]
                );
            }
        } else {
            // Free storytelling: add default open prompt
            await client.query(
                `INSERT INTO session_questions (
                    session_id, question_tamil, question_english, question_type, display_order, status
                 ) VALUES ($1, $2, $3, 'free_storytelling', 1, 'pending')`,
                [
                    newSession.id,
                    'உங்கள் மனதிற்கு நெருக்கமான எந்த நினைவையும் தாராளமாகப் பகிர்ந்து கொள்ளலாம்.',
                    'Feel free to share any precious memory or life story that is close to your heart.'
                ]
            );
        }

        await client.query('COMMIT');

        // Fetch populated session
        const createdSession = await getSessionByIdInternal(newSession.id);

        return res.status(201).json({
            success: true,
            message: 'Interview session created successfully.',
            data: createdSession
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create session error:', error);
        return res.status(500).json({ success: false, message: 'Unable to start interview session.' });
    } finally {
        client.release();
    }
}

async function updateSessionStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['in_progress', 'paused', 'completed', 'abandoned'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status.' });
        }

        const query = `
            UPDATE interview_sessions
            SET 
                status = $1,
                last_activity_at = NOW(),
                ended_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE ended_at END
            WHERE id = $2
            RETURNING *;
        `;
        const result = await pool.query(query, [status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Session not found.' });
        }

        return res.status(200).json({
            success: true,
            message: `Session marked as ${status}.`,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update session status error:', error);
        return res.status(500).json({ success: false, message: 'Unable to update session status.' });
    }
}

async function addQuestionToSession(req, res) {
    try {
        const { sessionId } = req.params;
        const { question_tamil, question_english, question_type = 'follow_up', question_id } = req.body;

        if (!question_tamil) {
            return res.status(400).json({ success: false, message: 'Question in Tamil is required.' });
        }

        const maxOrderRes = await pool.query(
            'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM session_questions WHERE session_id = $1',
            [sessionId]
        );
        const display_order = maxOrderRes.rows[0].next_order;

        const insertQuery = `
            INSERT INTO session_questions (
                session_id, question_id, question_tamil, question_english, question_type, display_order, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'pending')
            RETURNING *;
        `;
        const result = await pool.query(insertQuery, [
            sessionId,
            question_id || null,
            question_tamil,
            question_english || null,
            question_type,
            display_order
        ]);

        return res.status(201).json({
            success: true,
            message: 'Question added to interview session.',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Add question error:', error);
        return res.status(500).json({ success: false, message: 'Unable to add question.' });
    }
}

async function updateQuestionStatus(req, res) {
    try {
        const { questionId } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'asked', 'answered', 'skipped'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid question status.' });
        }

        const query = `
            UPDATE session_questions
            SET 
                status = $1,
                asked_at = CASE WHEN $1 = 'asked' AND asked_at IS NULL THEN NOW() ELSE asked_at END,
                answered_at = CASE WHEN $1 = 'answered' THEN NOW() ELSE answered_at END
            WHERE id = $2
            RETURNING *;
        `;
        const result = await pool.query(query, [status, questionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Question not found.' });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update question status error:', error);
        return res.status(500).json({ success: false, message: 'Unable to update question status.' });
    }
}

async function getSessionByIdInternal(id) {
    const sessionRes = await pool.query('SELECT * FROM interview_sessions WHERE id = $1', [id]);
    if (sessionRes.rows.length === 0) return null;
    const session = sessionRes.rows[0];

    const questionsRes = await pool.query(
        'SELECT * FROM session_questions WHERE session_id = $1 ORDER BY display_order ASC',
        [id]
    );
    return { ...session, questions: questionsRes.rows };
}

module.exports = {
    getAllSessions,
    getSessionById,
    createSession,
    updateSessionStatus,
    addQuestionToSession,
    updateQuestionStatus
};
