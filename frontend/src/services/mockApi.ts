// Fake data layer with the same exports as api.ts, backed by the in-memory store in mockStore.ts.
// Do not add exports here beyond the api.ts function set (switch.test.ts asserts they match); controls live in mockStore.ts.
import type {
  User, Narrator, NarratorDetail, NarratorInput, InterviewSession, BankQuestion, SessionQuestion,
  Recording, Transcript, LifeEvent, StoryDraft, DashboardOverview,
  ConsentRecord, TopicProgress, ArchiveKind, ArchiveExport,
  ProfileInput,
} from '../types';
import { DEMO_USER } from './mockData';
import {
  mockGate, db, copy, newId, nowIso, rememberBlob, blobUrlFor, latestTranscript, toTranscript, hydrateNarrator, hydrateSession,
  hydrateRecording, hydrateQuestion, activeRecordingsForNarrator,
} from './mockStore';

const MOCK_AUDIO = '/mock-audio/sample-1.wav';
let demoEmail = DEMO_USER.email;
let demoProfile: Partial<User> = {};

function demoUser(): User {
  return { ...DEMO_USER, email: demoEmail, ...demoProfile };
}

function findNarrator(id: string) {
  const n = db().narrators.find((x) => x.id === id);
  if (!n) throw new Error('Narrator not found');
  return n;
}
function findSession(id: string) {
  const s = db().sessions.find((x) => x.id === id);
  if (!s) throw new Error('Session not found');
  return s;
}
function findQuestion(id: string) {
  const q = db().questions.find((x) => x.id === id);
  if (!q) throw new Error('Question not found');
  return q;
}
function findEvent(id: string) {
  const e = db().events.find((x) => x.id === id);
  if (!e) throw new Error('Life event not found');
  return e;
}

export async function loginUser(email: string, _password?: string, _fullName?: string): Promise<{ user: User; token: string }> {
  await mockGate('loginUser');
  demoEmail = email || DEMO_USER.email;
  return { user: demoUser(), token: 'mock-token' };
}

export async function registerUser(_fullName: string, email: string, _password?: string): Promise<{ user: User; token: string }> {
  await mockGate('registerUser');
  demoEmail = email || DEMO_USER.email;
  return { user: demoUser(), token: 'mock-token' };
}

export async function getCurrentUser(): Promise<User | null> {
  await mockGate('getCurrentUser');
  return demoUser();
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  await mockGate('getDashboardOverview');
  const narrators = db().narrators.filter((n) => n.status !== 'archived').map(hydrateNarrator);
  const recordings = db().recordings.filter((r) => r.is_active).map(hydrateRecording);
  const unfinished = db().sessions.find((s) => s.status === 'in_progress');
  return copy({
    metrics: {
      totalNarrators: narrators.length,
      interviewSessions: db().sessions.length,
      storiesRecorded: recordings.length,
      pendingTranscripts: recordings.filter((r) => r.transcript_job_status !== 'done').length,
      memoriesCollected: db().events.length,
    },
    recentNarrators: narrators.slice(-3).reverse(),
    unfinishedSession: unfinished ? hydrateSession(unfinished) : null,
    recentStories: recordings.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3),
    recentActivities: recordings.slice(0, 3).map((r) => ({
      id: `act-${r.id}`, type: 'recording', text: r.question_tamil ?? '', time: r.created_at,
    })),
  });
}

export async function getNarrators(params?: { createdBy?: string; all?: boolean }): Promise<Narrator[]> {
  await mockGate('getNarrators');
  return db().narrators
    .filter((n) => n.status !== 'archived')
    .filter((n) => !params?.createdBy || params.all || n.created_by === params.createdBy)
    .map(hydrateNarrator);
}

export async function getNarratorById(id: string): Promise<NarratorDetail> {
  await mockGate('getNarratorById');
  const n = findNarrator(id);
  return copy({
    ...hydrateNarrator(n),
    sessions: db().sessions.filter((s) => s.narrator_id === id).map(hydrateSession),
    timeline: db().events.filter((e) => e.narrator_id === id),
    recordings: activeRecordingsForNarrator(id),
    drafts: db().drafts.filter((d) => d.narrator_id === id),
  });
}

