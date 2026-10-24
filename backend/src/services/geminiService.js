const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const fs = require('fs');
const { execSync } = require('child_process');

let ffmpegPath;
try {
    ffmpegPath = require('ffmpeg-static');
} catch (e) {
    ffmpegPath = 'ffmpeg';
}

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

function getApiKey() {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

function getGeminiModel() {
    return process.env.GEMINI_MODEL || 'gemini-3.5-flash';
}

/**
 * Dictionary of colloquial Tamil patterns mapped to refined written literary Tamil
 */
const TAMIL_NORMALIZATION_MAP = [
    // Numbers
    ['ஒன்னு', 'ஒன்று'],
    ['ரெண்டு', 'இரண்டு'],
    ['மூணு', 'மூன்று'],
    ['நாலு', 'நான்கு'],
    ['அஞ்சு', 'ஐந்து'],
    ['ஆறு', 'ஆறு'],
    ['ஏழு', 'ஏழு'],
    ['எட்டு', 'எட்டு'],
    ['ஒம்போது', 'ஒன்பது'],
    ['பத்து', 'பத்து'],
    ['பதினொன்னு', 'பதினொன்று'],

    // Verbs - Study / Learn
    ['படிச்சோம்', 'படித்தோம்'],
    ['படிச்சேன்', 'படித்தேன்'],
    ['படிச்சாங்க', 'படித்தார்கள்'],
    ['படிச்சாரு', 'படித்தார்'],
    ['படிச்சது', 'படித்தது'],
    ['படிச்சிட்டு', 'படித்துவிட்டு'],
    ['படிச்சுட்டு', 'படித்துவிட்டு'],

    // Verbs - Do / Work
    ['செஞ்சோம்', 'செய்தோம்'],
    ['செஞ்சேன்', 'செய்தேன்'],
    ['செஞ்சாங்க', 'செய்தார்கள்'],
    ['செஞ்சாரு', 'செய்தார்'],
    ['செஞ்சது', 'செய்தது'],
    ['செஞ்சி', 'செய்து'],
    ['செஞ்சு', 'செய்து'],
    ['பண்ணுவோம்', 'செய்வோம்'],
    ['பண்ணினோம்', 'செய்தோம்'],
    ['பண்ணினேன்', 'செய்தேன்'],
    ['பண்ணினாங்க', 'செய்தார்கள்'],
    ['பண்ணினாரு', 'செய்தார்'],
    ['பண்ணிட்டோம்', 'செய்துவிட்டோம்'],
    ['பண்ணிட்டாங்க', 'செய்துவிட்டார்கள்'],
    ['பண்ணி', 'செய்து'],

    // Verbs - Go / Travel
    ['போயிருவோம்', 'சென்றுவிடுவோம்'],
    ['போவோம்', 'செல்வோம்'],
    ['போயிட்டு', 'சென்றுவிட்டு'],
    ['போய்ட்டு', 'சென்றுவிட்டு'],
    ['போயிட்டாங்க', 'சென்றுவிட்டார்கள்'],
    ['போய்ட்டாங்க', 'சென்றுவிட்டார்கள்'],
    ['போனாங்க', 'சென்றார்கள்'],
    ['போனாரு', 'சென்றார்'],
    ['போனேன்', 'சென்றேன்'],
    ['போனோம்', 'சென்றோம்'],
    ['போச்சு', 'சென்றது'],

    // Verbs - Come
    ['வந்திருப்பாங்க', 'வந்திருப்பார்கள்'],
    ['வந்தாங்க', 'வந்தார்கள்'],
    ['வந்தாரு', 'வந்தார்'],
    ['வந்துச்சு', 'வந்தது'],
    ['வந்துச்சி', 'வந்தது'],

    // Verbs - Keep / Have
    ['வச்சிருப்பாங்க', 'வைத்திருப்பார்கள்'],
    ['வச்சிருந்தாங்க', 'வைத்திருந்தார்கள்'],
    ['வச்சிருந்தோம்', 'வைத்திருந்தோம்'],
    ['வச்சிருக்காங்க', 'வைத்திருக்கிறார்கள்'],
    ['வெச்சிருக்கோம்', 'வைத்திருக்கிறோம்'],
    ['வெச்சோம்', 'வைத்தோம்'],
    ['வச்சி', 'வைத்து'],
    ['வெச்சு', 'வைத்து'],

    // Verbs - Be / Exist
    ['இருக்காப்ல', 'இருக்கிறார்'],
    ['இருக்காங்க', 'இருக்கிறார்கள்'],
    ['இருந்தாங்க', 'இருந்தார்கள்'],
    ['இருந்தோமுங்க', 'இருந்தோம்'],
    ['இருந்திச்சு', 'இருந்தது'],
    ['இருந்துச்சு', 'இருந்தது'],
    ['இல்ல', 'இல்லை'],

    // Verbs - Speak / Tell / Ask
    ['சொன்னாங்க', 'கூறினார்கள்'],
    ['சொன்னாரு', 'கூறினார்'],
    ['சொல்லிட்டாங்க', 'கூறிவிட்டார்கள்'],
    ['சொல்லுச்சு', 'கூறியது'],
    ['கேட்டாங்க', 'கேட்டார்கள்'],
    ['கேட்டாரு', 'கேட்டார்'],
    ['கேட்டதுக்கு', 'கேட்டதற்கு'],

    // Verbs - See
    ['பாத்தாங்க', 'பார்த்தார்கள்'],
    ['பாத்தோமுங்க', 'பார்த்தோம்'],
    ['பாத்தோம்', 'பார்த்தோம்'],
    ['பாத்தேன்', 'பார்த்தேன்'],
    ['பாத்தாரு', 'பார்த்தார்'],

    // Verbs - Eat / Play
    ['சாப்ட்டோம்', 'சாப்பிட்டோம்'],
    ['சாப்பிட்டாங்க', 'சாப்பிட்டார்கள்'],
    ['சாப்டுட்டு', 'சாப்பிட்டுவிட்டு'],
    ['விளையாடுனோம்', 'விளையாடினோம்'],
    ['விளையாடுவாங்க', 'விளையாடுவார்கள்'],

    // Verbs - Know / Understand
    ['தெரிஞ்சுது', 'தெரிந்தது'],
    ['தெரிஞ்சது', 'தெரிந்தது'],
    ['புரிஞ்சுது', 'புரிந்தது'],

    // Adverbs / Expressions
    ['முழுசா', 'முழுமையாக'],
    ['நல்லா', 'நன்றாக'],
    ['ரொம்ப', 'மிகவும்'],
    ['கொஞ்சம்', 'சிறிது'],
    ['காலமாயிட்டாங்க', 'காலமாகிவிட்டார்கள்'],
    ['அடிச்சாரு', 'அடித்தார்'],
    ['முழி மேலேயே', 'கண்களின் அருகே'],

    // Pronouns & Titles
    ['நாங்க', 'நாங்கள்'],
    ['நீங்க', 'நீங்கள்'],
    ['அவங்க', 'அவர்கள்'],
    ['இவங்க', 'இவர்கள்'],
    ['அவுக', 'அவர்கள்'],
    ['இவுக', 'இவர்கள்'],
    ['வாத்தியாரு', 'ஆசிரியர்'],
    ['வாத்தியார்', 'ஆசிரியர்'],
    ['டீச்சரம்மா', 'ஆசிரியை'],

    // Locative / Nouns
    ['தெருவுல', 'தெருவில்'],
    ['வீதியில', 'வீதியில்'],
    ['பள்ளிக்கூடத்துல', 'பள்ளிக்கூடத்தில்'],
    ['ஸ்கூல்ல', 'பள்ளியில்'],
    ['ஸ்கூலுக்கு', 'பள்ளிக்கு'],
    ['ஸ்கூல்', 'பள்ளி'],
    ['வீட்ல', 'வீட்டில்'],
    ['ஊர்ல', 'ஊரில்'],
    ['ரோட்ல', 'சாலையில்'],
    ['கிணத்துல', 'கிணற்றில்'],
    ['ஆத்துக்குப்', 'ஆற்றுக்குச்'],
    ['ஆத்துக்கு', 'ஆற்றுக்கு'],
    ['ஆத்துல', 'ஆற்றில்'],
    ['காலேஜ்ல', 'கல்லூரியில்'],
    ['காலேஜுக்கு', 'கல்லூரிக்கு'],
    ['காலேஜ்', 'கல்லூரி']
];

/**
 * Rule-based fallback converter for common colloquial Tamil speech patterns
 * Uses Unicode lookarounds to properly match Tamil script boundaries
 * @param {string} text
 * @returns {string}
 */
function ruleBasedTamilNormalizer(text) {
    if (!text) return '';
    let result = text
        .replace(/^(சொல்லு[\.\s,]*)+/gi, '')
        .replace(/^(பேசுங்க[\.\s,]*)+/gi, '')
        .replace(/^(சொல்லுங்க[\.\s,]*)+/gi, '');

    for (const [colloquial, formal] of TAMIL_NORMALIZATION_MAP) {
        const pattern = new RegExp('(?<![\\u0B80-\\u0BFF])' + colloquial + '(?![\\u0B80-\\u0BFF])', 'gu');
        result = result.replace(pattern, formal);
    }

    return result.trim();
}

/**
 * Chat completion using Google Gemini API (Free tier)
 * @param {Array<{ role: string, content: string }>} messages
 * @param {number} maxTokens
 * @param {string|null} preferredModel
 * @returns {Promise<string>}
 */
async function chatCompletion(messages, maxTokens = 1200, preferredModel = null) {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.warn('GEMINI_API_KEY is not configured in backend/.env');
        return '';
    }

    const modelsToTry = [
        preferredModel || getGeminiModel(),
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.8-flash',
        'gemini-flash-latest'
    ].filter((m, i, arr) => m && arr.indexOf(m) === i);

    let systemInstruction = null;
    const contents = [];

    for (const m of messages) {
        if (m.role === 'system') {
            systemInstruction = {
                parts: [{ text: m.content }]
            };
        } else {
            const role = m.role === 'assistant' ? 'model' : 'user';
            contents.push({
                role: role,
                parts: [{ text: m.content }]
            });
        }
    }

    if (contents.length === 0 && systemInstruction) {
        contents.push({
            role: 'user',
            parts: [{ text: systemInstruction.parts[0].text }]
        });
        systemInstruction = null;
    }

    let lastError = null;

    for (const model of modelsToTry) {
        try {
            const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;
            const payload = {
                contents,
                generationConfig: {
                    maxOutputTokens: maxTokens,
                    temperature: 0.3
                }
            };

            if (systemInstruction) {
                payload.systemInstruction = systemInstruction;
            }

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errText = await res.text();
                // If model not found (404), high demand (503), or rate limited (429), try next model in list
                if ((res.status === 404 || res.status === 503 || res.status === 429) && modelsToTry.indexOf(model) < modelsToTry.length - 1) {
                    console.warn(`Gemini model ${model} returned ${res.status}. Trying fallback model...`);
                    continue;
                }
                throw new Error(`Gemini API error (${res.status}): ${errText}`);
            }

            const data = await res.json();
            const textParts = data.candidates?.[0]?.content?.parts || [];
            return textParts.map(p => p.text).join('') || '';
        } catch (err) {
            lastError = err;
            if (modelsToTry.indexOf(model) < modelsToTry.length - 1) {
                continue;
            }
        }
    }

    throw lastError || new Error('Failed to generate response from Gemini API.');
}

