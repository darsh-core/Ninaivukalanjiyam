/**
 * Maintenance script to refine existing transcripts and life events into grammatically correct literary prose
 * Eliminates speech verse, dialect inflections, and conversational filler words.
 */
const pool = require('../config/database');
const geminiService = require('../services/geminiService');

async function main() {
    console.log('--- Starting Grammatical Refinement of Existing Data ---');

    // 1. Refine Life Events
    console.log('\n1. Checking life_events for speech verse and missing translations...');
    const eventsRes = await pool.query('SELECT * FROM life_events ORDER BY created_at ASC');
    console.log(`Found ${eventsRes.rows.length} total life events.`);

    let eventsUpdated = 0;
    for (const ev of eventsRes.rows) {
        let changed = false;
        let newTitle = ev.title;
        let newTitleTamil = ev.title_tamil;
        let newTitleEnglish = ev.title_english;
        let newDesc = ev.description;
        let newDescEnglish = ev.description_english;

        // Split existing combined title if title_tamil / title_english are missing
        if (!newTitleTamil || !newTitleEnglish) {
            const parenMatch = (ev.title || '').match(/^(.*?)\s*\(([^)]+)\)\s*$/);
            if (parenMatch) {
                if (!newTitleTamil) newTitleTamil = parenMatch[1].trim();
                if (!newTitleEnglish) newTitleEnglish = parenMatch[2].trim();
                changed = true;
            }
        }

        // Check if description has colloquial spoken Tamil patterns
        if (newDesc && /[\u0B80-\u0BFF]/.test(newDesc)) {
            const normalizedDesc = geminiService.ruleBasedTamilNormalizer(newDesc);
            if (normalizedDesc !== newDesc) {
                newDesc = normalizedDesc;
                changed = true;
            }
        }

        // If English description is missing, generate it
        if ((!newDescEnglish || newDescEnglish.trim() === '' || /[\u0B80-\u0BFF]/.test(newDescEnglish)) && newDesc && /[\u0B80-\u0BFF]/.test(newDesc)) {
            try {
                newDescEnglish = await geminiService.translateText(newDesc, 'ta-IN', 'en-IN');
                if (newDescEnglish && newDescEnglish !== newDesc) {
                    changed = true;
                }
            } catch (err) {
                console.warn(`Translation notice for event ${ev.id}:`, err.message);
            }
        }

        if (changed) {
            await pool.query(`
                UPDATE life_events
                SET title = $1, title_tamil = $2, title_english = $3, description = $4, description_english = $5, updated_at = NOW()
                WHERE id = $6
            `, [newTitle, newTitleTamil, newTitleEnglish, newDesc, newDescEnglish, ev.id]);
            eventsUpdated++;
        }
    }
    console.log(`Updated ${eventsUpdated} life events to clean grammatical format.`);

    // 2. Refine Transcripts
    console.log('\n2. Checking transcripts for speech verse...');
    const transcriptsRes = await pool.query('SELECT * FROM transcripts ORDER BY id ASC');
    console.log(`Found ${transcriptsRes.rows.length} total transcripts.`);

    let transcriptsUpdated = 0;
    for (const tr of transcriptsRes.rows) {
        let changed = false;
        let text = tr.transcript_text || '';
        let textEnglish = tr.transcript_text_english;

        if (text && !text.includes('No speech detected in audio')) {
            const normalized = geminiService.ruleBasedTamilNormalizer(text);
            if (normalized !== text) {
                text = normalized;
                changed = true;
            }
        }

        if ((!textEnglish || textEnglish.trim() === '') && text && !text.includes('No speech detected in audio')) {
            try {
                textEnglish = await geminiService.translateText(text, 'ta-IN', 'en-IN');
                if (textEnglish && textEnglish !== text) {
                    changed = true;
                }
            } catch (err) {
                console.warn(`Translation notice for transcript ${tr.id}:`, err.message);
            }
        }

        if (changed) {
            await pool.query(`
                UPDATE transcripts
                SET transcript_text = $1, transcript_text_english = $2
                WHERE id = $3
            `, [text, textEnglish, tr.id]);
            transcriptsUpdated++;
        }
    }
    console.log(`Updated ${transcriptsUpdated} transcripts to clean grammatical format.`);

    console.log('\n--- Grammatical Refinement Completed Successfully ---');
}

main()
    .catch(err => {
        console.error('Migration error:', err);
        process.exit(1);
    })
    .finally(() => pool.end());