export async function createNarrator(input: NarratorInput): Promise<Narrator> {
  await mockGate('createNarrator');
  const n: Narrator = {
    id: newId('n'), full_name_tamil: input.full_name_tamil || null, full_name_english: input.full_name_english || null,
    preferred_name: input.preferred_name || null, birth_year: input.birth_year ? Number(input.birth_year) : null,
    place_of_birth: input.place_of_birth || null, preferred_language: input.preferred_language || 'ta',
    tamil_dialect: input.tamil_dialect || null, profile_photo_url: input.profile_photo_url ?? null, status: 'active',
    created_at: nowIso(), created_by: input.created_by ?? DEMO_USER.id, creator_name: DEMO_USER.fullName, creator_email: demoEmail,
    photo_frame_note: null,
  };
  db().narrators.push(n);
  return hydrateNarrator(n);
}

export async function updateNarrator(id: string, input: Partial<NarratorInput>): Promise<Narrator> {
  await mockGate('updateNarrator');
  const n = findNarrator(id);
  if (input.full_name_tamil !== undefined) n.full_name_tamil = input.full_name_tamil || null;
  if (input.full_name_english !== undefined) n.full_name_english = input.full_name_english || null;
  if (input.preferred_name !== undefined) n.preferred_name = input.preferred_name || null;
  if (input.birth_year !== undefined) n.birth_year = input.birth_year ? Number(input.birth_year) : null;
  if (input.place_of_birth !== undefined) n.place_of_birth = input.place_of_birth || null;
  if (input.preferred_language !== undefined) n.preferred_language = input.preferred_language;
  if (input.tamil_dialect !== undefined) n.tamil_dialect = input.tamil_dialect || null;
  if (input.profile_photo_url !== undefined) n.profile_photo_url = input.profile_photo_url || null;
  return hydrateNarrator(n);
}

export async function archiveNarrator(id: string): Promise<void> {
  await mockGate('archiveNarrator');
  findNarrator(id).status = 'archived';
}

export async function getAllSessions(narratorId?: string): Promise<InterviewSession[]> {
  await mockGate('getAllSessions');
  return db().sessions.filter((s) => !narratorId || s.narrator_id === narratorId).map(hydrateSession);
}

export async function getSessionById(id: string): Promise<InterviewSession> {
  await mockGate('getSessionById');
  return hydrateSession(findSession(id));
}

export async function createSession(payload: {
  narrator_id: string;
  session_number?: number;
  title: string;
  interview_mode: string;
  preferred_language: string;
  notes?: string;
}): Promise<InterviewSession> {
  await mockGate('createSession');
  findNarrator(payload.narrator_id);
  const existing = db().sessions.filter((s) => s.narrator_id === payload.narrator_id);
  const now = nowIso();
  const s: Omit<InterviewSession, 'questions'> = {
    id: newId('s'), narrator_id: payload.narrator_id, session_number: payload.session_number ?? existing.length + 1,
    title: payload.title, interview_mode: payload.interview_mode as InterviewSession['interview_mode'],
    preferred_language: payload.preferred_language, status: 'in_progress', notes: payload.notes ?? null,
    started_at: now, ended_at: null, last_activity_at: now, created_by: DEMO_USER.id,
  };
  db().sessions.push(s);
  return hydrateSession(s);
}

export async function updateSessionStatus(id: string, status: string): Promise<InterviewSession> {
  await mockGate('updateSessionStatus');
  const s = findSession(id);
  s.status = status as InterviewSession['status'];
  s.last_activity_at = nowIso();
  if (status === 'completed' || status === 'abandoned') s.ended_at = s.last_activity_at;
  return hydrateSession(s);
}

