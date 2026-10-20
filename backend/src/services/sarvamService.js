const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let ffmpegPath;
try {
    ffmpegPath = require('ffmpeg-static');
} catch (e) {
    ffmpegPath = 'ffmpeg';
}

const SARVAM_BASE_URL = 'https://api.sarvam.ai';

function getApiKey() {
    return process.env.SARVAM_API_KEY || '';
}

/**
 * Transcribe single clip (under 30 seconds) via Sarvam Saaras v4
 */
async function transcribeSingleClip(buffer, filename = 'recording.wav', mimeType = 'audio/wav', mode = 'transcribe') {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('SARVAM_API_KEY is not configured in backend/.env');
    }

    const blob = new Blob([buffer], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, filename);
    formData.append('model', 'saaras:v4');
    formData.append('language_code', 'ta-IN');
    formData.append('mode', mode);

    const res = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
        method: 'POST',
        headers: {
            'api-subscription-key': apiKey
        },
        body: formData
    });

    if (!res.ok) {
        const errText = await res.text();
        const err = new Error(`Sarvam STT error (${res.status}): ${errText}`);
        err.status = res.status;
        err.raw = errText;
        throw err;
    }

    const data = await res.json();
    return {
        transcript: data.transcript || '',
        language_code: data.language_code || 'ta-IN',
        request_id: data.request_id || ''
    };
}

/**
 * Segment long audio file into 24-second WAV chunks and transcribe sequentially
 */
async function transcribeLongAudio(filePath, mode = 'transcribe') {
    const tmpDir = path.join(__dirname, '../../uploads/temp_slices_' + Date.now() + '_' + Math.floor(Math.random() * 10000));
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
        const outputPattern = path.join(tmpDir, 'chunk_%03d.wav');
        execSync(`"${ffmpegPath}" -y -i "${filePath}" -f segment -segment_time 24 -ac 1 -ar 16000 "${outputPattern}"`, {
            stdio: 'ignore'
        });

        const chunks = fs.readdirSync(tmpDir)
            .filter(f => f.startsWith('chunk_') && f.endsWith('.wav'))
            .sort();

        if (chunks.length === 0) {
            throw new Error('Audio splitting produced no segments.');
        }

        const transcripts = [];
        for (const chunk of chunks) {
            const chunkPath = path.join(tmpDir, chunk);
            const chunkBuffer = fs.readFileSync(chunkPath);
            try {
                const res = await transcribeSingleClip(chunkBuffer, chunk, 'audio/wav', mode);
                if (res && res.transcript && res.transcript.trim()) {
                    transcripts.push(res.transcript.trim());
                }
            } catch (chunkErr) {
                console.warn(`Error transcribing chunk ${chunk}:`, chunkErr.message);
            }
        }

        return {
            transcript: transcripts.join(' '),
            language_code: 'ta-IN',
            request_id: 'chunked-' + Date.now()
        };
    } finally {
        try {
            const files = fs.readdirSync(tmpDir);
            for (const f of files) {
                try { fs.unlinkSync(path.join(tmpDir, f)); } catch (_) {}
            }
            fs.rmdirSync(tmpDir);
        } catch (_) {}
    }
}

/**
 * Transcribe spoken Tamil audio using Sarvam Saaras v4
 * Automatically handles files longer than 30s by chunking
 * @param {string|Buffer} audioInput - Local file path or Buffer containing audio bytes
 * @param {string} filename - Original filename (e.g. 'recording.webm' or 'sample.wav')
 * @param {string} mimeType - Audio mime type (e.g. 'audio/webm', 'audio/wav', 'audio/mp3')
 * @param {string} mode - 'transcribe' or 'verbatim'
 * @returns {Promise<{ transcript: string, language_code: string, request_id: string }>}
 */
