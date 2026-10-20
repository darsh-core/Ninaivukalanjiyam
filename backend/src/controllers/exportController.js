const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const pool = require('../config/database');

async function getExportPreview(req, res) {
    try {
        const { narratorId, sessionIds, includeAudio = true, language = 'ta', format = 'pdf', chapterIds, timelineEventIds } = req.body;

        const narratorRes = await pool.query('SELECT * FROM narrators WHERE id = $1', [narratorId]);
        if (narratorRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Narrator not found.' });
        }
        const narrator = narratorRes.rows[0];

        // Fetch all drafts for this narrator
        const draftsRes = await pool.query(
            'SELECT * FROM story_drafts WHERE narrator_id = $1 ORDER BY updated_at DESC',
            [narratorId]
        );
        const allDrafts = draftsRes.rows;
        const tamilDraft = allDrafts.find(d => d.language_code === 'ta') || allDrafts[0];
        const englishDraft = allDrafts.find(d => d.language_code === 'en') || allDrafts[0];

        // Fetch timeline events
        const timelineRes = await pool.query(`
            SELECT * FROM life_events 
            WHERE narrator_id = $1 AND extraction_status IN ('confirmed', 'corrected')
            ORDER BY approximate_year ASC NULLS LAST, created_at ASC;
        `, [narratorId]);

        let rawTimelineEvents = timelineRes.rows || [];
        if (timelineEventIds && Array.isArray(timelineEventIds) && timelineEventIds.length > 0) {
            rawTimelineEvents = rawTimelineEvents.filter(e => timelineEventIds.includes(e.id));
        }

        let draftTitle = '';
        let chapters = [];

        if (language === 'en') {
            draftTitle = englishDraft?.title || `${narrator.full_name_english || narrator.full_name_tamil}'s Life Biography — NinaivuKalanjiyam`;
            let rawChapters = englishDraft?.chapters || [];
            if (rawChapters.length === 0 && tamilDraft?.chapters) {
                rawChapters = tamilDraft.chapters;
            }
            if (chapterIds && Array.isArray(chapterIds) && chapterIds.length > 0) {
                const matched = rawChapters.filter(c => chapterIds.includes(c.id));
                chapters = matched.length > 0 ? matched : rawChapters;
            } else {
                chapters = rawChapters;
            }
        } else if (language === 'both') {
            draftTitle = `${narrator.full_name_tamil || ''} / ${narrator.full_name_english || ''} — நினைவுக் களஞ்சியம் (Bilingual Archive)`;
            const taChaps = tamilDraft?.chapters || [];
            const enChaps = englishDraft?.chapters || [];
            const maxLen = Math.max(taChaps.length, enChaps.length);
            const combined = [];
            for (let i = 0; i < maxLen; i++) {
                const taC = taChaps[i];
                const enC = enChaps[i];
                if (taC && enC) {
                    combined.push({
                        id: taC.id || `c${i + 1}`,
                        title: `${taC.title} / ${enC.title}`,
                        title_tamil: taC.title,
                        title_english: enC.title,
                        content: `【 தமிழ் / Tamil 】\n${taC.content}\n\n【 ENGLISH / ஆங்கிலம் 】\n${enC.content}`,
                        status: 'confirmed'
                    });
                } else if (taC) {
                    combined.push({
                        id: taC.id || `c${i + 1}`,
                        title: taC.title,
                        content: taC.content,
                        status: 'confirmed'
                    });
                } else if (enC) {
                    combined.push({
                        id: enC.id || `c${i + 1}`,
                        title: enC.title,
                        content: enC.content,
                        status: 'confirmed'
                    });
                }
            }
            if (chapterIds && Array.isArray(chapterIds) && chapterIds.length > 0) {
                const matched = combined.filter(c => chapterIds.includes(c.id));
                chapters = matched.length > 0 ? matched : combined;
            } else {
                chapters = combined;
            }
        } else {
            // Tamil
            draftTitle = tamilDraft?.title || `${narrator.full_name_tamil || narrator.full_name_english} அவர்களின் வாழ்க்கை வரலாறு — நினைவுக் களஞ்சியம்`;
            let rawChapters = tamilDraft?.chapters || [];
            if (chapterIds && Array.isArray(chapterIds) && chapterIds.length > 0) {
                const matched = rawChapters.filter(c => chapterIds.includes(c.id));
                chapters = matched.length > 0 ? matched : rawChapters;
            } else {
                chapters = rawChapters;
            }
        }

        // Format timeline events for selected language
        const timelineEvents = rawTimelineEvents.map(ev => {
            const rawTitle = ev.title || '';
            const parenMatch = rawTitle.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
            const taPart = ev.title_tamil || (parenMatch ? parenMatch[1].trim() : rawTitle);
            const enPart = ev.title_english || (parenMatch ? parenMatch[2].trim() : rawTitle);

            const taDesc = ev.description || '';
            const enDesc = ev.description_english || ev.description || '';

            if (language === 'en') {
                return {
                    ...ev,
                    title: enPart || rawTitle,
                    description: enDesc,
                };
            } else if (language === 'both') {
                return {
                    ...ev,
                    title: parenMatch ? `${taPart} / ${enPart}` : rawTitle,
                    description: enDesc && taDesc && enDesc !== taDesc
                        ? `${taDesc}\n\n[ENGLISH]: ${enDesc}`
                        : taDesc || enDesc,
                };
            } else {
                return {
                    ...ev,
                    title: taPart || rawTitle,
                    description: taDesc,
                };
            }
        });

        // Fetch sessions and recordings
        let sessionQuery = `
            SELECT s.*, count(r.id) as recordings_count
            FROM interview_sessions s
            LEFT JOIN session_questions sq ON sq.session_id = s.id
            LEFT JOIN recordings r ON r.session_question_id = sq.id AND r.is_active = TRUE
            WHERE s.narrator_id = $1
        `;
        const params = [narratorId];

        if (sessionIds && sessionIds.length > 0) {
            sessionQuery += ` AND s.id = ANY($2::uuid[])`;
            params.push(sessionIds);
        }
        sessionQuery += ` GROUP BY s.id ORDER BY s.session_number ASC;`;

        const sessionsRes = await pool.query(sessionQuery, params);

        return res.status(200).json({
            success: true,
            preview: {
                narrator,
                draftTitle,
                chapters,
                timelineEvents,
                sessions: sessionsRes.rows,
                metadata: {
                    totalChapters: chapters.length,
                    totalTimelineEvents: timelineEvents.length,
                    totalSessions: sessionsRes.rows.length,
                    includeAudio: !!includeAudio,
                    language,
                    format,
                    generatedAt: new Date().toISOString()
                }
            }
        });
    } catch (error) {
        console.error('Export preview error:', error);
        return res.status(500).json({ success: false, message: 'Unable to prepare export preview.' });
    }
}

