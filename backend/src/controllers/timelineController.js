const pool = require('../config/database');

async function getTimelineByNarrator(req, res) {
    try {
        const { narratorId } = req.params;

        const query = `
            SELECT DISTINCT ON (le.id)
                le.*,
                es.recording_id,
                es.transcript_id,
                es.source_excerpt,
                r.storage_key,
                r.duration_seconds
            FROM life_events le
            LEFT JOIN event_sources es ON es.event_id = le.id
            LEFT JOIN recordings r ON r.id = es.recording_id
            WHERE le.narrator_id = $1
            ORDER BY le.id, le.created_at ASC;
        `;
        const result = await pool.query(query, [narratorId]);

        // Sort chronologically and deduplicate semantically
        const sortedRows = result.rows.sort((a, b) => {
            const yA = a.approximate_year ?? 9999;
            const yB = b.approximate_year ?? 9999;
            if (yA !== yB) return yA - yB;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        const seenKeys = new Set();
        const uniqueEvents = [];
        for (const ev of sortedRows) {
            const taKey = (ev.title_tamil || '').trim().toLowerCase();
            const sourceKey = (ev.source_excerpt || '').trim().slice(0, 80);
            const dedupKey = taKey ? `ta:${taKey}` : (sourceKey ? `src:${sourceKey}` : `id:${ev.id}`);

            if (!seenKeys.has(dedupKey)) {
                seenKeys.add(dedupKey);
                uniqueEvents.push(ev);
            }
        }

        return res.status(200).json({
            success: true,
            count: uniqueEvents.length,
            data: uniqueEvents
        });
    } catch (error) {
        console.error('Get timeline error:', error);
        return res.status(500).json({ success: false, message: 'Unable to retrieve life timeline.' });
    }
}

async function createLifeEvent(req, res) {
    try {
        const { narratorId } = req.params;
        const {
            title,
            description,
            approximate_year,
            date_precision = 'year',
            event_type = 'Milestone',
            place_name,
            extraction_status = 'confirmed',
            recording_id,
            transcript_id,
            source_excerpt
        } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Event title is required.' });
        }

        const insertEventQuery = `
            INSERT INTO life_events (
                narrator_id, title, description, approximate_year, date_precision, event_type, place_name, extraction_status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const eventRes = await pool.query(insertEventQuery, [
            narratorId,
            title,
            description || null,
            approximate_year ? parseInt(approximate_year, 10) : null,
            date_precision,
            event_type,
            place_name || null,
            extraction_status
        ]);
        const event = eventRes.rows[0];

        if (recording_id) {
            await pool.query(`
                INSERT INTO event_sources (event_id, recording_id, transcript_id, source_excerpt)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT DO NOTHING;
            `, [event.id, recording_id, transcript_id || null, source_excerpt || null]);
        }

        return res.status(201).json({
            success: true,
            message: 'Life event added successfully.',
            data: event
        });
    } catch (error) {
        console.error('Create life event error:', error);
        return res.status(500).json({ success: false, message: 'Unable to save life event.' });
    }
}

async function updateLifeEventStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['unreviewed', 'confirmed', 'corrected', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid extraction status.' });
        }

        const query = `
            UPDATE life_events
            SET extraction_status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *;
        `;
        const result = await pool.query(query, [status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Life event not found.' });
        }

        return res.status(200).json({
            success: true,
            message: `Event status updated to ${status}.`,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update event status error:', error);
        return res.status(500).json({ success: false, message: 'Unable to update event status.' });
    }
}

async function updateLifeEvent(req, res) {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            approximate_year,
            place_name,
            event_type,
            extraction_status
        } = req.body;

        const query = `
            UPDATE life_events
            SET 
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                approximate_year = COALESCE($3, approximate_year),
                place_name = COALESCE($4, place_name),
                event_type = COALESCE($5, event_type),
                extraction_status = COALESCE($6, extraction_status),
                updated_at = NOW()
            WHERE id = $7
            RETURNING *;
        `;
        const result = await pool.query(query, [
            title,
            description,
            approximate_year ? parseInt(approximate_year, 10) : null,
            place_name,
            event_type,
            extraction_status,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Life event not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Life event updated successfully.',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update life event error:', error);
        return res.status(500).json({ success: false, message: 'Unable to update life event.' });
    }
}

async function deleteLifeEvent(req, res) {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM event_sources WHERE event_id = $1', [id]);
        const result = await pool.query('DELETE FROM life_events WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Life event not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Life event removed from timeline.'
        });
    } catch (error) {
        console.error('Delete life event error:', error);
        return res.status(500).json({ success: false, message: 'Unable to delete life event.' });
    }
}

module.exports = {
    getTimelineByNarrator,
    createLifeEvent,
    updateLifeEventStatus,
    updateLifeEvent,
    deleteLifeEvent
};