export async function addQuestionToSession(sessionId: string, payload: {
  question_tamil: string;
  question_english?: string;
  question_type?: string;
  question_id?: string;
}): Promise<SessionQuestion> {
  await mockGate('addQuestionToSession');
  findSession(sessionId);
  const order = db().questions.filter((q) => q.session_id === sessionId).reduce((m, q) => Math.max(m, q.display_order), 0) + 1;
  const q = {
    id: newId('q'), session_id: sessionId, question_id: payload.question_id ?? null, question_tamil: payload.question_tamil,
    question_english: payload.question_english ?? null,
    question_type: (payload.question_type ?? 'structured') as SessionQuestion['question_type'],
    display_order: order, status: 'pending' as SessionQuestion['status'], asked_at: null, answered_at: null,
  };
  db().questions.push(q);
  return hydrateQuestion(q);
}

export async function updateQuestionStatus(questionId: string, status: string): Promise<SessionQuestion> {
  await mockGate('updateQuestionStatus');
  const q = findQuestion(questionId);
  q.status = status as SessionQuestion['status'];
  const now = nowIso();
  if (status === 'asked') q.asked_at = now;
  if (status === 'answered') q.answered_at = now;
  findSession(q.session_id).last_activity_at = now;
  return hydrateQuestion(q);
}

export async function getQuestionBank(category?: string): Promise<{ categories: string[]; data: BankQuestion[] }> {
  await mockGate('getQuestionBank');
  const all = db().bank.filter((b) => b.is_enabled);
  return copy({
    categories: [...new Set(all.map((b) => b.category))],
    data: all.filter((b) => !category || b.category === category),
  });
}

export async function getAllRecordings(params?: {
  narrator_id?: string;
  session_id?: string;
  status?: string;
  createdBy?: string;
  user_email?: string;
  sort?: 'asc' | 'desc';
}): Promise<Recording[]> {
  await mockGate('getAllRecordings');
  const list = db().recordings.filter((r) => r.is_active).map(hydrateRecording)
    .filter((r) => !params?.narrator_id || r.narrator_id === params.narrator_id)
    .filter((r) => !params?.session_id || r.session_id === params.session_id)
    .filter((r) => !params?.status || r.status === params.status)
    .filter((r) => !params?.createdBy || r.created_by === params.createdBy)
    .filter((r) => !params?.user_email || r.creator_email === params.user_email);
  const dir = params?.sort === 'asc' ? 1 : -1;
  return list.sort((a, b) => dir * a.created_at.localeCompare(b.created_at));
}

export async function uploadRecordingBlob(sessionQuestionId: string,
  audioBlob: Blob,
  durationSeconds: number,
  transcriptText?: string): Promise<Recording> {
  await mockGate('uploadRecordingBlob');
  const q = findQuestion(sessionQuestionId);
  const takes = db().recordings.filter((r) => r.session_question_id === q.id);
  takes.forEach((r) => { r.is_active = false; });
  const now = nowIso();
  const id = newId('rec');
  const storageKey = `mock-upload/${id}`;
  rememberBlob(storageKey, audioBlob);
  const rec = {
    id, session_question_id: q.id, version_number: takes.reduce((m, r) => Math.max(m, r.version_number), 0) + 1,
    storage_key: storageKey, original_filename: `${id}.webm`, mime_type: audioBlob.type || 'audio/webm',
    file_size_bytes: audioBlob.size, duration_seconds: durationSeconds, status: 'saved' as const, is_active: true, created_at: now,
  };
  db().recordings.push(rec);
  db().transcripts.push({
    id: newId('t'), recording_id: id, version_number: 1, transcript_text: transcriptText ?? '', transcript_text_english: null,
    source: 'speech_to_text', status: 'pending', job_status: 'queued', reviewed_at: null, created_at: now,
  });
  q.status = 'answered';
  q.answered_at = now;
  findSession(q.session_id).last_activity_at = now;
  return hydrateRecording(rec);
}