async function downloadExport(req, res) {
    try {
        const { narratorId } = req.params;
        const { format = 'text', language = 'ta', chapterIds, timelineEventIds } = req.query;

        const narratorRes = await pool.query('SELECT * FROM narrators WHERE id = $1', [narratorId]);
        if (narratorRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Narrator not found.' });
        }
        const narrator = narratorRes.rows[0];

        // Fetch drafts
        const draftsRes = await pool.query(
            'SELECT * FROM story_drafts WHERE narrator_id = $1 ORDER BY updated_at DESC',
            [narratorId]
        );
        const allDrafts = draftsRes.rows;
        const tamilDraft = allDrafts.find(d => d.language_code === 'ta') || allDrafts[0];
        const englishDraft = allDrafts.find(d => d.language_code === 'en') || allDrafts[0];

        let selectedDraft = tamilDraft;
        let chapters = [];
        let draftTitle = '';

        if (language === 'en') {
            selectedDraft = englishDraft;
            draftTitle = englishDraft?.title || `${narrator.full_name_english || narrator.full_name_tamil}'s Life Biography`;
            chapters = englishDraft?.chapters || [];
        } else if (language === 'both') {
            draftTitle = `${narrator.full_name_tamil || ''} / ${narrator.full_name_english || ''} — Bilingual Archive`;
            const taChaps = tamilDraft?.chapters || [];
            const enChaps = englishDraft?.chapters || [];
            const maxLen = Math.max(taChaps.length, enChaps.length);
            for (let i = 0; i < maxLen; i++) {
                const taC = taChaps[i];
                const enC = enChaps[i];
                if (taC && enC) {
                    chapters.push({
                        id: taC.id || `c${i + 1}`,
                        title: `${taC.title} / ${enC.title}`,
                        content: `[TAMIL / தமிழ்]\n${taC.content}\n\n[ENGLISH / ஆங்கிலம்]\n${enC.content}`,
                    });
                } else if (taC) {
                    chapters.push(taC);
                } else if (enC) {
                    chapters.push(enC);
                }
            }
        } else {
            selectedDraft = tamilDraft;
            draftTitle = tamilDraft?.title || `${narrator.full_name_tamil} அவர்களின் வாழ்க்கை வரலாறு`;
            chapters = tamilDraft?.chapters || [];
        }

        if (chapterIds) {
            const chapFilter = chapterIds.split(',').map(s => s.trim());
            const filtered = chapters.filter(c => chapFilter.includes(c.id));
            if (filtered.length > 0) chapters = filtered;
        }

        const timelineRes = await pool.query(`
            SELECT * FROM life_events 
            WHERE narrator_id = $1 
            ORDER BY approximate_year ASC NULLS LAST, created_at ASC;
        `, [narratorId]);

        let timelineEvents = timelineRes.rows || [];
        if (timelineEventIds) {
            const timeFilter = timelineEventIds.split(',').map(s => s.trim());
            timelineEvents = timelineEvents.filter(e => timeFilter.includes(e.id));
        }

        const formattedTimeline = timelineEvents.map(ev => {
            const rawTitle = ev.title || '';
            const parenMatch = rawTitle.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
            const taPart = ev.title_tamil || (parenMatch ? parenMatch[1].trim() : rawTitle);
            const enPart = ev.title_english || (parenMatch ? parenMatch[2].trim() : rawTitle);
            const taDesc = ev.description || '';
            const enDesc = ev.description_english || ev.description || '';

            if (language === 'en') {
                return { ...ev, title: enPart || rawTitle, description: enDesc };
            } else if (language === 'both') {
                return {
                    ...ev,
                    title: parenMatch ? `${taPart} / ${enPart}` : rawTitle,
                    description: enDesc && taDesc && enDesc !== taDesc
                        ? `${taDesc}\n\n[ENGLISH]: ${enDesc}`
                        : taDesc || enDesc,
                };
            } else {
                return { ...ev, title: taPart || rawTitle, description: taDesc };
            }
        });

        const name = language === 'en'
            ? (narrator.full_name_english || narrator.full_name_tamil)
            : (narrator.full_name_tamil || narrator.full_name_english);

        if (format === 'pdf') {
            const safeTitle = `${name} — ${language === 'en' ? 'Life Biography' : 'வாழ்க்கை வரலாறு'}`;
            let html = `<!DOCTYPE html>
<html lang="${language === 'en' ? 'en' : 'ta'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Mukta+Malar:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
  @page {
    margin: 18mm;
    size: A4 portrait;
  }
  @media print {
    body { background: #FFFFFF !important; font-size: 11pt; color: #111; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
    .chapter-card, .timeline-card { break-inside: avoid; }
  }
  body {
    font-family: 'Mukta Malar', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    color: #2D2422;
    background: #FAF8F5;
    margin: 0;
    padding: 32px 20px;
    line-height: 1.8;
  }
  .container {
    max-width: 820px;
    margin: 0 auto;
    background: #FFFFFF;
    border: 1px solid #E5E0DA;
    border-radius: 24px;
    padding: 48px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  }
  .cover {
    text-align: center;
    border-bottom: 2px solid #EAE5DF;
    padding-bottom: 36px;
    margin-bottom: 40px;
  }
  .badge {
    display: inline-block;
    padding: 4px 14px;
    border-radius: 9999px;
    background: #ECE7E1;
    color: #5E5653;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 12px;
  }
  h1 { font-size: 28px; font-weight: 800; color: #362F2D; margin: 8px 0; }
  .meta { font-size: 14px; color: #736B67; margin-top: 10px; }
  .section-title { font-size: 20px; font-weight: 800; color: #362F2D; margin: 36px 0 20px; border-left: 4px solid #34B371; padding-left: 12px; }
  .chapter-card { margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px dashed #E5E0DA; }
  .chapter-title { font-size: 18px; font-weight: 700; color: #2D2422; margin-bottom: 10px; }
  .chapter-content { font-size: 14.5px; color: #3C3735; white-space: pre-line; text-align: justify; }
  .timeline-card { padding: 14px 18px; background: #FAF9F8; border-radius: 12px; margin-bottom: 12px; border: 1px solid #EAE5DF; }
  .timeline-year { font-weight: 800; color: #34B371; font-size: 12px; background: #E8F5EE; padding: 2px 8px; border-radius: 9999px; display: inline-block; margin-right: 8px; }
  .timeline-title { font-weight: 700; color: #2D2422; font-size: 15px; }
  .timeline-desc { font-size: 13.5px; color: #5E5653; margin-top: 6px; }
  .footer { text-align: center; font-size: 12px; color: #8C8480; margin-top: 48px; border-top: 1px solid #EAE5DF; padding-top: 24px; }
  .print-btn {
    position: fixed;
    top: 24px;
    right: 24px;
    background: #362F2D;
    color: #FFFFFF;
    border: none;
    border-radius: 9999px;
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">🖨️ ${language === 'en' ? 'Print / Save as PDF' : 'PDF ஆக அச்சிடுக / சேமிக்க'}</button>
<div class="container">
  <div class="cover">
    <div class="badge">NINAIVU KALANJIYAM · ${language.toUpperCase()} EDITION</div>
    <h1>${draftTitle}</h1>
    <div class="meta">
      <strong>${language === 'en' ? 'Narrator: ' : 'நினைவாளர்: '}</strong>${name}
      ${narrator.preferred_name ? ` (${narrator.preferred_name})` : ''}
      ${narrator.birth_year ? ` · ${language === 'en' ? 'Birth: ' : 'பிறந்த ஆண்டு: '}${narrator.birth_year}` : ''}
      ${narrator.place_of_birth ? ` · 📍 ${narrator.place_of_birth}` : ''}
    </div>
  </div>

  <div class="section-title">📖 ${language === 'en' ? 'Life Story Chapters' : language === 'both' ? 'வாழ்க்கை வரலாற்று அத்தியாயங்கள் (Chapters)' : 'வாழ்க்கை வரலாற்று அத்தியாயங்கள்'}</div>
  ${chapters.map((chap) => `
    <div class="chapter-card">
      <div class="chapter-title">${chap.title}</div>
      <div class="chapter-content">${chap.content}</div>
    </div>
  `).join('')}

  ${formattedTimeline.length > 0 ? `
    <div class="page-break"></div>
    <div class="section-title">⏳ ${language === 'en' ? 'Life Timeline Milestones' : language === 'both' ? 'வாழ்க்கைக் காலவரிசை நினைவுகள் (Timeline)' : 'வாழ்க்கைக் காலவரிசை நினைவுகள்'}</div>
    ${formattedTimeline.map(ev => `
      <div class="timeline-card">
        <div>
          ${ev.approximate_year ? `<span class="timeline-year">${ev.approximate_year}</span>` : ''}
          <span class="timeline-title">${ev.title}</span>
          ${ev.place_name ? `<span style="font-size: 11px; color: #888; margin-left: 8px;">📍 ${ev.place_name}</span>` : ''}
        </div>
        ${ev.description ? `<div class="timeline-desc">${ev.description}</div>` : ''}
      </div>
    `).join('')}
  ` : ''}

  <div class="footer">
    ${language === 'en' ? 'Ninaivu Kalanjiyam · Preservation of Family Oral Histories' : 'நினைவுக் களஞ்சியம் · குடும்ப வாய்மொழி வரலாற்றுப் பாதுகாப்பு'}
    <br><small>Generated on ${new Date().toLocaleDateString()}</small>
  </div>
</div>
<script>
  window.addEventListener('DOMContentLoaded', () => {
    if (window.location.search.includes('autoprint=true')) {
      setTimeout(() => window.print(), 600);
    }
  });
</script>
</body>
</html>`;
            const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
            const isAutoPrint = req.query.autoprint === 'true' || req.query.preview === 'true';

            if (fs.existsSync(chromePath) && !isAutoPrint) {
                const tmpHtml = path.join(os.tmpdir(), `story_${Date.now()}_${Math.random().toString(36).substring(7)}.html`);
                const tmpPdf = path.join(os.tmpdir(), `story_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
                try {
                    fs.writeFileSync(tmpHtml, html, 'utf8');
                    execSync(`"${chromePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${tmpPdf}" "file://${tmpHtml}"`, {
                        timeout: 15000,
                        stdio: 'ignore',
                    });
                    if (fs.existsSync(tmpPdf)) {
                        const pdfBuffer = fs.readFileSync(tmpPdf);
                        const safeFileName = `${(narrator.full_name_english || narrator.full_name_tamil || 'Narrator').replace(/[\s/\\?%*:|"<>]+/g, '_')}_NinaivuKalanjiyam_${language}.pdf`;
                        res.setHeader('Content-Type', 'application/pdf');
                        res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
                        res.setHeader('Content-Length', pdfBuffer.length);
                        try {
                            fs.unlinkSync(tmpHtml);
                            fs.unlinkSync(tmpPdf);
                        } catch (e) {}
                        return res.send(pdfBuffer);
                    }
                } catch (chromeErr) {
                    console.error('Headless Chrome PDF generation fallback:', chromeErr);
                    try { if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml); } catch (e) {}
                    try { if (fs.existsSync(tmpPdf)) fs.unlinkSync(tmpPdf); } catch (e) {}
                }
            }

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);
        }

        if (format === 'transcript' || format === 'text') {
            let content = `======================================================\n`;
            content += language === 'en'
                ? `NINAIVU KALANJIYAM — PRESERVATION ARCHIVE\n`
                : `நினைவுக் களஞ்சியம் — NINAIVUKALANJIYAM ARCHIVE\n`;
            content += `======================================================\n\n`;
            content += language === 'en'
                ? `Narrator: ${name}\n`
                : `நினைவாளர்: ${name}\n`;
            if (narrator.preferred_name) content += `Preferred Name: ${narrator.preferred_name}\n`;
            if (narrator.birth_year) content += `Birth Year: ${narrator.birth_year}\n`;
            if (narrator.place_of_birth) content += `Place of Birth: ${narrator.place_of_birth}\n`;
            content += `Export Language: ${language.toUpperCase()}\n`;
            content += `Generated Date: ${new Date().toLocaleDateString()}\n\n`;

            content += `------------------------------------------------------\n`;
            content += language === 'en' ? `LIFE BIOGRAPHY CHAPTERS\n` : `வாழ்க்கை வரலாறு அத்தியாயங்கள் (LIFE BIOGRAPHY)\n`;
            content += `------------------------------------------------------\n\n`;

            chapters.forEach((chap) => {
                content += `${chap.title}\n`;
                content += `${chap.content}\n\n`;
            });

            content += `------------------------------------------------------\n`;
            content += language === 'en' ? `LIFE TIMELINE MILESTONES\n` : `வாழ்க்கை நிகழ்வுகளின் காலவரிசை (LIFE TIMELINE)\n`;
            content += `------------------------------------------------------\n\n`;

            formattedTimeline.forEach((ev) => {
                const yearPrefix = ev.approximate_year ? `${ev.approximate_year} : ` : '';
                content += `• ${yearPrefix}${ev.title}\n`;
                if (ev.description) content += `  ${ev.description}\n`;
                if (ev.place_name) content += `  Place: ${ev.place_name}\n`;
                content += `\n`;
            });

            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(name)}_${language.toUpperCase()}_Archive.txt"`);
            return res.send(content);
        }

        // Return JSON bundle
        return res.status(200).json({
            success: true,
            narrator,
            timeline: formattedTimeline,
            story: {
                title: draftTitle,
                chapters
            },
            language,
            exportedAt: new Date()
        });
    } catch (error) {
        console.error('Download export error:', error);
        return res.status(500).json({ success: false, message: 'Unable to process download export.' });
    }
}

module.exports = {
    getExportPreview,
    downloadExport
};