/**
 * Transcribe audio using Groq Whisper (Free tier) if GROQ_API_KEY is configured
 */
async function transcribeWithGroqWhisper(buffer, filename = 'recording.webm') {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return null;

    const mime = filename.endsWith('.wav') ? 'audio/wav' : 'audio/webm';
    const blob = new Blob([buffer], { type: mime });
    const formData = new FormData();
    formData.append('file', blob, filename);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'ta');
    formData.append('response_format', 'json');

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${groqKey}`
        },
        body: formData
    });

    if (!res.ok) {
        const errText = await res.text();
        console.warn(`Groq Whisper warning (${res.status}): ${errText}`);
        return null;
    }

    const data = await res.json();
    return {
        transcript: data.text || '',
        language_code: 'ta-IN',
        request_id: 'groq-' + Date.now()
    };
}

/**
 * Transcribe single audio clip directly using Gemini Multimodal Audio (Free)
 */
async function transcribeSingleClipWithGemini(buffer, filename = 'recording.webm', mimeType = 'audio/webm') {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in backend/.env');
    }

    // First check if Groq key is present for Whisper transcription
    if (process.env.GROQ_API_KEY) {
        try {
            const groqRes = await transcribeWithGroqWhisper(buffer, filename);
            if (groqRes && groqRes.transcript) {
                return groqRes;
            }
        } catch (groqErr) {
            console.warn('Groq Whisper fallback to Gemini:', groqErr.message);
        }
    }

    // Normalize audio mime type for Gemini
    let normalizedMime = mimeType || 'audio/webm';
    if (filename.endsWith('.wav')) normalizedMime = 'audio/wav';
    else if (filename.endsWith('.mp3')) normalizedMime = 'audio/mp3';
    else if (filename.endsWith('.webm')) normalizedMime = 'audio/webm';
    else if (filename.endsWith('.ogg')) normalizedMime = 'audio/ogg';

    const base64Audio = buffer.toString('base64');
    const modelsToTry = [
        getGeminiModel(),
        'gemini-3.5-flash',
        'gemini-3-flash-preview',
        'gemini-3.8-flash',
        'gemini-flash-latest'
    ].filter((m, i, arr) => m && arr.indexOf(m) === i);

    const promptText = `You are a professional Tamil oral archivist and audio transcriber.
