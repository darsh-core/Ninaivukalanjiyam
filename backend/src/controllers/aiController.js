const pool = require('../config/database');
const geminiService = require('../services/geminiService');

// Smart contextual follow-up questions engine
async function getFollowUpQuestions(req, res) {
    try {
        const { question, answer, narrator_name, preferred_language = 'ta' } = req.body;

        // Try Gemini live intelligent question generation first
        if (question && question.trim().length > 3) {
            try {
                const liveSuggestions = await geminiService.generateFollowUpQuestions({
                    question,
                    answer,
                    narratorName: narrator_name
                });
                if (liveSuggestions && liveSuggestions.length > 0) {
                    return res.status(200).json({
                        success: true,
                        source: 'gemini',
                        promptContext: {
                            question,
                            answer: answer || '',
                            narrator: narrator_name || 'Narrator'
                        },
                        suggestions: liveSuggestions
                    });
                }
            } catch (aiErr) {
                console.warn('Gemini follow-up warning:', aiErr.message);
            }
        }

        const tamilFollowups = [];
        const englishFollowups = [];

        // Context-aware heuristics based on keywords in question or answer
        const text = (question + ' ' + (answer || '')).toLowerCase();

        if (text.includes('பள்ளி') || text.includes('school') || text.includes('படிப்')) {
            tamilFollowups.push({
                tamil: 'உங்கள் நண்பர்களில் யாரை இன்னும் நினைவில் வைத்திருக்கிறீர்கள்?',
                english: 'Which of your friends do you still remember warmly?',
                theme: 'Friends & Companions'
            });
            tamilFollowups.push({
                tamil: 'பள்ளிக்குச் செல்லும் வழியில் நடந்த மறக்க முடியாத நிகழ்வு ஏதாவது உள்ளதா?',
                english: 'Was there any unforgettable incident that occurred on your way to school?',
                theme: 'Memorable Journey'
            });
            tamilFollowups.push({
                tamil: 'உங்கள் ஆசிரியர்களில் உங்களுக்கு மிகவும் பிடித்தவர் அல்லது தாக்கம் ஏற்படுத்தியவர் யார்?',
                english: 'Who among your teachers was your favorite or had the deepest impact?',
                theme: 'Teachers & Mentors'
            });
            tamilFollowups.push({
                tamil: 'மதிய உணவு இடைவேளையில் நண்பர்களுடன் பகிர்ந்து சாப்பிட்ட உணவு நினைவுகள் உண்டா?',
                english: 'Do you remember sharing meals with classmates during lunch breaks?',
                theme: 'Food & Memories'
            });
        } else if (text.includes('குழந்தை') || text.includes('childhood') || text.includes('வளர்ந்த')) {
            tamilFollowups.push({
                tamil: 'அந்தக் காலத்தில் உங்கள் வீட்டின் சூழலும், அக்கம் பக்கத்தினருடன் இருந்த நட்பும் எப்படி இருந்தது?',
                english: 'How was the home atmosphere and neighborly bond during those years?',
                theme: 'Neighborhood'
            });
            tamilFollowups.push({
                tamil: 'மழைக்காலங்களில் ஆற்றில் அல்லது வீட்டின் முற்றத்தில் விளையாடிய நினைவுகள் உண்டா?',
                english: 'Do you remember playing during monsoons near the river or in the courtyard?',
                theme: 'Nature & Play'
            });
            tamilFollowups.push({
                tamil: 'உங்கள் தாத்தா பாட்டி சொன்ன கதைகளில் உங்கள் மனதில் ஆழமாகப் பதிந்தது எது?',
                english: 'Which story told by your grandparents left the deepest impression on you?',
                theme: 'Grandparent Stories'
            });
        } else if (text.includes('வேலை') || text.includes('career') || text.includes('தொழில்') || text.includes('பணி')) {
            tamilFollowups.push({
                tamil: 'உங்கள் முதல் மாதச் சம்பளத்தை கையில் வாங்கிய தருணம் எப்படி இருந்தது? அதை என்ன செய்தீர்கள்?',
                english: 'How did it feel holding your very first salary? What did you do with it?',
                theme: 'First Salary'
            });
            tamilFollowups.push({
                tamil: 'தொழில் தொடக்கத்தில் உங்களுக்கு உறுதுணையாக நின்ற வழிகாட்டி அல்லது பெரியவர் யார்?',
                english: 'Who was the senior mentor or guide who supported you early in your career?',
                theme: 'Mentorship'
            });
            tamilFollowups.push({
                tamil: 'அக்காலத்தில் இருந்த பணிச் சூழலுக்கும் இன்றைய முறைக்கும் நீங்கள் காணும் முக்கிய வேறுபாடு என்ன?',
                english: 'What major differences do you notice between work life back then and today?',
                theme: 'Evolution of Work'
            });
        } else if (text.includes('திருமணம்') || text.includes('marriage') || text.includes('குடும்பம்')) {
            tamilFollowups.push({
                tamil: 'திருமணத்திற்குப் பிறகு குடும்பத்தை வழிநடத்தியதில் நீங்கள் கற்ற முக்கியமான பாடம் என்ன?',
                english: 'What was the most important life lesson you learned after starting family life?',
                theme: 'Life Wisdom'
            });
            tamilFollowups.push({
                tamil: 'அந்தக் காலத் திருமணங்களில் விசேஷமாக சமைக்கப்படும் பாரம்பரிய உணவுகள் பற்றி சொல்ல முடியுமா?',
                english: 'Could you describe the traditional wedding feasts and delicacies prepared back then?',
                theme: 'Traditions & Food'
            });
            tamilFollowups.push({
                tamil: 'குடும்பத்தில் அனைவரையும் ஒன்றுசேர்த்து வைத்த முக்கிய நற்பண்பு எது?',
                english: 'What family value or virtue kept everyone united through ups and downs?',
                theme: 'Unity'
            });
        } else {
            // General empathetic followups
            tamilFollowups.push({
                tamil: 'அந்த நிகழ்வின் போது உங்கள் மனதில் தோன்றிய மிக முக்கியமான எண்ணம் அல்லது உணர்வு என்ன?',
                english: 'What was the most significant feeling or thought in your mind during that experience?',
                theme: 'Inner Reflection'
            });
            tamilFollowups.push({
                tamil: 'அதைப்பற்றி நினைக்கும் போது உங்கள் நினைவுக்கு வரும் குறிப்பிட்ட நபர் யார்?',
                english: 'Who is the specific person that comes to mind when you reminisce about that?',
                theme: 'Cherished Person'
            });
            tamilFollowups.push({
                tamil: 'அக்காலத்தைய பழக்கவழக்கங்களில் இன்றும் உங்களை நெகிழ வைக்கும் விஷயம் எது?',
                english: 'Which of those timeless habits still touches your heart today?',
                theme: 'Timeless Values'
            });
        }

        return res.status(200).json({
            success: true,
            promptContext: {
                question,
                answer: answer || '',
                narrator: narrator_name || 'Narrator'
            },
            suggestions: tamilFollowups
        });
    } catch (error) {
        console.error('Follow-up generation error:', error);
        return res.status(500).json({ success: false, message: 'Unable to generate follow-up questions.' });
    }
}