export async function getTranscriptsByRecording(recordingId: string): Promise<Transcript[]> {
  await mockGate('getTranscriptsByRecording');
  return db().transcripts.filter((t) => t.recording_id === recordingId)
    .sort((a, b) => b.version_number - a.version_number).map((t) => copy(toTranscript(t)));
}

export async function updateTranscript(transcriptId: string, transcriptText: string, isReviewed = true): Promise<Transcript> {
  await mockGate('updateTranscript');
  const base = db().transcripts.find((t) => t.id === transcriptId);
  if (!base) throw new Error('Transcript not found');
  const latest = latestTranscript(base.recording_id)!;
  const now = nowIso();
  const next = {
    id: newId('t'), recording_id: base.recording_id, version_number: latest.version_number + 1, transcript_text: transcriptText,
    transcript_text_english: latest.transcript_text_english ?? null, source: 'corrected' as const, status: 'completed' as const,
    job_status: 'done' as const, reviewed_at: isReviewed ? now : null, created_at: now,
  };
  db().transcripts.push(next);
  return copy(toTranscript(next));
}

export async function regenerateTranscript(recordingId: string): Promise<Transcript> {
  await mockGate('regenerateTranscript');
  const latest = latestTranscript(recordingId);
  if (!db().recordings.some((r) => r.id === recordingId)) throw new Error('Recording not found');
  const next = {
    id: newId('t'), recording_id: recordingId, version_number: (latest?.version_number ?? 0) + 1, transcript_text: '',
    transcript_text_english: null, source: 'speech_to_text' as const, status: 'pending' as const, job_status: 'queued' as const,
    reviewed_at: null, created_at: nowIso(),
  };
  db().transcripts.push(next);
  return copy(toTranscript(next));
}

export async function refineTranscriptProse(text: string): Promise<{ refined_text: string; refined_english?: string }> {
  await mockGate('refineTranscriptProse');
  return { refined_text: text.trim().replace(/\s+/g, ' '), refined_english: 'A lightly polished version of the story.' };
}

export async function getAIFollowUpQuestions(_payload: {
  question: string;
  answer?: string;
  narrator_name?: string;
}): Promise<Array<{ tamil: string; english: string; theme: string }>> {
  await mockGate('getAIFollowUpQuestions');
  return [
    { tamil: 'அந்த நாட்களில் உங்களுடன் இருந்தவர்கள் யார்?', english: 'Who was with you in those days?', theme: 'people' },
    { tamil: 'அதைப் பற்றி இன்று நினைத்தால் எப்படி உணர்கிறீர்கள்?', english: 'How do you feel when you think of it today?', theme: 'feelings' },
    { tamil: 'அந்த இடம் இப்போது எப்படி மாறியிருக்கிறது?', english: 'How has that place changed since?', theme: 'place' },
  ];
}

export async function extractMemoriesWithAI(narratorId: string): Promise<LifeEvent[]> {
  await mockGate('extractMemoriesWithAI');
  findNarrator(narratorId);
  const rec = activeRecordingsForNarrator(narratorId)[0];
  const e: LifeEvent = {
    id: newId('ev'), narrator_id: narratorId, title: 'புதிதாகக் கண்டறியப்பட்ட நினைவு', title_tamil: 'புதிதாகக் கண்டறியப்பட்ட நினைவு',
    title_english: 'Newly detected memory', description: null, description_english: null, approximate_year: null,
    date_precision: 'unknown', event_type: 'other', place_name: null, extraction_status: 'unreviewed', created_at: nowIso(),
    recording_id: rec?.id ?? null, source_excerpt: rec?.transcript_text ?? null,
  };
  db().events.push(e);
  return copy(db().events.filter((x) => x.narrator_id === narratorId));
}

