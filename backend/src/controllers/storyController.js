const pool = require('../config/database');

async function getStoryDrafts(req, res) {
    try {
        const { narratorId } = req.params;

        const query = `
            SELECT * FROM story_drafts
            WHERE narrator_id = $1
            ORDER BY updated_at DESC;
        `;
        const result = await pool.query(query, [narratorId]);

        return res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get story drafts error:', error);
        return res.status(500).json({ success: false, message: 'Unable to retrieve story drafts.' });
    }
}

async function saveStoryDraft(req, res) {
    try {
        const { narratorId } = req.params;
        const { title, language_code = 'ta', chapters = [], status = 'draft' } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Draft title is required.' });
        }

        const verRes = await pool.query(
            'SELECT COALESCE(MAX(version), 0) + 1 AS next_ver FROM story_drafts WHERE narrator_id = $1',
            [narratorId]
        );
        const version = verRes.rows[0].next_ver;

        const insertQuery = `
            INSERT INTO story_drafts (narrator_id, title, language_code, version, chapters, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const result = await pool.query(insertQuery, [
            narratorId,
            title,
            language_code,
            version,
            JSON.stringify(chapters),
            status
        ]);

        return res.status(201).json({
            success: true,
            message: 'Life story draft saved successfully.',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Save story draft error:', error);
        return res.status(500).json({ success: false, message: 'Unable to save story draft.' });
    }
}

async function updateStoryDraft(req, res) {
    try {
        const { id } = req.params;
        const { title, chapters, language_code, status } = req.body;

        const query = `
            UPDATE story_drafts
            SET 
                title = COALESCE($1::text, title),
                chapters = COALESCE($2::jsonb, chapters),
                language_code = COALESCE($3::text, language_code),
                status = COALESCE($4::text, status),
                updated_at = NOW()
            WHERE id = $5::uuid
            RETURNING *;
        `;
        const result = await pool.query(query, [
            title !== undefined ? title : null,
            chapters !== undefined ? JSON.stringify(chapters) : null,
            language_code !== undefined ? language_code : null,
            status !== undefined ? status : null,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Story draft not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Story draft updated successfully.',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update story draft error:', error);
        return res.status(500).json({ success: false, message: 'Unable to update story draft.' });
    }
}

module.exports = {
    getStoryDrafts,
    saveStoryDraft,
    updateStoryDraft
};
