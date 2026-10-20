const pool = require('../config/database');

async function getDashboardOverview(req, res) {
    try {
        // 1. Metric counts
        const narratorsCountRes = await pool.query("SELECT COUNT(*) AS count FROM narrators WHERE status = 'active'");
        const sessionsCountRes = await pool.query("SELECT COUNT(*) AS count FROM interview_sessions");
        const recordingsCountRes = await pool.query("SELECT COUNT(*) AS count FROM recordings WHERE is_active = TRUE");
        const pendingTranscriptsRes = await pool.query("SELECT COUNT(*) AS count FROM transcripts WHERE reviewed_at IS NULL");
        const memoriesCountRes = await pool.query("SELECT COUNT(*) AS count FROM life_events");

        const metrics = {
            totalNarrators: parseInt(narratorsCountRes.rows[0].count, 10),
            interviewSessions: parseInt(sessionsCountRes.rows[0].count, 10),
            storiesRecorded: parseInt(recordingsCountRes.rows[0].count, 10),
            pendingTranscripts: parseInt(pendingTranscriptsRes.rows[0].count, 10),
            memoriesCollected: parseInt(memoriesCountRes.rows[0].count, 10)
        };

        // 2. Recently interviewed narrators
        const recentNarratorsRes = await pool.query(`
            SELECT 
                n.id,
                n.full_name_tamil,
                n.full_name_english,
                n.preferred_name,
                n.birth_year,
                n.place_of_birth,
                n.tamil_dialect,
                n.profile_photo_url,
                COALESCE(s.session_count, 0) AS session_count,
                s.last_interview_at
            FROM narrators n
            LEFT JOIN (
                SELECT 
                    narrator_id,
                    COUNT(*) AS session_count,
                    MAX(started_at) AS last_interview_at
                FROM interview_sessions
                GROUP BY narrator_id
            ) s ON s.narrator_id = n.id
            WHERE n.status = 'active'
            ORDER BY s.last_interview_at DESC NULLS LAST, n.created_at DESC
            LIMIT 4;
        `);

        // 3. Continue an unfinished interview
        const unfinishedSessionRes = await pool.query(`
            SELECT 
                s.*,
                n.full_name_tamil,
                n.full_name_english,
                n.preferred_name,
                COUNT(sq.id) AS total_questions,
                COUNT(CASE WHEN sq.status = 'answered' THEN 1 END) AS answered_questions
            FROM interview_sessions s
            JOIN narrators n ON n.id = s.narrator_id
            LEFT JOIN session_questions sq ON sq.session_id = s.id
            WHERE s.status = 'in_progress'
            GROUP BY s.id, n.id
            ORDER BY s.last_activity_at DESC
            LIMIT 1;
        `);

        // 4. Recently recorded stories
        const recentStoriesRes = await pool.query(`
            SELECT 
                r.id,
                r.storage_key,
                r.duration_seconds,
                r.created_at,
                sq.question_tamil,
                sq.question_english,
                n.id AS narrator_id,
                n.full_name_tamil,
                n.full_name_english,
                n.preferred_name,
                s.title AS session_title,
                t.transcript_text,
                t.reviewed_at
            FROM recordings r
            JOIN session_questions sq ON sq.id = r.session_question_id
            JOIN interview_sessions s ON s.id = sq.session_id
            JOIN narrators n ON n.id = s.narrator_id
            LEFT JOIN transcripts t ON t.recording_id = r.id AND t.version_number = (
                SELECT MAX(version_number) FROM transcripts WHERE recording_id = r.id
            )
            WHERE r.is_active = TRUE
            ORDER BY r.created_at DESC
            LIMIT 4;
        `);

        // 5. Recent Activity from actual recordings
        const activitiesRes = await pool.query(`
            SELECT 
                r.id,
                'recording' AS type,
                CONCAT('புதிய ஒலிப்பதிவு: "', COALESCE(sq.question_tamil, sq.question_english), '"') AS text,
                r.created_at
            FROM recordings r
            JOIN session_questions sq ON sq.id = r.session_question_id
            WHERE r.is_active = TRUE
            ORDER BY r.created_at DESC
            LIMIT 5;
        `);
        const recentActivities = activitiesRes.rows.map(a => ({
            id: a.id,
            type: a.type,
            text: a.text,
            time: new Date(a.created_at).toLocaleDateString()
        }));

        return res.status(200).json({
            success: true,
            data: {
                metrics,
                recentNarrators: recentNarratorsRes.rows,
                unfinishedSession: unfinishedSessionRes.rows[0] || null,
                recentStories: recentStoriesRes.rows,
                recentActivities
            }
        });
    } catch (error) {
        console.error('Dashboard overview error:', error);
        return res.status(500).json({ success: false, message: 'Unable to retrieve dashboard metrics.' });
    }
}

module.exports = {
    getDashboardOverview
};
