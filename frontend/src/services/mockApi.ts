// Fake data layer with the same exports as api.ts. Bodies are filled in Task 2.
import type {
  User, Narrator, NarratorDetail, NarratorInput, InterviewSession, BankQuestion, SessionQuestion,
  Recording, Transcript, LifeEvent, StoryDraft, DashboardOverview,
  ConsentRecord, TopicProgress, ArchiveKind, ArchiveExport,
} from '../types';

const notImplemented = (): never => {
  throw new Error('mock: not implemented');
};

export async function loginUser(email: string, password?: string, fullName?: string): Promise<{ user: User; token: string }> {
  return notImplemented();
}

export async function registerUser(fullName: string, email: string, password?: string): Promise<{ user: User; token: string }> {
  return notImplemented();
}

export async function getCurrentUser(): Promise<User | null> {
  return notImplemented();
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  return notImplemented();
}

export async function getNarrators(params?: { createdBy?: string; all?: boolean }): Promise<Narrator[]> {
  return notImplemented();
}

export async function getNarratorById(id: string): Promise<NarratorDetail> {
  return notImplemented();
}

export async function createNarrator(input: NarratorInput): Promise<Narrator> {
  return notImplemented();
}

export async function updateNarrator(id: string, input: Partial<NarratorInput>): Promise<Narrator> {
  return notImplemented();
}

export async function archiveNarrator(id: string): Promise<void> {
  return notImplemented();
}

export async function getAllSessions(narratorId?: string): Promise<InterviewSession[]> {
  return notImplemented();
}

export async function getSessionById(id: string): Promise<InterviewSession> {
  return notImplemented();
}

export async function createSession(payload: {
  narrator_id: string;
  session_number?: number;
  title: string;
  interview_mode: string;
  preferred_language: string;
  notes?: string;
}): Promise<InterviewSession> {
  return notImplemented();
}

export async function updateSessionStatus(id: string, status: string): Promise<InterviewSession> {
  return notImplemented();
}

export async function addQuestionToSession(sessionId: string, payload: {
  question_tamil: string;
  question_english?: string;
  question_type?: string;
  question_id?: string;
}): Promise<SessionQuestion> {
  return notImplemented();
}

export async function updateQuestionStatus(questionId: string, status: string): Promise<SessionQuestion> {
  return notImplemented();
}

export async function getQuestionBank(category?: string): Promise<{ categories: string[]; data: BankQuestion[] }> {
  return notImplemented();
}

export async function getAllRecordings(params?: {
  narrator_id?: string;
  session_id?: string;
  status?: string;
  createdBy?: string;
  user_email?: string;
  sort?: 'asc' | 'desc';
}): Promise<Recording[]> {
  return notImplemented();
}

export async function uploadRecordingBlob(sessionQuestionId: string,
  audioBlob: Blob,
  durationSeconds: number,
  transcriptText?: string): Promise<Recording> {
  return notImplemented();
}

export async function getTranscriptsByRecording(recordingId: string): Promise<Transcript[]> {
  return notImplemented();
}

export async function updateTranscript(transcriptId: string, transcriptText: string, isReviewed = true): Promise<Transcript> {
  return notImplemented();
}

export async function regenerateTranscript(recordingId: string): Promise<Transcript> {
  return notImplemented();
}

export async function refineTranscriptProse(text: string): Promise<{ refined_text: string; refined_english?: string }> {
  return notImplemented();
}

export async function getAIFollowUpQuestions(payload: {
  question: string;
  answer?: string;
  narrator_name?: string;
}): Promise<Array<{ tamil: string; english: string; theme: string }>> {
  return notImplemented();
}

export async function extractMemoriesWithAI(narratorId: string): Promise<LifeEvent[]> {
  return notImplemented();
}

export async function generateStoryDraftWithAI(narratorId: string, languageCode = 'ta'): Promise<StoryDraft> {
  return notImplemented();
}

export async function synthesizeSpeech(text: string,
  speaker = 'indian_female',
  targetLang?: string): Promise<{ audioBase64: string; contentType: string }> {
  return notImplemented();
}

export async function getTimelineByNarrator(narratorId: string): Promise<LifeEvent[]> {
  return notImplemented();
}

export async function createLifeEvent(narratorId: string, eventData: Partial<LifeEvent>): Promise<LifeEvent> {
  return notImplemented();
}

export async function updateLifeEventStatus(eventId: string, status: string): Promise<LifeEvent> {
  return notImplemented();
}

export async function deleteLifeEvent(eventId: string): Promise<void> {
  return notImplemented();
}

export async function getStoryDrafts(narratorId: string): Promise<StoryDraft[]> {
  return notImplemented();
}

export async function saveStoryDraft(narratorId: string, draftData: Partial<StoryDraft>): Promise<StoryDraft> {
  return notImplemented();
}

export async function updateStoryDraft(draftId: string, draftData: Partial<StoryDraft>): Promise<StoryDraft> {
  return notImplemented();
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
  return notImplemented();
}

export function getAudioUrl(filename: string): string {
  return filename;
}

export function getDownloadArchiveUrl(
  narratorId: string,
  format = 'text',
  chapterIds?: string[],
  timelineEventIds?: string[],
  language = 'ta'
): string {
  void [narratorId, format, chapterIds, timelineEventIds, language];
  return '#';
}

export async function getConsent(_narratorId: string): Promise<ConsentRecord | null> {
  return notImplemented();
}

export async function recordConsent(_narratorId: string, _consentTextVersion: string): Promise<ConsentRecord> {
  return notImplemented();
}

export async function getTopicProgress(_narratorId: string): Promise<TopicProgress[]> {
  return notImplemented();
}

export async function generateStoryDraftFromSources(_narratorId: string,
  _languageCode: string,
  _sources: { eventIds: string[]; recordingIds: string[] }): Promise<StoryDraft> {
  return notImplemented();
}

export async function createArchiveExport(_narratorId: string, _kind: ArchiveKind): Promise<ArchiveExport> {
  return notImplemented();
}
