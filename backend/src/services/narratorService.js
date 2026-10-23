const pool = require('../config/database');

async function createNarrator(data) {
    const query = `
        INSERT INTO narrators (
            full_name_tamil,
            full_name_english,
            preferred_name,
            birth_year,
            place_of_birth,
            preferred_language,
            tamil_dialect,
            profile_photo_url,
            created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
    `;

    const values = [
        data.full_name_tamil || null,
        data.full_name_english || null,
        data.preferred_name || null,
        data.birth_year ? parseInt(data.birth_year, 10) : null,
        data.place_of_birth || null,
        data.preferred_language || 'ta',
        data.tamil_dialect || null,
        data.profile_photo_url || null,
        data.created_by || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
}

async function getAllNarrators(filters = {}) {
    let whereClause = "WHERE n.status = 'active'";
    const params = [];

    if (filters.createdBy) {
        params.push(filters.createdBy);
        whereClause += ` AND n.created_by = $${params.length}`;
    }

    const query = `
        SELECT 
            n.*,
            u.full_name AS creator_name,
            u.email AS creator_email,
            COALESCE(s.session_count, 0)::int AS session_count,
            COALESCE(r.recording_count, 0)::int AS recording_count,
            COALESCE(e.event_count, 0)::int AS event_count,
            ls.last_session_title,
            ls.last_session_date
        FROM narrators n
        LEFT JOIN users u ON u.id = n.created_by
        LEFT JOIN (
            SELECT narrator_id, COUNT(*) AS session_count
            FROM interview_sessions
            GROUP BY narrator_id
        ) s ON s.narrator_id = n.id
        LEFT JOIN (
            SELECT s.narrator_id, COUNT(r.id) AS recording_count
            FROM interview_sessions s
            JOIN session_questions sq ON sq.session_id = s.id
            JOIN recordings r ON r.session_question_id = sq.id AND r.is_active = TRUE
            GROUP BY s.narrator_id
        ) r ON r.narrator_id = n.id
        LEFT JOIN (
            SELECT narrator_id, COUNT(*) AS event_count
            FROM life_events
            GROUP BY narrator_id
        ) e ON e.narrator_id = n.id
        LEFT JOIN LATERAL (
            SELECT title AS last_session_title, started_at AS last_session_date
            FROM interview_sessions
            WHERE narrator_id = n.id
            ORDER BY started_at DESC
            LIMIT 1
        ) ls ON TRUE
        ${whereClause}
        ORDER BY n.created_at DESC;
    `;

    const result = await pool.query(query, params);
    return result.rows;
}

async function getNarratorById(id) {
    const narratorQuery = `
        SELECT 
            n.*,
            u.full_name AS creator_name,
            u.email AS creator_email
        FROM narrators n
        LEFT JOIN users u ON u.id = n.created_by
        WHERE n.id = $1;
    `;
    const narratorResult = await pool.query(narratorQuery, [id]);
    const narrator = narratorResult.rows[0];

    if (!narrator) return null;

    // Fetch sessions
    const sessionsQuery = `
        SELECT 
            s.*,
            COUNT(sq.id)::int AS total_questions,
            COUNT(CASE WHEN sq.status = 'answered' THEN 1 END)::int AS answered_questions,
            COUNT(r.id)::int AS recording_count
        FROM interview_sessions s
        LEFT JOIN session_questions sq ON sq.session_id = s.id
        LEFT JOIN recordings r ON r.session_question_id = sq.id AND r.is_active = TRUE
        WHERE s.narrator_id = $1
        GROUP BY s.id
        ORDER BY s.session_number ASC;
    `;
    const sessionsResult = await pool.query(sessionsQuery, [id]);

    // Fetch life events
    const timelineQuery = `
        SELECT *
        FROM life_events
        WHERE narrator_id = $1
        ORDER BY COALESCE(approximate_year, 1900) ASC, created_at ASC;
    `;
    const timelineResult = await pool.query(timelineQuery, [id]);

    // Fetch recorded stories
    const recordingsQuery = `
        SELECT 
            r.*,
            sq.question_tamil,
            sq.question_english,
            s.id AS session_id,
            s.title AS session_title,
            s.session_number,
            t.id AS transcript_id,
            t.transcript_text,
            t.source AS transcript_source,
            t.reviewed_at AS transcript_reviewed_at
        FROM recordings r
        JOIN session_questions sq ON r.session_question_id = sq.id
        JOIN interview_sessions s ON sq.session_id = s.id
        LEFT JOIN transcripts t ON t.recording_id = r.id AND t.version_number = (
            SELECT MAX(version_number) FROM transcripts WHERE recording_id = r.id
        )
        WHERE s.narrator_id = $1 AND r.is_active = TRUE
        ORDER BY r.created_at DESC;
    `;
    const recordingsResult = await pool.query(recordingsQuery, [id]);

    // Fetch story drafts
    const draftsQuery = `
        SELECT *
        FROM story_drafts
        WHERE narrator_id = $1
        ORDER BY updated_at DESC;
    `;
    const draftsResult = await pool.query(draftsQuery, [id]);

    return {
        ...narrator,
        sessions: sessionsResult.rows,
        timeline: timelineResult.rows,
        recordings: recordingsResult.rows,
        drafts: draftsResult.rows
    };
}

async function updateNarrator(id, data) {
    const query = `
        UPDATE narrators
        SET
            full_name_tamil = $1,
            full_name_english = $2,
            preferred_name = $3,
            birth_year = $4,
            place_of_birth = $5,
            preferred_language = $6,
            tamil_dialect = $7,
            profile_photo_url = COALESCE($8, profile_photo_url),
            updated_at = NOW()
        WHERE id = $9
          AND status = 'active'
        RETURNING *;
    `;

    const values = [
        data.full_name_tamil || null,
        data.full_name_english || null,
        data.preferred_name || null,
        data.birth_year ? parseInt(data.birth_year, 10) : null,
        data.place_of_birth || null,
        data.preferred_language || 'ta',
        data.tamil_dialect || null,
        data.profile_photo_url || null,
        id
    ];

    const result = await pool.query(query, values);
    return result.rows[0] || null;
}

async function archiveNarrator(id) {
    const query = `
        UPDATE narrators
        SET status = 'archived',
            updated_at = NOW()
        WHERE id = $1
          AND status = 'active'
        RETURNING *;
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
}

module.exports = {
    createNarrator,
    getAllNarrators,
    getNarratorById,
    updateNarrator,
    archiveNarrator
};