async function transcribeAudio(audioInput, filename = 'recording.webm', mimeType = 'audio/webm', mode = 'transcribe') {
    let filePath = null;
    let tempFileCreated = false;
    let buffer = null;

    if (typeof audioInput === 'string') {
        if (!fs.existsSync(audioInput)) {
            throw new Error(`Audio file not found at path: ${audioInput}`);
        }
        filePath = audioInput;
        buffer = fs.readFileSync(audioInput);
    } else if (Buffer.isBuffer(audioInput)) {
        buffer = audioInput;
    } else {
        throw new Error('Invalid audioInput: expected a file path string or Buffer.');
    }

    try {
        // First try single-clip transcription
        return await transcribeSingleClip(buffer, filename, mimeType, mode);
    } catch (err) {
        const isDurationExceeded = err.raw && (
            err.raw.includes('30 seconds') || 
            err.raw.includes('Audio duration exceeds') ||
            err.raw.includes('maximum limit')
        );

        if (isDurationExceeded) {
            console.log(`Audio exceeds 30s limit (${filename}). Slicing into chunks via ffmpeg...`);
            if (!filePath) {
                filePath = path.join(__dirname, '../../uploads/temp_' + Date.now() + '_' + filename);
                fs.writeFileSync(filePath, buffer);
                tempFileCreated = true;
            }
            try {
                return await transcribeLongAudio(filePath, mode);
            } finally {
                if (tempFileCreated && fs.existsSync(filePath)) {
                    try { fs.unlinkSync(filePath); } catch (_) {}
                }
            }
        }

        throw err;
    }
}

/**
 * Translate Tamil text to English (or vice versa) using Sarvam Mayura v1
 * @param {string} text - Input text
 * @param {string} sourceLang - 'ta-IN' or 'en-IN'
 * @param {string} targetLang - 'en-IN' or 'ta-IN'
 * @returns {Promise<string>}
 */
