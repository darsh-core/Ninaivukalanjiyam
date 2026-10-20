const pool = require('../config/database');

async function getQuestionBank(req, res) {
    try {
        const { category } = req.query;
        let query = `
            SELECT * FROM questions 
            WHERE is_enabled = TRUE
        `;
        const params = [];

        if (category) {
            query += ` AND category = $1`;
            params.push(category);
        }

        query += ` ORDER BY display_order ASC;`;

        const result = await pool.query(query, params);

        // Group by categories
        const categories = {};
        for (const q of result.rows) {
            if (!categories[q.category]) {
                categories[q.category] = [];
            }
            categories[q.category].push(q);
        }

        return res.status(200).json({
            success: true,
            total: result.rows.length,
            categories: Object.keys(categories),
            grouped: categories,
            data: result.rows
        });
    } catch (error) {
        console.error('Get questions error:', error);
        return res.status(500).json({ success: false, message: 'Unable to retrieve questions bank.' });
    }
}

module.exports = {
    getQuestionBank
};