Listen to this spoken Tamil audio recording carefully.
Transcribe everything spoken accurately into clear, standard written Tamil script (தூய எழுத்துத் தமிழில்).
MANDATORY RULES:
1. Provide ONLY the transcribed Tamil text.
2. Do not translate to English.
3. Filter out repetitive verbal hesitation stutters or false starts (e.g., 'சொல்லு... சொல்லுங்க...', 'வந்து... வந்து...').
4. Do not add conversational remarks, introductory prefixes, timestamps, or markdown quotes.
5. If the audio is silent or contains only background noise with no speech, return: "ஒலிப்பதிவில் பேச்சு எதுவும் கண்டறியப்படவில்லை (No speech detected in audio)."`;

    let lastError = null;

    for (const model of modelsToTry) {
        try {
            const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;
            const payload = {
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                inlineData: {
                                    mimeType: normalizedMime,
                                    data: base64Audio
                                }
                            },
                            {
                                text: promptText
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 2048
                }
            };

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errText = await res.text();
                if ((res.status === 404 || res.status === 503 || res.status === 429) && modelsToTry.indexOf(model) < modelsToTry.length - 1) {
                    console.warn(`Gemini audio model ${model} returned ${res.status}. Trying fallback model...`);
                    continue;
                }
                throw new Error(`Gemini Audio Transcription error (${res.status}): ${errText}`);
            }

            const data = await res.json();
            const transcriptText = (data.candidates?.[0]?.content?.parts || [])
                .map(p => p.text)
                .join('')
                .trim();

            return {
                transcript: transcriptText,
                language_code: 'ta-IN',
                request_id: 'gemini-' + Date.now()
            };
        } catch (err) {
            lastError = err;
            if (modelsToTry.indexOf(model) < modelsToTry.length - 1) {
                continue;
            }
        }
    }

    throw lastError || new Error('Failed to transcribe audio with Gemini models.');
}

/**
 * Segment long audio file into 90-second chunks via ffmpeg and transcribe
 */
async function transcribeLongAudio(filePath, mimeType = 'audio/webm') {
    const tmpDir = path.join(__dirname, '../../uploads/temp_slices_' + Date.now() + '_' + Math.floor(Math.random() * 10000));
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
        const outputPattern = path.join(tmpDir, 'chunk_%03d.wav');
        execSync(`"${ffmpegPath}" -y -i "${filePath}" -f segment -segment_time 90 -ac 1 -ar 16000 "${outputPattern}"`, {
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
                const res = await transcribeSingleClipWithGemini(chunkBuffer, chunk, 'audio/wav');
                if (res && res.transcript && res.transcript.trim() && !res.transcript.includes('No speech detected')) {
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
 * Transcribe spoken Tamil audio using Gemini Flash (or Groq Whisper)
 * Handles long audio files automatically
 * @param {string|Buffer} audioInput - Local file path or Buffer containing audio bytes
 * @param {string} filename - Original filename
 * @param {string} mimeType - Audio mime type
 * @returns {Promise<{ transcript: string, language_code: string, request_id: string }>}
 */
async function transcribeAudio(audioInput, filename = 'recording.webm', mimeType = 'audio/webm') {
    let filePath = null;
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

    // If audio is under 15MB, transcribe in single shot
    if (buffer.length < 15 * 1024 * 1024) {
        try {
            return await transcribeSingleClipWithGemini(buffer, filename, mimeType);
        } catch (err) {
            console.warn('Single clip transcription notice:', err.message);
            if (!filePath) {
                filePath = path.join(__dirname, '../../uploads/temp_' + Date.now() + '_' + filename);
                fs.writeFileSync(filePath, buffer);
                try {
                    return await transcribeLongAudio(filePath, mimeType);
                } finally {
                    try { fs.unlinkSync(filePath); } catch (_) {}
                }
            } else {
                return await transcribeLongAudio(filePath, mimeType);
            }
        }
    } else {
        // Large audio file -> slice into chunks
        let tempCreated = false;
        if (!filePath) {
            filePath = path.join(__dirname, '../../uploads/temp_' + Date.now() + '_' + filename);
            fs.writeFileSync(filePath, buffer);
            tempCreated = true;
        }
        try {
            return await transcribeLongAudio(filePath, mimeType);
        } finally {
            if (tempCreated && fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (_) {}
            }
        }
    }
}

/**
 * Translate Tamil text to English (or vice versa) using Gemini (Free)
 * Guarantees output is grammatically flawless literary prose, not broken speech verse.
 * @param {string} text
 * @param {string} sourceLang
 * @param {string} targetLang
 * @returns {Promise<string>}
 */
async function translateText(text, sourceLang = 'ta-IN', targetLang = 'en-IN') {
    const apiKey = getApiKey();
    if (!apiKey || !text || text.trim() === '') {
        return text || '';
    }

    const isTamilToEnglish = sourceLang.startsWith('ta') && targetLang.startsWith('en');
    const isEnglishToTamil = sourceLang.startsWith('en') && targetLang.startsWith('ta');

    let prompt = '';
    if (isTamilToEnglish) {
        prompt = `You are an acclaimed English literary biographer and translator for Ninaivu Kalanjiyam (Family Heritage Archive).