function buildDraft(narratorId: string, languageCode: string, recordingIds: string[], eventTitles: string[]): StoryDraft {
  const n = findNarrator(narratorId);
  const now = nowIso();
  const existing = db().drafts.filter((d) => d.narrator_id === narratorId);
  const titles = eventTitles.length ? eventTitles : ['நினைவுகளின் தொடக்கம்'];
  const draft: StoryDraft = {
    id: newId('d'), narrator_id: narratorId, title: `${n.full_name_tamil ?? ''} வாழ்க்கைக் கதை`.trim(), language_code: languageCode,
    version: existing.length + 1, status: 'draft', created_at: now, updated_at: now,
    chapters: titles.slice(0, 3).map((t, i) => ({
      id: newId('ch'), chapter_number: i + 1, title: t, title_english: `Chapter ${i + 1}`, status: 'draft',
      recording_ids: recordingIds.slice(i, i + 1),
      content: 'இந்த அத்தியாயம் பதிவுகளிலிருந்து உருவாக்கப்பட்ட மாதிரி வரைவு. இதைத் திருத்தி உங்கள் குரலில் மாற்றலாம்.',
    })),
  };
  db().drafts.push(draft);
  return copy(draft);
}

export async function generateStoryDraftWithAI(narratorId: string, languageCode = 'ta'): Promise<StoryDraft> {
  await mockGate('generateStoryDraftWithAI');
  const events = db().events.filter((e) => e.narrator_id === narratorId && e.extraction_status !== 'rejected');
  return buildDraft(narratorId, languageCode, events.map((e) => e.recording_id ?? '').filter(Boolean), events.map((e) => e.title));
}

export async function synthesizeSpeech(_text: string,
  _speaker = 'indian_female',
  _targetLang?: string): Promise<{ audioBase64: string; contentType: string }> {
  await mockGate('synthesizeSpeech');
  // Rejects on purpose so callers use the browser speech fallback.
  throw new Error('Mock speech synthesis unavailable');
}

export async function getTimelineByNarrator(narratorId: string): Promise<LifeEvent[]> {
  await mockGate('getTimelineByNarrator');
  return copy(db().events.filter((e) => e.narrator_id === narratorId));
}

export async function createLifeEvent(narratorId: string, eventData: Partial<LifeEvent>): Promise<LifeEvent> {
  await mockGate('createLifeEvent');
  findNarrator(narratorId);
  const e: LifeEvent = {
    title: '', date_precision: 'unknown', ...eventData, id: newId('ev'), narrator_id: narratorId,
    extraction_status: eventData.extraction_status ?? 'confirmed', created_at: nowIso(),
  };
  db().events.push(e);
  return copy(e);
}

export async function updateLifeEventStatus(eventId: string, status: string): Promise<LifeEvent> {
  await mockGate('updateLifeEventStatus');
  const e = findEvent(eventId);
  e.extraction_status = status as LifeEvent['extraction_status'];
  return copy(e);
}

export async function deleteLifeEvent(eventId: string): Promise<void> {
  await mockGate('deleteLifeEvent');
  findEvent(eventId);
  db().events = db().events.filter((e) => e.id !== eventId);
}

export async function getStoryDrafts(narratorId: string): Promise<StoryDraft[]> {
  await mockGate('getStoryDrafts');
  return copy(db().drafts.filter((d) => d.narrator_id === narratorId));
}

export async function saveStoryDraft(narratorId: string, draftData: Partial<StoryDraft>): Promise<StoryDraft> {
  await mockGate('saveStoryDraft');
  findNarrator(narratorId);
  const now = nowIso();
  const d: StoryDraft = {
    title: '', language_code: 'ta', chapters: [], status: 'draft', ...draftData,
    id: newId('d'), narrator_id: narratorId, version: db().drafts.filter((x) => x.narrator_id === narratorId).length + 1,
    created_at: now, updated_at: now,
  };
  db().drafts.push(d);
  return copy(d);
}

export async function updateStoryDraft(draftId: string, draftData: Partial<StoryDraft>): Promise<StoryDraft> {
  await mockGate('updateStoryDraft');
  const d = db().drafts.find((x) => x.id === draftId);
  if (!d) throw new Error('Draft not found');
  Object.assign(d, copy(draftData), { id: d.id, narrator_id: d.narrator_id, updated_at: nowIso() });
  return copy(d);
}

