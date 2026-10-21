const pool = require('../src/config/database');
const geminiService = require('../src/services/geminiService');

async function main() {
    console.log('--- Starting Tamil Transcript and Story Draft Grammar Refinement ---');

    // 1. Refine all transcripts
    const transcriptsRes = await pool.query('SELECT id, transcript_text FROM transcripts WHERE transcript_text IS NOT NULL AND length(transcript_text) > 5 ORDER BY id ASC');
    console.log(`Found ${transcriptsRes.rows.length} transcripts to process.`);

    let updatedTranscriptsCount = 0;
    for (let i = 0; i < transcriptsRes.rows.length; i++) {
        const row = transcriptsRes.rows[i];
        const rawText = row.transcript_text;

        // Skip placeholder texts
        if (rawText.includes('ஒலிப்பதிவில் பேச்சு எதுவும் கண்டறியப்படவில்லை') || rawText.includes('No speech detected')) {
            continue;
        }

        try {
            console.log(`[${i + 1}/${transcriptsRes.rows.length}] Refining transcript: ${row.id}...`);
            const refined = await geminiService.refineTamilTranscriptToGrammaticalProse(rawText);
            if (refined && refined !== rawText) {
                let english = null;
                try {
                    english = await geminiService.translateText(refined, 'ta-IN', 'en-IN');
                } catch (_) {}

                await pool.query(
                    'UPDATE transcripts SET transcript_text = $1, transcript_text_english = COALESCE($2, transcript_text_english) WHERE id = $3',
                    [refined, english, row.id]
                );
                updatedTranscriptsCount++;
                console.log(` -> Updated transcript ${row.id}`);
            }
        } catch (err) {
            console.warn(`Failed to refine transcript ${row.id}:`, err.message);
        }
    }
    console.log(`Total transcripts updated to grammatical prose: ${updatedTranscriptsCount}`);

    // 2. Refine all Tamil story drafts
    const draftsRes = await pool.query("SELECT id, title, chapters FROM story_drafts WHERE language_code = 'ta' ORDER BY id ASC");
    console.log(`Found ${draftsRes.rows.length} Tamil story drafts to process.`);

    let updatedDraftsCount = 0;
    for (let d = 0; d < draftsRes.rows.length; d++) {
        const draft = draftsRes.rows[d];
        const chapters = draft.chapters || [];
        let draftModified = false;

        console.log(`Draft ${d + 1}: "${draft.title}" (${chapters.length} chapters)`);
        const updatedChapters = [];

        for (let c = 0; c < chapters.length; c++) {
            const chap = chapters[c];
            if (chap.content && chap.content.length > 5) {
                console.log(`  Refining chapter ${c + 1}: "${chap.title}"...`);
                try {
                    const refinedContent = await geminiService.refineTamilTranscriptToGrammaticalProse(chap.content);
                    if (refinedContent && refinedContent !== chap.content) {
                        updatedChapters.push({
                            ...chap,
                            content: refinedContent
                        });
                        draftModified = true;
                    } else {
                        updatedChapters.push(chap);
                    }
                } catch (err) {
                    console.warn(`  Failed chapter ${c + 1}:`, err.message);
                    updatedChapters.push(chap);
                }
            } else {
                updatedChapters.push(chap);
            }
        }

        if (draftModified) {
            await pool.query('UPDATE story_drafts SET chapters = $1 WHERE id = $2', [JSON.stringify(updatedChapters), draft.id]);
            updatedDraftsCount++;
            console.log(` -> Successfully updated draft ${draft.id} with grammatical chapters!`);
        }
    }

    console.log(`Total story drafts updated: ${updatedDraftsCount}`);
    console.log('--- Grammar refinement completed successfully! ---');
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error during migration:', err);
    process.exit(1);
});