Translate the following Tamil biographical memory into grammatically flawless, natural literary English prose.
MANDATORY RULES:
1. STRICTLY NO BROKEN CONVERSATIONAL ENGLISH OR SPEECH VERSE:
   - Do NOT translate literally word-for-word.
   - Transform colloquial spoken expressions, oral mannerisms, and dialect into elegant, dignified narrative English suitable for a printed biography book.
   - Use complete sentences, correct subject-verb agreement, and natural English idioms while maintaining cultural warmth and respect.
2. PRESERVE 100% FACTUAL ACCURACY:
   - Retain all personal names, family relations, places, dates, years, and life events with absolute accuracy.
3. Return ONLY the polished English translation without quotes, prefixes, or commentary.

Tamil Text:
${text}`;
    } else if (isEnglishToTamil) {
        prompt = `You are an acclaimed Tamil literary scholar and biographer for "Ninaivu Kalanjiyam" (நினைவுக் களஞ்சியம்).
Translate the following English biographical text into grammatically pure, refined written literary Tamil prose (இலக்கண ரீதியான தூய எழுத்துத் தமிழ் உரைநடை).
MANDATORY RULES:
1. STRICTLY NO SPEECH VERSE OR COLLOQUIAL TAMIL (பேச்சு வழக்கு முற்றிலும் கூடாது):
   - Use standard literary written Tamil with correct grammatical sandhi and verbal endings.