export async function getExportPreview(payload: {
  narratorId: string;
  sessionIds?: string[];
  chapterIds?: string[];
  timelineEventIds?: string[];
  includeAudio?: boolean;
  language?: string;
  format?: string;
}): Promise<any> {
  await mockGate('getExportPreview');
  const n = findNarrator(payload.narratorId);
  const drafts = db().drafts.filter((d) => d.narrator_id === n.id);
  const chapters = drafts.flatMap((d) => d.chapters).filter((c) => !payload.chapterIds || payload.chapterIds.includes(c.id));
  const events = db().events.filter((e) => e.narrator_id === n.id && (!payload.timelineEventIds || payload.timelineEventIds.includes(e.id)));
  return copy({
    narrator: { id: n.id, name: n.full_name_tamil },
    chapterCount: chapters.length, eventCount: events.length, recordingCount: activeRecordingsForNarrator(n.id).length,
    includeAudio: !!payload.includeAudio, language: payload.language ?? 'ta', format: payload.format ?? 'text', chapters, events,
  });
}

export function getAudioUrl(filename: string): string {
  return blobUrlFor(filename) ?? MOCK_AUDIO;
}

export function getDownloadArchiveUrl(
  narratorId: string,
  format = 'text',
  chapterIds?: string[],
  timelineEventIds?: string[],
  language = 'ta'
): string {
  void [narratorId, format, chapterIds, timelineEventIds, language];
  return '#mock-download';
}

export async function getConsent(narratorId: string): Promise<ConsentRecord | null> {
  await mockGate('getConsent');
  const c = db().consents.find((x) => x.narrator_id === narratorId);
  return c ? copy(c) : null;
}

export async function recordConsent(narratorId: string, consentTextVersion: string): Promise<ConsentRecord> {
  await mockGate('recordConsent');
  findNarrator(narratorId);
  db().consents = db().consents.filter((x) => x.narrator_id !== narratorId);
  const c: ConsentRecord = { narrator_id: narratorId, consent_text_version: consentTextVersion, consented_at: nowIso() };
  db().consents.push(c);
  return copy(c);
}

export async function getTopicProgress(narratorId: string): Promise<TopicProgress[]> {
  await mockGate('getTopicProgress');
  const sessionIds = new Set(db().sessions.filter((s) => s.narrator_id === narratorId).map((s) => s.id));
  const answered = new Set(db().questions
    .filter((q) => sessionIds.has(q.session_id) && q.status === 'answered' && q.question_id)
    .map((q) => q.question_id));
  const stages = [...new Set(db().bank.filter((b) => b.is_enabled).map((b) => b.life_stage))];
  return stages.map((stage) => {
    const inStage = db().bank.filter((b) => b.is_enabled && b.life_stage === stage);
    return { life_stage: stage, total: inStage.length, answered: inStage.filter((b) => answered.has(b.id)).length };
  });
}

export async function generateStoryDraftFromSources(narratorId: string,
  languageCode: string,
  sources: { eventIds: string[]; recordingIds: string[] }): Promise<StoryDraft> {
  await mockGate('generateStoryDraftFromSources');
  const titles = db().events.filter((e) => sources.eventIds.includes(e.id)).map((e) => e.title);
  return buildDraft(narratorId, languageCode, sources.recordingIds, titles);
}

export async function updateProfile(input: ProfileInput): Promise<User> {
  await mockGate('updateProfile');
  if (!input.fullName.trim() || !input.email.trim()) throw new Error('Name and email are required');
  demoEmail = input.email.trim();
  demoProfile = { fullName: input.fullName.trim(), photo_url: input.photo_url ?? null };
  return demoUser();
}

export async function createArchiveExport(narratorId: string, kind: ArchiveKind): Promise<ArchiveExport> {
  await mockGate('createArchiveExport');
  findNarrator(narratorId);
  return { kind, status: 'ready', download_url: '#mock-download', size_bytes: kind === 'audio' ? 48_000_000 : 1_200_000 };
}
