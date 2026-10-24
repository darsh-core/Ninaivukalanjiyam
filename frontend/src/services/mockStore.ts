// In-memory state and helpers behind mockApi.ts. Controls (reset, delay, error flag) live here, not in mockApi.
import type {
  Narrator, InterviewSession, BankQuestion, SessionQuestion, Recording, Transcript, LifeEvent, StoryDraft, ConsentRecord,
} from '../types';
import {
  seedBank, seedNarrators, seedConsents, seedSessions, seedSessionQuestions, seedRecordings, seedTranscripts, seedEvents, seedDrafts,
  type SeedTranscript,
} from './mockData';

interface StoredRecording {
  id: string; session_question_id: string; version_number: number; storage_key: string; original_filename: string;
  mime_type: string; file_size_bytes: number; duration_seconds: number; status: Recording['status']; is_active: boolean; created_at: string;
}
interface StoredQuestion {
  id: string; session_id: string; question_id: string | null; question_tamil: string; question_english: string | null;
  question_type: SessionQuestion['question_type']; display_order: number; status: SessionQuestion['status'];
  asked_at: string | null; answered_at: string | null;
}
interface State {
  narrators: Narrator[];
  sessions: Omit<InterviewSession, 'questions'>[];
  questions: StoredQuestion[];
  recordings: StoredRecording[];
  transcripts: SeedTranscript[];
  events: LifeEvent[];
  drafts: StoryDraft[];
  consents: ConsentRecord[];
  bank: BankQuestion[];
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function buildSeed(): State {
  const bank = clone(seedBank);
  const byId = new Map(bank.map((b) => [b.id, b]));
  const questions: StoredQuestion[] = seedSessionQuestions.map((q) => {
    const b = byId.get(q.question_id)!;
    return {
      id: q.id, session_id: q.session_id, question_id: q.question_id, question_tamil: b.question_tamil,
      question_english: b.question_english, question_type: 'structured', display_order: q.display_order, status: q.status,
      asked_at: q.status === 'pending' ? null : '2026-09-03T10:00:00Z', answered_at: q.status === 'answered' ? '2026-09-03T10:30:00Z' : null,
    };
  });
  const recordings: StoredRecording[] = seedRecordings.map((r) => ({
    id: r.id, session_question_id: r.session_question_id, version_number: r.version_number, storage_key: `mock/${r.id}.wav`,
    original_filename: `${r.id}.wav`, mime_type: 'audio/wav', file_size_bytes: r.duration_seconds * 16000,
    duration_seconds: r.duration_seconds, status: 'saved', is_active: r.is_active, created_at: r.created_at,
  }));
  return {
    narrators: clone(seedNarrators), sessions: clone(seedSessions), questions, recordings, transcripts: clone(seedTranscripts),
    events: clone(seedEvents), drafts: clone(seedDrafts), consents: clone(seedConsents), bank,
  };
}

let state: State = buildSeed();
let delayOverride: number | null = null;
let idCounter = 0;
const blobUrls = new Map<string, string>();

export function resetMockStore(): void {
  state = buildSeed();
  idCounter = 0;
  blobUrls.forEach((u) => { try { URL.revokeObjectURL(u); } catch { /* ignore */ } });
  blobUrls.clear();
}

export function setMockDelay(ms: number): void {
  delayOverride = ms;
}

export function getMockErrorFlag(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('mockError');
}

// Awaited at the top of each mock function: simulates latency and the ?mockError=<fnName> failure switch.
export async function mockGate(fnName: string): Promise<void> {
  const ms = delayOverride ?? 300 + Math.random() * 500;
  if (ms > 0) await new Promise((r) => setTimeout(r, ms));
  if (getMockErrorFlag() === fnName) throw new Error(`Mock error: ${fnName}`);
}

export const copy = clone;
export const nowIso = (): string => new Date().toISOString();
export const newId = (prefix: string): string => `${prefix}-${Date.now().toString(36)}-${++idCounter}`;
export const db = (): State => state;

export function rememberBlob(key: string, blob: Blob): void {
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') blobUrls.set(key, URL.createObjectURL(blob));
}
export const blobUrlFor = (key: string): string | undefined => blobUrls.get(key);

export function latestTranscript(recordingId: string): SeedTranscript | undefined {
  return state.transcripts.filter((t) => t.recording_id === recordingId).sort((a, b) => b.version_number - a.version_number)[0];
}

export function toTranscript(t: SeedTranscript): Transcript {
  return {
    id: t.id, recording_id: t.recording_id, version_number: t.version_number, transcript_text: t.transcript_text,
    transcript_text_english: t.transcript_text_english ?? null, language_code: 'ta', source: t.source, status: t.status,
    reviewed_at: t.reviewed_at ?? null, job_status: t.job_status, created_at: t.created_at,
  };
}

export function narratorOfSession(sessionId: string): Narrator | undefined {
  const s = state.sessions.find((x) => x.id === sessionId);
  return s ? state.narrators.find((n) => n.id === s.narrator_id) : undefined;
}

export function hydrateRecording(r: StoredRecording): Recording {
  const q = state.questions.find((x) => x.id === r.session_question_id)!;
  const s = state.sessions.find((x) => x.id === q.session_id)!;
  const n = state.narrators.find((x) => x.id === s.narrator_id)!;
  const t = latestTranscript(r.id);
  return copy({
    ...r,
    question_tamil: q.question_tamil, question_english: q.question_english ?? undefined,
    session_id: s.id, session_title: s.title, session_number: s.session_number,
    narrator_id: n.id, full_name_tamil: n.full_name_tamil ?? undefined, full_name_english: n.full_name_english ?? undefined,
    preferred_name: n.preferred_name ?? undefined, created_by: s.created_by ?? null, creator_name: n.creator_name ?? null,
    creator_email: n.creator_email ?? null,
    transcript_id: t?.id, transcript_text: t?.transcript_text, transcript_text_english: t?.transcript_text_english ?? null,
    transcript_source: t?.source, transcript_reviewed_at: t?.reviewed_at ?? null, transcript_job_status: t?.job_status,
  });
}

export function hydrateQuestion(q: StoredQuestion): SessionQuestion {
  const rec = state.recordings.find((r) => r.session_question_id === q.id && r.is_active);
  const t = rec ? latestTranscript(rec.id) : undefined;
  return copy({
    ...q,
    recording_id: rec?.id ?? null, storage_key: rec?.storage_key ?? null, duration_seconds: rec?.duration_seconds ?? null,
    recording_version: rec?.version_number ?? null, recording_status: rec?.status ?? null,
    transcript_id: t?.id ?? null, transcript_text: t?.transcript_text ?? null, transcript_text_english: t?.transcript_text_english ?? null,
    transcript_source: t?.source ?? null, transcript_reviewed_at: t?.reviewed_at ?? null, transcript_job_status: t?.job_status,
  });
}

export function hydrateSession(s: Omit<InterviewSession, 'questions'>): InterviewSession {
  const qs = state.questions.filter((q) => q.session_id === s.id).sort((a, b) => a.display_order - b.display_order);
  const n = state.narrators.find((x) => x.id === s.narrator_id);
  const recCount = state.recordings.filter((r) => r.is_active && qs.some((q) => q.id === r.session_question_id)).length;
  return copy({
    ...s,
    full_name_tamil: n?.full_name_tamil ?? undefined, full_name_english: n?.full_name_english ?? undefined,
    preferred_name: n?.preferred_name ?? undefined, creator_name: n?.creator_name ?? null, creator_email: n?.creator_email ?? null,
    question_count: qs.length, answered_count: qs.filter((q) => q.status === 'answered').length, recording_count: recCount,
    questions: qs.map(hydrateQuestion),
  });
}

export function hydrateNarrator(n: Narrator): Narrator {
  const sessions = state.sessions.filter((s) => s.narrator_id === n.id).sort((a, b) => a.started_at.localeCompare(b.started_at));
  const qIds = new Set(state.questions.filter((q) => sessions.some((s) => s.id === q.session_id)).map((q) => q.id));
  const last = sessions[sessions.length - 1];
  return copy({
    ...n,
    session_count: sessions.length,
    recording_count: state.recordings.filter((r) => r.is_active && qIds.has(r.session_question_id)).length,
    event_count: state.events.filter((e) => e.narrator_id === n.id).length,
    last_session_title: last?.title ?? null, last_session_date: last?.last_activity_at ?? null,
  });
}

export function activeRecordingsForNarrator(narratorId: string): Recording[] {
  return state.recordings
    .filter((r) => r.is_active && narratorOfSession(state.questions.find((q) => q.id === r.session_question_id)!.session_id)?.id === narratorId)
    .map(hydrateRecording);
}