2. PRESERVE 100% FACTUAL ACCURACY:
   - Retain all names, dates, places, and facts.
3. Return ONLY the translated Tamil text without quotes or commentary.

English Text:
${text}`;
    } else {
        const srcName = sourceLang.startsWith('ta') ? 'Tamil' : 'English';
        const tgtName = targetLang.startsWith('ta') ? 'Tamil' : 'English';
        prompt = `Translate the following ${srcName} text accurately and naturally into ${tgtName}.
Preserve cultural terms, personal names, and respectful tone. Write in grammatically flawless literary prose.
Return ONLY the translation without quotes or commentary.

Text:
${text}`;
    }

    try {
        const translated = await chatCompletion([
            { role: 'user', content: prompt }
        ], 1400);

        return translated ? translated.trim().replace(/^["']|["']$/g, '') : text;
    } catch (err) {
        console.warn('Gemini translation notice:', err.message);
        return text;
    }
}

/**
 * Free Text-to-Speech using Google Indian Female TTS voice
 * High-quality spoken Indian Tamil / Indian English output
 * @param {string} text
 * @param {string} speaker - 'indian_female'
 * @param {string} targetLang - Optional 'ta-IN' or 'en-IN'
 * @returns {Promise<{ audioBase64: string, contentType: string }>}
 */
async function textToSpeech(text, speaker = 'indian_female', targetLang = null) {
    if (!text || text.trim() === '') {
        throw new Error('Text is required for text-to-speech.');
    }

    const cleanText = text.trim();

    // Automatically detect language: Indian English (en-IN) if English text, otherwise Indian Tamil (ta-IN)
    const isEnglish = targetLang === 'en' || targetLang === 'en-IN' || (/^[a-zA-Z0-9\s.,!?'"()-]+$/.test(cleanText));
    const langCode = isEnglish ? 'en-IN' : 'ta-IN';

    // Split text into segments of under 180 chars for Google Translate TTS
    const sentences = cleanText.match(/[^.!?\n]+[.!?\n]*/g) || [cleanText];
    const segments = [];
    let current = '';

    for (const s of sentences) {
        if ((current + ' ' + s).length <= 180) {
            current = (current + ' ' + s).trim();
        } else {
            if (current) segments.push(current);
            if (s.length <= 180) {
                current = s.trim();
            } else {
                // Break very long sentence by words
                const words = s.split(' ');
                let sub = '';
                for (const w of words) {
                    if ((sub + ' ' + w).length <= 180) {
                        sub = (sub + ' ' + w).trim();
                    } else {
                        if (sub) segments.push(sub);
                        sub = w;
                    }
                }
                if (sub) segments.push(sub);
                current = '';
            }
        }
    }
    if (current) segments.push(current);

    const buffers = [];
    for (const seg of segments.slice(0, 10)) { // limit to first 10 segments for fast response
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(seg)}&tl=${langCode}&client=tw-ob`;
        try {
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                }
            });
            if (res.ok) {
                const arrBuf = await res.arrayBuffer();
                buffers.push(Buffer.from(arrBuf));
            }
        } catch (ttsErr) {
            console.warn('TTS segment fetch notice:', ttsErr.message);
        }
    }

    if (buffers.length === 0) {
        throw new Error('TTS audio generation failed.');
    }

    const combinedBuffer = Buffer.concat(buffers);
    return {
        audioBase64: combinedBuffer.toString('base64'),
        contentType: 'audio/mpeg'
    };
}