async function translateText(text, sourceLang = 'ta-IN', targetLang = 'en-IN') {
    const apiKey = getApiKey();
    if (!apiKey || !text || text.trim() === '') {
        return text || '';
    }

    const res = await fetch(`${SARVAM_BASE_URL}/translate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-subscription-key': apiKey
        },
        body: JSON.stringify({
            input: text,
            source_language_code: sourceLang,
            target_language_code: targetLang,
            mode: 'formal',
            model: 'mayura:v1'
        })
    });

    if (!res.ok) {
        const err = await res.text();
        console.warn(`Sarvam Translate API warning (${res.status}): ${err}`);
        return text;
    }

    const data = await res.json();
    return data.translated_text || text;
}

/**
 * Chat completion using Sarvam-105b Indic LLM (defaults to fast, direct sarvam-105b-conversations)
 * @param {Array<{ role: string, content: string }>} messages
 * @param {number} maxTokens
 * @param {string} model
 * @returns {Promise<string>}
 */
async function chatCompletion(messages, maxTokens = 1200, model = 'sarvam-105b-conversations') {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('SARVAM_API_KEY is not configured in backend/.env');
    }

    const res = await fetch(`${SARVAM_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-subscription-key': apiKey
        },
        body: JSON.stringify({
            model: model,
            messages,
            max_tokens: maxTokens
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Sarvam LLM error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
}

/**
 * Convert Tamil text to speech using Sarvam Bulbul v3
 * @param {string} text - Spoken Tamil text
 * @param {string} speaker - 'kavitha', 'vijay', 'gokul', 'mani'
 * @returns {Promise<{ audioBase64: string, contentType: string }>}
 */
async function textToSpeech(text, speaker = 'kavitha') {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('SARVAM_API_KEY is not configured in backend/.env');
    }
    if (!text || text.trim() === '') {
        throw new Error('Text is required for text-to-speech.');
    }

    const res = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-subscription-key': apiKey
        },
        body: JSON.stringify({
            inputs: [text.trim().substring(0, 500)],
            target_language_code: 'ta-IN',
            speaker: speaker,
            model: 'bulbul:v3'
        })
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Sarvam TTS error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const audioBase64 = data.audios?.[0] || '';
    return {
        audioBase64,
        contentType: 'audio/wav'
    };
}

/**
 * Extract life memories, traditions, milestones, and emotions from Tamil interview transcript
 * @param {string} transcriptText - Raw spoken Tamil text
 * @param {string} narratorName - Name of the elder
 * @returns {Promise<Array<object>>}
 */
async function extractMemories(transcriptText, narratorName = 'குடும்பப் பெரியவர்') {
    if (!transcriptText || transcriptText.trim().length < 15) {
        return [];
    }

    const systemPrompt = `You are an AI family historian and oral archivist for "Ninaivu Kalanjiyam" (நினைவு களஞ்சியம்).
Analyze the spoken Tamil memories of elder "${narratorName}".
Extract distinct life events, childhood memories, family traditions, and milestones into a JSON array.
STRICT RULES:
1. Only extract events directly mentioned in the transcript.
2. CRITICAL YEAR RULE: Do NOT add, guess, or extrapolate any year unless the narrator explicitly mentions a specific year (e.g. 1972, 1968) in the spoken text! If no specific year is explicitly spoken in the transcript, "approximate_year" MUST be null.
Return ONLY a valid JSON array of objects with this schema:
[
  {
    "title_tamil": "நினைவின் தலைப்பு",
    "title_english": "Title in English",
    "description_tamil": "சுருக்கமான விளக்கம்",
    "description_english": "English description",
    "event_type": "Childhood | Tradition | Career | Marriage | Family | Wisdom",
    "approximate_year": null
  }
]`;

    try {
        const responseText = await chatCompletion([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: transcriptText }
        ], 1000, 'sarvam-105b-conversations');

        const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (err) {
        console.warn('Sarvam memory extraction notice:', err.message);
    }

    return [];
}

/**
 * Generate a rich, illustrated biography chapter draft from interview transcripts
 * @param {object} params
 * @param {string} params.narratorName
 * @param {string} params.chapterTitle
 * @param {string} params.transcripts
 * @returns {Promise<{ chapterTamil: string, chapterEnglish: string }>}
 */
async function generateChapterDraft({ narratorName = 'பெரியவர்', chapterTitle = 'பால்ய நினைவுகள்', transcripts = '' }) {
    const systemPrompt = `You are an acclaimed Tamil biographer for "Ninaivu Kalanjiyam".
Write an evocative, respectful, beautifully styled chapter in literary yet warm Tamil for ${narratorName}'s biography book based on their oral transcripts.
Title of Chapter: ${chapterTitle}
Keep the elder's authentic tone, emotional warmth, and native expressions intact.`;

    try {
        const chapterTamil = await chatCompletion([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Here are the elder's spoken memories:\n\n${transcripts}` }
        ], 1600, 'sarvam-105b-conversations');

        // Translate summary to English
        const chapterEnglish = await translateText(
            chapterTamil.substring(0, 1500),
            'ta-IN',
            'en-IN'
        );

        return {
            chapterTamil,
            chapterEnglish
        };
    } catch (err) {
        console.error('Sarvam chapter generation error:', err);
        throw err;
    }
}

/**
 * Generate intelligent, respectful follow-up questions in Tamil using Sarvam-105b-conversations
 * @param {string} question - Question asked
 * @param {string} answer - Spoken answer given
 * @param {string} narratorName - Name of elder
 * @returns {Promise<Array<{ tamil: string, english: string, theme: string }>>}
 */
async function generateFollowUpQuestions({ question, answer, narratorName = 'பெரியவர்' }) {
    const systemPrompt = `You are an expert oral history interviewer in Tamil.
The elder "${narratorName}" just answered an interview question.
Suggest 3 empathetic, culturally grounded follow-up questions in Tamil (with English translations) to help them share deeper personal stories and ancestral wisdom.
Return ONLY a valid JSON array:
[
  {
    "tamil": "கேள்வி தமிழில்",
    "english": "Question in English",
    "theme": "Theme"
  }
]`;

    try {
        const responseText = await chatCompletion([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Question asked: ${question}\nElder's answer: ${answer || '...'}` }
        ], 800, 'sarvam-105b-conversations');

        const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (err) {
        console.warn('Sarvam follow-up generation notice:', err.message);
    }

    return [];
}

/**
 * Rule-based fallback converter for common colloquial Tamil speech patterns
 * @param {string} text
 * @returns {string}
 */
function ruleBasedTamilNormalizer(text) {
    if (!text) return '';
    let result = text
        .replace(/^(சொல்லு[\.\s,]*)+/gi, '')
        .replace(/^(பேசுங்க[\.\s,]*)+/gi, '')
        .replace(/^(சொல்லுங்க[\.\s,]*)+/gi, '')
        .replace(/\bரெண்டு\b/g, 'இரண்டு')
        .replace(/\bமூணு\b/g, 'மூன்று')
        .replace(/\bநாலு\b/g, 'நான்கு')
        .replace(/\bஅஞ்சு\b/g, 'ஐந்து')
        .replace(/\bபதினொன்னு\b/g, 'பதினொன்று')
        .replace(/\bபடிச்சோம்\b/g, 'படித்தோம்')
        .replace(/\bபடிச்சேன்\b/g, 'படித்தேன்')
        .replace(/\bபடிச்சாங்க\b/g, 'படித்தார்கள்')
        .replace(/\bசெஞ்சோம்\b/g, 'செய்தோம்')
        .replace(/\bசெஞ்சேன்\b/g, 'செய்தேன்')
        .replace(/\bசெஞ்சாங்க\b/g, 'செய்தார்கள்')
        .replace(/\bபண்ணுவோம்\b/g, 'செய்வோம்')
        .replace(/\bபண்ணினோம்\b/g, 'செய்தோம்')
        .replace(/\bபோயிருவோம்\b/g, 'சென்றுவிடுவோம்')
        .replace(/\bபோவோம்\b/g, 'செல்வோம்')
        .replace(/\bபோயிட்டு\b/g, 'சென்றுவிட்டு')
        .replace(/\bவச்சிருப்பாங்க\b/g, 'வைத்திருப்பார்கள்')
        .replace(/\bஇருக்காப்ல\b/g, 'இருக்கிறார்')
        .replace(/\bஇல்ல\b/g, 'இல்லை')
        .replace(/\bகாலமாயிட்டாங்க\b/g, 'காலமாகிவிட்டார்கள்')
        .replace(/\bதெருவுல\b/g, 'தெருவில்')
        .replace(/\bவீதியில\b/g, 'வீதியில்')
        .replace(/\bபள்ளிக்கூடத்துல\b/g, 'பள்ளிக்கூடத்தில்')
        .replace(/\bஸ்கூல்ல\b/g, 'பள்ளியில்')
        .replace(/\bஸ்கூலுக்கு\b/g, 'பள்ளிக்கு')
        .replace(/\bஸ்கூல்\b/g, 'பள்ளி')
        .replace(/\bவீட்ல\b/g, 'வீட்டில்')
        .replace(/\bஊர்ல\b/g, 'ஊரில்')
        .replace(/\bகிணத்துல\b/g, 'கிணற்றில்')
        .replace(/\bஆத்துக்குப்\b/g, 'ஆற்றுக்குச்')
        .replace(/\bஆத்துக்கு\b/g, 'ஆற்றுக்கு')
        .replace(/\bஓடுச்சு\b/g, 'ஓடியது')
        .replace(/\bஅடிச்சாரு\b/g, 'அடித்தார்')
        .replace(/\bகேட்டதுக்கு\b/g, 'கேட்டதற்கு')
        .replace(/\bசொன்னாங்க\b/g, 'கூறினார்கள்')
        .replace(/\bவாத்தியார்\b/g, 'ஆசிரியர்')
        .replace(/\bமுழி மேலேயே\b/g, 'கண்களின் அருகே');
    return result.trim();
}

/**
 * Refine spoken / colloquial Tamil interview transcript into grammatically correct written Tamil prose (எழுத்துத் தமிழ் உரைநடை)
 * Ensures transcript is not in "speech verse" (பேச்சு வழக்கு) and is pleasant and dignified to read.
 * @param {string} rawSpokenText - Raw speech-to-text transcript
 * @returns {Promise<string>} - Polished, grammatically correct written Tamil text
 */
async function refineTamilTranscriptToGrammaticalProse(rawSpokenText) {
    if (!rawSpokenText || typeof rawSpokenText !== 'string' || rawSpokenText.trim().length < 5) {
        return rawSpokenText || '';
    }

    let cleaned = rawSpokenText
        .replace(/^(சொல்லு[\.\s,]*)+/gi, '')
        .replace(/^(பேசுங்க[\.\s,]*)+/gi, '')
        .replace(/^(சொல்லுங்க[\.\s,]*)+/gi, '')
        .trim();

    if (!cleaned) return rawSpokenText;

    try {
        const systemPrompt = `You are an acclaimed Tamil scholar and biographer for a family heritage archive.
Transform the provided raw spoken/colloquial Tamil interview transcript into grammatically correct, refined written Tamil prose (இலக்கண ரீதியான தூய எழுத்துத் தமிழ் உரைநடை).
MANDATORY RULES:
1. STRICTLY NO SPEECH VERSE OR COLLOQUIAL SPOKEN TAMIL (பேச்சு வழக்கு முற்றிலும் கூடாது).
   - Convert spoken endings and colloquial forms into standard written literary Tamil.
     Examples:
     * "படிச்சோம்" -> "படித்தோம்", "படிச்சேன்" -> "படித்தேன்", "படிச்சாங்க" -> "படித்தார்கள்"
     * "செஞ்சோம்" -> "செய்தோம்", "செஞ்சேன்" -> "செய்தேன்", "பண்ணுவோம்" -> "செய்வோம்", "பண்ணினோம்" -> "செய்தோம்"
     * "போயிருவோம்" -> "சென்றுவிடுவோம்", "போவோம்" -> "செல்வோம்", "போயிட்டு" -> "சென்றுவிட்டு"
     * "வச்சிருப்பாங்க" -> "வைத்திருப்பார்கள்", "இருக்காப்ல" -> "இருக்கிறார்"
     * "தெருவுல" -> "தெருவில்", "வீதியில" -> "வீதியில்", "ஸ்கூல்ல" / "பள்ளிக்கூடத்துல" -> "பள்ளிக்கூடத்தில்"
     * "ரெண்டு" -> "இரண்டு", "மூணு" -> "மூன்று", "அஞ்சு" -> "ஐந்து", "பதினொன்னு" -> "பதினொன்று"
     * "இல்ல" -> "இல்லை", "காலமாயிட்டாங்க" -> "காலமாகிவிட்டார்கள்"
     * "அடிச்சாரு" -> "அடித்தார்", "கேட்டதுக்கு" -> "கேட்டதற்கு"
2. Fix conversational hesitation, repetitive fillers ("வந்து", "அப்படிதான்", "கண்ணு"), and obvious speech-to-text misrecognitions so sentences flow logically and read gracefully like a printed biography.
3. PRESERVE 100% FACTUAL ACCURACY:
   - Do NOT delete, change, or fabricate any names, people, schools, places, dates, years, or events mentioned by the speaker.
4. Output formatting:
   - Return ONLY the clean, polished Tamil prose.
   - Do NOT add quotes, markdown formatting, explanations, or introductory text.`;

        const responseText = await chatCompletion([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: cleaned }
        ], 1200, 'sarvam-105b-conversations');

        const refined = responseText ? responseText.trim().replace(/^["']|["']$/g, '') : '';
        if (refined && refined.length > 5) {
            return refined;
        }
    } catch (err) {
        console.warn('Sarvam Tamil grammar refinement notice:', err.message);
    }

    return ruleBasedTamilNormalizer(cleaned);
}

module.exports = {
    transcribeAudio,
    translateText,
    chatCompletion,
    textToSpeech,
    extractMemories,
    generateChapterDraft,
    generateFollowUpQuestions,
    refineTamilTranscriptToGrammaticalProse,
    ruleBasedTamilNormalizer
};

