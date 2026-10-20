const narratorService = require('../services/narratorService');
const pool = require('../config/database');

async function createNarrator(req, res) {
    try {
        const {
            full_name_tamil,
            full_name_english,
            preferred_name,
            birth_year,
            place_of_birth,
            preferred_language,
            tamil_dialect,
            profile_photo_url
        } = req.body;

        if (!full_name_tamil?.trim() && !full_name_english?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Provide the narrator name in Tamil or English.'
            });
        }

        const parsedBirthYear = birth_year ? parseInt(birth_year, 10) : null;
        if (
            parsedBirthYear !== null &&
            (isNaN(parsedBirthYear) || parsedBirthYear < 1800 || parsedBirthYear > new Date().getFullYear())
        ) {
            return res.status(400).json({
                success: false,
                message: 'Provide a valid birth year.'
            });
        }

        const narrator = await narratorService.createNarrator({
            full_name_tamil,
            full_name_english,
            preferred_name,
            birth_year: parsedBirthYear,
            place_of_birth,
            preferred_language: preferred_language || 'ta',
            tamil_dialect,
            profile_photo_url,
            created_by: req.body.created_by || (req.headers.authorization?.startsWith('Bearer token_') ? req.headers.authorization.replace('Bearer token_', '').split('_')[0] : null)
        });

        return res.status(201).json({
            success: true,
            message: 'Narrator created successfully.',
            data: narrator
        });
    } catch (error) {
        console.error('Create narrator error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Unable to create narrator.'
        });
    }
}

async function getAllNarrators(req, res) {
    try {
        const filters = {};
        let tokenUserId = null;
        if (req.headers.authorization?.startsWith('Bearer token_')) {
            tokenUserId = req.headers.authorization.replace('Bearer token_', '').split('_')[0];
        }

        if (req.query.createdBy) {
            filters.createdBy = req.query.createdBy;
        } else if (tokenUserId && req.query.all !== 'true') {
            try {
                const userRes = await pool.query('SELECT role FROM users WHERE id = $1', [tokenUserId]);
                if (userRes.rows.length > 0 && userRes.rows[0].role !== 'admin') {
                    filters.createdBy = tokenUserId;
                }
            } catch (err) {
                console.warn('Auth token role check error:', err.message);
                filters.createdBy = tokenUserId;
            }
        }

        const narrators = await narratorService.getAllNarrators(filters);
        return res.status(200).json({
            success: true,
            count: narrators.length,
            data: narrators
        });
    } catch (error) {
        console.error('Get narrators error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve narrators.'
        });
    }
}

async function getNarratorById(req, res) {
    try {
        const narrator = await narratorService.getNarratorById(req.params.id);

        if (!narrator) {
            return res.status(404).json({
                success: false,
                message: 'Narrator not found.'
            });
        }

        return res.status(200).json({
            success: true,
            data: narrator
        });
    } catch (error) {
        if (error.code === '22P02') {
            return res.status(400).json({
                success: false,
                message: 'Invalid narrator ID.'
            });
        }

        console.error('Get narrator error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve narrator.'
        });
    }
}

async function updateNarrator(req, res) {
    try {
        const {
            full_name_tamil,
            full_name_english,
            preferred_name,
            birth_year,
            place_of_birth,
            preferred_language,
            tamil_dialect,
            profile_photo_url
        } = req.body;

        if (!full_name_tamil?.trim() && !full_name_english?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Provide the narrator name in Tamil or English.'
            });
        }

        const parsedBirthYear = birth_year ? parseInt(birth_year, 10) : null;

        const narrator = await narratorService.updateNarrator(
            req.params.id,
            {
                full_name_tamil,
                full_name_english,
                preferred_name,
                birth_year: parsedBirthYear,
                place_of_birth,
                preferred_language,
                tamil_dialect,
                profile_photo_url
            }
        );

        if (!narrator) {
            return res.status(404).json({
                success: false,
                message: 'Active narrator not found.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Narrator updated successfully.',
            data: narrator
        });
    } catch (error) {
        console.error('Update narrator error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Unable to update narrator.'
        });
    }
}

async function archiveNarrator(req, res) {
    try {
        const narrator = await narratorService.archiveNarrator(req.params.id);

        if (!narrator) {
            return res.status(404).json({
                success: false,
                message: 'Active narrator not found.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Narrator archived successfully.',
            data: narrator
        });
    } catch (error) {
        console.error('Archive narrator error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Unable to archive narrator.'
        });
    }
}

module.exports = {
    createNarrator,
    getAllNarrators,
    getNarratorById,
    updateNarrator,
    archiveNarrator
};