/**
 * Extract life memories, traditions, milestones, and emotions from Tamil interview transcript
 * Guarantees output is structured, grammatically correct literary prose in both Tamil and English (NEVER speech verse).
 * @param {string} transcriptText - Raw spoken Tamil text
 * @param {string} narratorName - Name of the elder
 * @returns {Promise<Array<object>>}
 */
async function extractMemories(transcriptText, narratorName = 'குடும்பப் பெரியவர்') {
    if (!transcriptText || transcriptText.trim().length < 15) {
        return [];
    }

    const systemPrompt = `You are an acclaimed AI family biographer and oral heritage historian for "Ninaivu Kalanjiyam" (நினைவுக் களஞ்சியம்).
Analyze the recorded interview memories of elder "${narratorName}".
Extract distinct life milestones, formative memories, family traditions, and turning points into a structured JSON array.

CRITICAL GRAMMAR & PROSE RULES (STRICTLY NO SPEECH VERSE):
1. ELEGANT LITERARY TAMIL (இலக்கண ரீதியான தூய எழுத்துத் தமிழ்):
   - "title_tamil": Must be a dignified, concise title in written literary Tamil (e.g. "பள்ளிப் படிப்பும் நல்வழிகாட்டிய ஆசிரியர்களும்", NOT "ஸ்கூல்ல படிச்சது").
   - "description_tamil": Must be a well-structured, grammatically complete narrative paragraph in literary written Tamil (இலக்கண ரீதியான தூய எழுத்துத் தமிழ் உரைநடை).
   - STRICTLY FORBIDDEN: Spoken Tamil dialect, colloquial endings (படிச்சேன், செஞ்சோம், போயிருவோம்), conversational fillers (வந்து, அப்புறம், அப்படிதான்), and broken sentence fragments.
2. FLAWLESS LITERARY ENGLISH:
   - "title_english": Must be an elegant, concise title in Title Case (e.g. "Formative Schooling and the Impact of Teachers").
   - "description_english": Must be fluent, grammatically flawless narrative English prose written in complete sentences (e.g. "Recalls the formative years spent at the CSI Elementary School, reflecting on the kindness and dedication of early mentors.").
   - STRICTLY FORBIDDEN: Word-for-word spoken translation, broken grammar, or conversational slang.
3. STRICT FACTUAL FIDELITY & NO HALLUCINATION:
   - Only extract events and memories explicitly recounted by the narrator. Never invent outside people, places, or events.
4. CRITICAL YEAR RULE:
   - Do NOT guess or extrapolate any calendar year unless the narrator explicitly states a 4-digit year (e.g., 1972, 1968) in the spoken text.
   - If no year was explicitly stated, "approximate_year" MUST be null.

Return ONLY a valid JSON array of objects with this schema:
[
  {
    "title_tamil": "நினைவின் தலைப்பு (தூய தமிழ்)",
    "title_english": "Title in English (Title Case)",
    "description_tamil": "இலக்கண ரீதியான தூய தமிழ் உரைநடை விளக்கம்...",
    "description_english": "Grammatically complete, fluent narrative English description...",
    "event_type": "Childhood | Education | Career | Marriage | Family | Tradition | Wisdom | Milestone",
    "approximate_year": null
  }
]`;

    try {
        const responseText = await chatCompletion([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: transcriptText }
        ], 1400);

        const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (err) {
        console.warn('Gemini memory extraction notice:', err.message);
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
        ], 1800);

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
        console.error('Gemini chapter generation error:', err);
        throw err;
    }
}