// Extract life events from narrator's transcripts
async function extractMemories(req, res) {
    try {
        const { narratorId } = req.params;

        const narratorRes = await pool.query('SELECT * FROM narrators WHERE id = $1', [narratorId]);
        if (narratorRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Narrator not found.' });
        }
        const narrator = narratorRes.rows[0];

        // Fetch answered questions and transcripts
        const recordingsRes = await pool.query(`
            SELECT 
                r.id AS recording_id, 
                sq.question_tamil,
                sq.question_english,
                t.id AS transcript_id,
                t.transcript_text
            FROM recordings r
            JOIN session_questions sq ON sq.id = r.session_question_id
            JOIN interview_sessions s ON s.id = sq.session_id
            JOIN transcripts t ON t.recording_id = r.id AND t.is_active_check
            WHERE s.narrator_id = $1
        `.replace('t.is_active_check', 't.version_number = (SELECT MAX(version_number) FROM transcripts WHERE recording_id = r.id)'), [narratorId]);

        let candidateMemories = [];
        const narratorName = narrator.full_name_tamil || narrator.preferred_name || 'நினைவாளர்';

        // Extract from each recorded question's answer individually for maximum context and precision
        for (const row of recordingsRes.rows) {
            const transcript = row.transcript_text;
            if (!transcript || transcript.includes('No speech detected') || transcript.trim().length < 15) {
                continue;
            }

            // Skip if this recording has already had life memories extracted
            const alreadyExtracted = await pool.query(`
                SELECT 1 FROM event_sources es
                JOIN life_events le ON le.id = es.event_id
                WHERE es.recording_id = $1 AND le.narrator_id = $2
            `, [row.recording_id, narratorId]);

            if (alreadyExtracted.rows.length > 0) {
                continue;
            }

            const promptText = `கேள்வி: ${row.question_tamil || ''}\nபதில்: ${transcript}`;
            try {
                const aiMemories = await geminiService.extractMemories(promptText, narratorName);
                    for (const m of aiMemories) {
                        // Strict year verification: NEVER add a year unless explicitly mentioned by the speaker in the transcript
                        let verifiedYear = null;
                        if (m.approximate_year && typeof m.approximate_year === 'number') {
                            const yearNum = Math.floor(m.approximate_year);
                            // Verify that this 4-digit year was explicitly spoken in the transcript
                            if (yearNum >= 1900 && yearNum <= 2030 && new RegExp(`\\b${yearNum}\\b`).test(transcript)) {
                                verifiedYear = yearNum;
                            }
                        }
                        if (!verifiedYear) {
                            // Check if the transcript contains an explicit 4-digit year (19xx or 20xx)
                            const match = transcript.match(/\b(19\d{2}|20\d{2})\b/);
                            if (match) {
                                verifiedYear = parseInt(match[1], 10);
                            }
                        }

                        const taTitle = m.title_tamil || m.title_english || 'நினைவு';
                        const enTitle = m.title_english || null;
                        const taDesc = m.description_tamil || m.description_english || transcript;
                        const enDesc = m.description_english || null;

                        candidateMemories.push({
                            title: `${taTitle}${enTitle ? ` (${enTitle})` : ''}`,
                            title_tamil: taTitle,
                            title_english: enTitle,
                            description: taDesc,
                            description_english: enDesc,
                            approximate_year: verifiedYear, // NULL unless explicitly spoken in the transcript
                            date_precision: verifiedYear ? 'year' : 'unknown',
                            event_type: m.event_type || 'Milestone',
                            place_name: narrator.place_of_birth || null,
                            extraction_status: 'confirmed',
                            recording_id: row.recording_id,
                            transcript_id: row.transcript_id,
                            source_excerpt: transcript.substring(0, 200)
                        });
                    }
            } catch (geminiErr) {
                console.warn('Gemini memory extraction notice for recording:', geminiErr.message);
            }
        }

        let createdEvents = [];
        for (const item of candidateMemories) {
            // Check if similar memory already exists by matching full title, Tamil title, English title, or source excerpt
            const existing = await pool.query(`
                SELECT id FROM life_events 
                WHERE narrator_id = $1 
                  AND (
                    title = $2 
                    OR (title_tamil IS NOT NULL AND $3 IS NOT NULL AND title_tamil = $3)
                    OR (title_english IS NOT NULL AND $4 IS NOT NULL AND LOWER(title_english) = LOWER($4))
                    OR description = $5
                  )
            `, [narratorId, item.title, item.title_tamil, item.title_english, item.description]);

            if (existing.rows.length === 0) {
                const insertRes = await pool.query(`
                    INSERT INTO life_events (
                        narrator_id, title, title_tamil, title_english, description, description_english, approximate_year, date_precision, event_type, place_name, extraction_status
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING *;
                `, [
                    narratorId,
                    item.title,
                    item.title_tamil,
                    item.title_english,
                    item.description,
                    item.description_english,
                    item.approximate_year,
                    item.date_precision,
                    item.event_type,
                    item.place_name,
                    item.extraction_status
                ]);
                const newEvent = insertRes.rows[0];
                createdEvents.push(newEvent);

                if (item.recording_id) {
                    try {
                        await pool.query(`
                            INSERT INTO event_sources (event_id, recording_id, transcript_id, source_excerpt)
                            VALUES ($1, $2, $3, $4)
                            ON CONFLICT DO NOTHING;
                        `, [newEvent.id, item.recording_id, item.transcript_id, item.source_excerpt]);
                    } catch (esErr) {
                        console.warn('Event source insert notice:', esErr.message);
                    }
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: `Extracted ${createdEvents.length} new life memories from recordings.`,
            data: createdEvents
        });
    } catch (error) {
        console.error('Extract memories error:', error);
        return res.status(500).json({ success: false, message: 'Unable to extract memories.' });
    }
}

// Generate biography draft for Life Story Builder
async function generateStoryDraft(req, res) {
    try {
        const { narratorId } = req.params;
        const { language_code = 'ta' } = req.body;
        const isEnglish = language_code === 'en';

        const narratorRes = await pool.query('SELECT * FROM narrators WHERE id = $1', [narratorId]);
        if (narratorRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Narrator not found.' });
        }
        const narrator = narratorRes.rows[0];

        // Fetch transcripts from actual answered questions (including English translation if available)
        const transcriptsRes = await pool.query(`
            SELECT 
                r.id AS recording_id, 
                sq.question_tamil,
                sq.question_english,
                t.transcript_text,
                t.transcript_text_english
            FROM recordings r
            JOIN session_questions sq ON sq.id = r.session_question_id
            JOIN interview_sessions s ON s.id = sq.session_id
            JOIN transcripts t ON t.recording_id = r.id
            WHERE s.narrator_id = $1 AND t.version_number = (
                SELECT MAX(version_number) FROM transcripts WHERE recording_id = r.id
            )
            ORDER BY sq.display_order ASC, r.created_at ASC;
        `, [narratorId]);

        // Fetch confirmed timeline events
        const eventsRes = await pool.query(`
            SELECT * FROM life_events 
            WHERE narrator_id = $1 AND extraction_status IN ('confirmed', 'corrected')
            ORDER BY COALESCE(approximate_year, 1900) ASC;
        `, [narratorId]);

        if (transcriptsRes.rows.length === 0 && eventsRes.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: isEnglish
                    ? 'No recordings or verified memories found. Please record interview answers first to build a biography.'
                    : 'ஒலிப்பதிவுகள் அல்லது உறுதிசெய்யப்பட்ட நினைவுகள் எதுவும் இல்லை. வாழ்க்கை வரலாறு உருவாக்க முதலில் நேர்காணல் பதில்களைப் பதிவு செய்யவும்.'
            });
        }

        const name = narrator.full_name_tamil || narrator.full_name_english || 'நினைவாளர்';
        const englishName = narrator.full_name_english || narrator.full_name_tamil || 'Narrator';

        let selectedChapters = [];

        // Prepare combined transcripts for the LLM
        const combinedTranscripts = isEnglish
            ? transcriptsRes.rows
                .filter(r => (r.transcript_text_english && r.transcript_text_english.trim()) || (r.transcript_text && r.transcript_text.trim()))
                .map((r, i) => `Question ${i + 1}: ${r.question_english || r.question_tamil}\nAnswer: ${r.transcript_text_english || r.transcript_text}`)
                .join('\n\n')
            : transcriptsRes.rows
                .filter(r => r.transcript_text && r.transcript_text.trim())
                .map((r, i) => `கேள்வி ${i + 1}: ${r.question_tamil}\nபதில்: ${r.transcript_text}`)
                .join('\n\n');

        if (combinedTranscripts.length > 20) {
            try {
                let systemPrompt = '';
                if (isEnglish) {
                    systemPrompt = `You are an acclaimed English family biographer writing a prestigious printed biography book for "Ninaivu Kalanjiyam" (Family Heritage Archive).
Synthesize the elder "${englishName}"'s recorded interview memories into cohesive, beautifully written English biographical chapters.
STRICT LANGUAGE & STYLE RULES:
1. PURE ENGLISH PROSE:
   - Everything (chapter titles and chapter content) MUST BE WRITTEN 100% IN NATURAL, ELEGANT ENGLISH PROSE.
   - Do NOT include any Tamil script, Tamil words, or Tamil characters anywhere in the title or content.
   - Translate all Tamil cultural terms and relationships respectfully into natural English (e.g. "Joyful Childhood in the Village", "Family Traditions and Ancestral Roots").
   - Write in a warm, dignified, and literary biographical voice suitable for a published English family history book.
2. STRICT FACTUAL FIDELITY:
   - Only include facts, places, memories, family names, and milestones that the elder ACTUALLY mentioned in their answers. Do NOT invent outside people or events.
Return ONLY a valid JSON array:
[
  {
    "id": "c1",
    "title": "Chapter Title in English (e.g. 1. Joyful Childhood and Formative Years)",
    "content": "Full narrative story written in fluent, literary English prose...",
    "status": "confirmed"
  }
]`;
                } else {
                    systemPrompt = `You are an acclaimed Tamil family biographer and literary author for "Ninaivu Kalanjiyam".
Synthesize the elder "${name}"'s recorded interview answers into cohesive, beautifully structured biographical chapters in literary Tamil.
CRITICAL GRAMMAR AND STYLE RULES:
1. STRICTLY NO SPEECH VERSE OR COLLOQUIAL SPOKEN TAMIL (பேச்சு வழக்கு முற்றிலும் கூடாது).
   - The writing must be in grammatically correct, refined written Tamil prose (இலக்கண ரீதியாகச் சரியான நயமான எழுத்துத் தமிழ் உரைநடை).
   - Convert all spoken endings, colloquial dialect, and oral idioms into standard written literary Tamil (e.g., படிச்சோம் -> படித்தோம், ஸ்கூல்ல -> பள்ளியில், ஆத்துக்குப் போயி -> ஆற்றுக்குச் சென்று, பண்ணுவோம் -> செய்வோம், ரெண்டு -> இரண்டு, வச்சிருப்பாங்க -> வைத்திருப்பார்கள், போயிருவோம் -> சென்றுவிடுவோம்).
   - Ensure the prose is elegant, respectful, and dignified to read in a printed family history book.
2. STRICT FACTUAL FIDELITY:
   - Only include facts, places, memories, family names, and life milestones that the elder ACTUALLY mentioned in their answers. Do NOT invent outside places or people.
Return ONLY a valid JSON array in pure literary Tamil:
[
  {
    "id": "c1",
    "title": "அத்தியாயத் தலைப்பு (Chapter Title in Tamil)",
    "content": "இலக்கண ரீதியாகச் சரியான நயமான தமிழ் உரைநடை பத்தி...",
    "status": "confirmed"
  }
]`;
                }

                const aiResp = await geminiService.chatCompletion([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: combinedTranscripts }
                ], 1600);

                const jsonMatch = aiResp.match(/\[\s*\{[\s\S]*\}\s*\]/);
                if (jsonMatch) {
                    selectedChapters = JSON.parse(jsonMatch[0]);
                }
            } catch (geminiErr) {
                console.warn('Gemini story synthesis notice:', geminiErr.message);
            }
        }

        // Post-processing safeguard for English edition: ensure no Tamil text slipped into English edition
        if (isEnglish && selectedChapters && selectedChapters.length > 0) {
            for (const ch of selectedChapters) {
                if (ch.title && /[\u0B80-\u0BFF]/.test(ch.title)) {
                    try {
                        ch.title = await geminiService.translateText(ch.title, 'ta-IN', 'en-IN');
                    } catch (_) {}
                }
                if (ch.content && /[\u0B80-\u0BFF]/.test(ch.content)) {
                    try {
                        ch.content = await geminiService.translateText(ch.content, 'ta-IN', 'en-IN');
                    } catch (_) {}
                }
            }
        }

        // If AI generation was unavailable, map directly from actual recordings and questions
        if (!selectedChapters || selectedChapters.length === 0) {
            selectedChapters = await Promise.all(transcriptsRes.rows.map(async (row, idx) => {
                let contentText = isEnglish ? (row.transcript_text_english || row.transcript_text) : row.transcript_text;
                if (isEnglish) {
                    if (contentText && /[\u0B80-\u0BFF]/.test(contentText)) {
                        try {
                            contentText = await geminiService.translateText(contentText, 'ta-IN', 'en-IN');
                        } catch (_) {}
                    }
                } else if (contentText) {
                    try {
                        contentText = await geminiService.refineTamilTranscriptToGrammaticalProse(contentText);
                    } catch (_) {}
                }

                const titleText = isEnglish
                    ? `${idx + 1}. ${row.question_english || 'Chapter ' + (idx + 1)}`
                    : `${idx + 1}. ${row.question_tamil}`;

                return {
                    id: `c${idx + 1}`,
                    title: titleText,
                    content: contentText || '',
                    status: 'confirmed',
                    recording_ids: [row.recording_id]
                };
            }));

            // Append timeline events if available
            for (let idx = 0; idx < eventsRes.rows.length; idx++) {
                const ev = eventsRes.rows[idx];
                let evTitle = ev.title;
                let evDesc = ev.description || '';
                if (isEnglish) {
                    try {
                        if (evTitle && /[\u0B80-\u0BFF]/.test(evTitle)) {
                            evTitle = await geminiService.translateText(evTitle, 'ta-IN', 'en-IN');
                        }
                        if (evDesc && /[\u0B80-\u0BFF]/.test(evDesc)) {
                            evDesc = await geminiService.translateText(evDesc, 'ta-IN', 'en-IN');
                        }
                    } catch (_) {}
                }
                selectedChapters.push({
                    id: `ev${idx + 1}`,
                    title: `${selectedChapters.length + 1}. ${evTitle} (${ev.approximate_year || ''})`,
                    content: evDesc,
                    status: 'confirmed'
                });
            }
        }

        const draftTitle = isEnglish
            ? `${englishName}'s Life Biography — NinaivuKalanjiyam`
            : `${name} அவர்களின் வாழ்க்கை வரலாறு — நினைவுக் களஞ்சியம்`;

        // Check version number
        const verRes = await pool.query(
            'SELECT COALESCE(MAX(version), 0) + 1 AS next_v FROM story_drafts WHERE narrator_id = $1',
            [narratorId]
        );
        const nextVersion = verRes.rows[0].next_v;

        const insertDraftQuery = `
            INSERT INTO story_drafts (narrator_id, title, language_code, version, chapters, status)
            VALUES ($1, $2, $3, $4, $5, 'draft')
            RETURNING *;
        `;
        const draftRes = await pool.query(insertDraftQuery, [
            narratorId,
            draftTitle,
            language_code,
            nextVersion,
            JSON.stringify(selectedChapters)
        ]);

        return res.status(201).json({
            success: true,
            message: 'Biography draft generated from verified transcripts and timeline events.',
            data: draftRes.rows[0]
        });
    } catch (error) {
        console.error('Generate story draft error:', error);
    }
}

// Text-to-Speech using Free Tamil TTS
async function synthesizeSpeech(req, res) {
    try {
        const { text, speaker = 'kavitha' } = req.body;
        if (!text || text.trim() === '') {
            return res.status(400).json({ success: false, message: 'Text is required for TTS.' });
        }

        const ttsRes = await geminiService.textToSpeech(text, speaker);
        return res.status(200).json({
            success: true,
            audioBase64: ttsRes.audioBase64,
            contentType: ttsRes.contentType
        });
    } catch (error) {
        console.error('Synthesize speech error:', error);
        return res.status(500).json({ success: false, message: 'Unable to synthesize speech.' });
    }
}

module.exports = {
    getFollowUpQuestions,
    extractMemories,
    generateStoryDraft,
    synthesizeSpeech
};