/**
 * Generate intelligent, respectful follow-up questions in Tamil using Gemini
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
        ], 800);

        const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (err) {
        console.warn('Gemini follow-up generation notice:', err.message);
    }

    return [];
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

    if (rawSpokenText.includes('ஒலிப்பதிவில் பேச்சு எதுவும் கண்டறியப்படவில்லை') || rawSpokenText.includes('No speech detected in audio')) {
        return rawSpokenText;
    }

    let cleaned = rawSpokenText
        .replace(/^(சொல்லு[\.\s,]*)+/gi, '')
        .replace(/^(பேசுங்க[\.\s,]*)+/gi, '')
        .replace(/^(சொல்லுங்க[\.\s,]*)+/gi, '')
        .replace(/^(ஆமா[\.\s,]*)+/gi, '')
        .trim();

    if (!cleaned) return rawSpokenText;

    const apiKey = getApiKey();
    if (!apiKey) {
        return ruleBasedTamilNormalizer(cleaned);
    }

    try {
        const systemPrompt = `You are an acclaimed Tamil scholar and biographer for a prestigious family heritage archive.
Transform the provided raw spoken/colloquial Tamil interview transcript into grammatically correct, refined written Tamil prose (இலக்கண ரீதியான தூய எழுத்துத் தமிழ் உரைநடை).
MANDATORY RULES:
1. STRICTLY NO SPEECH VERSE OR COLLOQUIAL SPOKEN TAMIL (பேச்சு வழக்கு முற்றிலும் கூடாது):
   - Convert spoken endings, colloquial dialect, and oral mannerisms into standard written literary Tamil prose.
     Examples:
     * "படிச்சோம்" -> "படித்தோம்", "படிச்சேன்" -> "படித்தேன்", "படிச்சாங்க" -> "படித்தார்கள்", "படிச்சாரு" -> "படித்தார்"
     * "செஞ்சோம்" -> "செய்தோம்", "செஞ்சேன்" -> "செய்தேன்", "பண்ணுவோம்" -> "செய்வோம்", "பண்ணினோம்" -> "செய்தோம்"
     * "போயிருவோம்" -> "சென்றுவிடுவோம்", "போவோம்" -> "செல்வோம்", "போயிட்டு" -> "சென்றுவிட்டு", "போனாங்க" -> "சென்றார்கள்"
     * "வச்சிருப்பாங்க" -> "வைத்திருப்பார்கள்", "இருக்காப்ல" -> "இருக்கிறார்", "இருந்தாங்க" -> "இருந்தார்கள்"
     * "தெருவுல" -> "தெருவில்", "வீதியில" -> "வீதியில்", "ஸ்கூல்ல" / "பள்ளிக்கூடத்துல" -> "பள்ளிக்கூடத்தில்"
     * "ரெண்டு" -> "இரண்டு", "மூணு" -> "மூன்று", "நாலு" -> "நான்கு", "அஞ்சு" -> "ஐந்து", "பதினொன்னு" -> "பதினொன்று"
     * "இல்ல" -> "இல்லை", "காலமாயிட்டாங்க" -> "காலமாகிவிட்டார்கள்"
     * "அடிச்சாரு" -> "அடித்தார்", "கேட்டதுக்கு" -> "கேட்டதற்கு", "சொன்னாங்க" -> "கூறினார்கள்"
2. ELIMINATE SPOKEN HESITATIONS & FILLERS:
   - Remove oral filler words ("வந்து", "அதாவது", "அப்புறம்", "அப்படித்தான்", "கண்ணு") and conversational repetitions.
   - Punctuate sentences properly with commas and full stops so the text reads like a printed biography book.
3. PRESERVE 100% FACTUAL ACCURACY:
   - Do NOT delete, change, or fabricate any names, people, relations, schools, places, dates, years, or events mentioned by the speaker.
4. OUTPUT FORMAT:
   - Return ONLY the clean, polished written literary Tamil prose.
   - Do NOT add quotes, markdown formatting, explanations, or introductory text.`;

        const responseText = await chatCompletion([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: cleaned }
        ], 1400);

        const refined = responseText ? responseText.trim().replace(/^["']|["']$/g, '') : '';
        if (refined && refined.length > 5) {
            return refined;
        }
    } catch (err) {
        console.warn('Gemini Tamil grammar refinement notice:', err.message);
    }

    return ruleBasedTamilNormalizer(cleaned);
}

/**
 * Refine English transcript or rough translation into grammatically flawless, fluent literary English prose
 * Eliminates conversational hesitations, repetitive filler words, and awkward literal idioms.
 * @param {string} text - Raw or translated English text
 * @returns {Promise<string>} - Polished, publication-grade biographical English prose
 */
async function refineEnglishTranscriptToGrammaticalProse(text) {
    if (!text || typeof text !== 'string' || text.trim().length < 5) {
        return text || '';
    }

    if (text.includes('No speech detected in audio')) {
        return text;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
        return text.trim();
    }

    try {
        const systemPrompt = `You are a prestigious English biographer and editor for Ninaivu Kalanjiyam (Family Heritage Archive).
Transform the provided English text into grammatically flawless, natural, dignified literary English prose suitable for a published biography book.
MANDATORY RULES:
1. STRICTLY NO CONVERSATIONAL FILLERS OR SPEECH VERSE:
   - Remove conversational hesitation and verbal fillers ("like", "you know", "actually", "then then", "and all", "so so").
   - Fix broken sentence fragments, run-on thoughts, and awkward word-for-word idioms.
   - Use complete sentences, correct subject-verb agreement, elegant transition words, and proper punctuation.
2. PRESERVE 100% FACTUAL ACCURACY:
   - Do NOT delete, invent, or alter any personal names, family relations, dates, years, locations, or life events.
3. OUTPUT FORMAT:
   - Return ONLY the clean, polished English prose.
   - Do NOT add quotes, markdown headers, explanations, or commentary.`;

        const responseText = await chatCompletion([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text.trim() }
        ], 1400);

        const refined = responseText ? responseText.trim().replace(/^["']|["']$/g, '') : '';
        if (refined && refined.length > 5) {
            return refined;
        }
    } catch (err) {
        console.warn('Gemini English grammar refinement notice:', err.message);
    }

    return text.trim();
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
    refineEnglishTranscriptToGrammaticalProse,
    ruleBasedTamilNormalizer
};
