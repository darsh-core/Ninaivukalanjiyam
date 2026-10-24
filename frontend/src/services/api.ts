import type {
  User,
  Narrator,
  NarratorDetail,
  NarratorInput,
  InterviewSession,
  BankQuestion,
  SessionQuestion,
  Recording,
  Transcript,
  LifeEvent,
  StoryDraft,
  DashboardOverview,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5002/api' : '/api');

// Auth
export async function loginUser(email: string, password?: string, fullName?: string): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, fullName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data;
}

export async function registerUser(fullName: string, email: string, password?: string): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Registration failed');
  return data;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const token = localStorage.getItem('nk_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/auth/me`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

// Dashboard
export async function getDashboardOverview(): Promise<DashboardOverview> {
  const res = await fetch(`${API_BASE}/dashboard/overview`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch dashboard data');
  return data.data;
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem('nk_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Narrators
export async function getNarrators(params?: { createdBy?: string; all?: boolean }): Promise<Narrator[]> {
  const searchParams = new URLSearchParams();
  if (params?.createdBy) searchParams.set('createdBy', params.createdBy);
  if (params?.all) searchParams.set('all', 'true');
  const qs = searchParams.toString();
  const url = qs ? `${API_BASE}/narrators?${qs}` : `${API_BASE}/narrators`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch narrators');
  return data.data;
}

export async function getNarratorById(id: string): Promise<NarratorDetail> {
  const res = await fetch(`${API_BASE}/narrators/${id}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch narrator details');
  return data.data;
}

export async function createNarrator(input: NarratorInput): Promise<Narrator> {
  const res = await fetch(`${API_BASE}/narrators`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create narrator');
  return data.data;
}

export async function updateNarrator(id: string, input: Partial<NarratorInput>): Promise<Narrator> {
  const res = await fetch(`${API_BASE}/narrators/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update narrator');
  return data.data;
}

export async function archiveNarrator(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/narrators/${id}/archive`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to archive narrator');
}

// Interview Sessions
export async function getAllSessions(narratorId?: string): Promise<InterviewSession[]> {
  const url = narratorId ? `${API_BASE}/sessions?narrator_id=${narratorId}` : `${API_BASE}/sessions`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch sessions');
  return data.data;
}

export async function getSessionById(id: string): Promise<InterviewSession> {
  const res = await fetch(`${API_BASE}/sessions/${id}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch session');
  return data.data;
}

export async function createSession(payload: {
  narrator_id: string;
  session_number?: number;
  title: string;
  interview_mode: string;
  preferred_language: string;
  notes?: string;
}): Promise<InterviewSession> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to start interview session');
  return data.data;
}

export async function updateSessionStatus(id: string, status: string): Promise<InterviewSession> {
  const res = await fetch(`${API_BASE}/sessions/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update session status');
  return data.data;
}

export async function addQuestionToSession(sessionId: string, payload: {
  question_tamil: string;
  question_english?: string;
  question_type?: string;
  question_id?: string;
}): Promise<SessionQuestion> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to add question');
  return data.data;
}

export async function updateQuestionStatus(questionId: string, status: string): Promise<SessionQuestion> {
  const res = await fetch(`${API_BASE}/sessions/questions/${questionId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update question status');
  return data.data;
}

// Question Bank
export async function getQuestionBank(category?: string): Promise<{ categories: string[]; data: BankQuestion[] }> {
  const url = category ? `${API_BASE}/questions?category=${encodeURIComponent(category)}` : `${API_BASE}/questions`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch question bank');
  return { categories: data.categories || [], data: data.data || [] };
}

// Recordings
export async function getAllRecordings(params?: {
  narrator_id?: string;
  session_id?: string;
  status?: string;
  createdBy?: string;
  user_email?: string;
  sort?: 'asc' | 'desc';
}): Promise<Recording[]> {
  const searchParams = new URLSearchParams();
  if (params?.narrator_id) searchParams.append('narrator_id', params.narrator_id);
  if (params?.session_id) searchParams.append('session_id', params.session_id);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.createdBy) searchParams.append('createdBy', params.createdBy);
  if (params?.user_email) searchParams.append('user_email', params.user_email);
  if (params?.sort) searchParams.append('sort', params.sort);

  const res = await fetch(`${API_BASE}/recordings?${searchParams.toString()}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch recordings');
  return data.data;
}

export async function uploadRecordingBlob(
  sessionQuestionId: string,
  audioBlob: Blob,
  durationSeconds: number,
  transcriptText?: string
): Promise<Recording> {
  const formData = new FormData();
  formData.append('audio_file', audioBlob, `recording_${Date.now()}.webm`);
  formData.append('session_question_id', sessionQuestionId);
  formData.append('duration_seconds', durationSeconds.toString());
  if (transcriptText) {
    formData.append('transcript_text', transcriptText);
  }

  const res = await fetch(`${API_BASE}/recordings/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to save recording');
  return data.data;
}

// Transcripts
export async function getTranscriptsByRecording(recordingId: string): Promise<Transcript[]> {
  const res = await fetch(`${API_BASE}/transcripts/by-recording/${recordingId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch transcripts');
  return data.data;
}

export async function updateTranscript(transcriptId: string, transcriptText: string, isReviewed = true): Promise<Transcript> {
  const res = await fetch(`${API_BASE}/transcripts/${transcriptId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript_text: transcriptText, is_reviewed: isReviewed }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to save transcript corrections');
  return data.data;
}

export async function regenerateTranscript(recordingId: string): Promise<Transcript> {
  const res = await fetch(`${API_BASE}/transcripts/by-recording/${recordingId}/regenerate`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to regenerate transcript');
  return data.data;
}

export async function refineTranscriptProse(text: string): Promise<{ refined_text: string; refined_english?: string }> {
  const res = await fetch(`${API_BASE}/transcripts/refine-prose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to refine transcript text');
  return data;
}

// AI Services
export async function getAIFollowUpQuestions(payload: {
  question: string;
  answer?: string;
  narrator_name?: string;
}): Promise<Array<{ tamil: string; english: string; theme: string }>> {
  const res = await fetch(`${API_BASE}/ai/follow-up-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to get follow-up suggestions');
  return data.suggestions || [];
}

export async function extractMemoriesWithAI(narratorId: string): Promise<LifeEvent[]> {
  const res = await fetch(`${API_BASE}/ai/narrators/${narratorId}/extract-memories`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to extract memories');
  return data.data || [];
}

export async function generateStoryDraftWithAI(narratorId: string, languageCode = 'ta'): Promise<StoryDraft> {
  const res = await fetch(`${API_BASE}/ai/narrators/${narratorId}/generate-story-draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language_code: languageCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to generate biography draft');
  return data.data;
}

export async function synthesizeSpeech(
  text: string,
  speaker = 'indian_female',
  targetLang?: string
): Promise<{ audioBase64: string; contentType: string }> {
  const res = await fetch(`${API_BASE}/ai/text-to-speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speaker, targetLang }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to synthesize speech');
  return data;
}

// Timeline & Memories
export async function getTimelineByNarrator(narratorId: string): Promise<LifeEvent[]> {
  const res = await fetch(`${API_BASE}/timeline/narrators/${narratorId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch life timeline');
  return data.data;
}

export async function createLifeEvent(narratorId: string, eventData: Partial<LifeEvent>): Promise<LifeEvent> {
  const res = await fetch(`${API_BASE}/timeline/narrators/${narratorId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create life event');
  return data.data;
}

export async function updateLifeEventStatus(eventId: string, status: string): Promise<LifeEvent> {
  const res = await fetch(`${API_BASE}/timeline/events/${eventId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update event status');
  return data.data;
}

export async function deleteLifeEvent(eventId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/timeline/events/${eventId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete event');
}

// Story Drafts
export async function getStoryDrafts(narratorId: string): Promise<StoryDraft[]> {
  const res = await fetch(`${API_BASE}/stories/narrators/${narratorId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch story drafts');
  return data.data;
}

export async function saveStoryDraft(narratorId: string, draftData: Partial<StoryDraft>): Promise<StoryDraft> {
  const res = await fetch(`${API_BASE}/stories/narrators/${narratorId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draftData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to save story draft');
  return data.data;
}

export async function updateStoryDraft(draftId: string, draftData: Partial<StoryDraft>): Promise<StoryDraft> {
  const res = await fetch(`${API_BASE}/stories/drafts/${draftId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draftData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update story draft');
  return data.data;
}

// Export
export async function getExportPreview(payload: {
  narratorId: string;
  sessionIds?: string[];
  chapterIds?: string[];
  timelineEventIds?: string[];
  includeAudio?: boolean;
  language?: string;
  format?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/export/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to prepare export preview');
  return data.preview;
}

export function getAudioUrl(filename: string): string {
  if (!filename) return '';
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  return `${API_BASE}/audio-stream?file=${encodeURIComponent(filename)}`;
}

export function getDownloadArchiveUrl(
  narratorId: string, 
  format = 'text', 
  chapterIds?: string[], 
  timelineEventIds?: string[],
  language = 'ta'
): string {
  const params = new URLSearchParams({ format, language });
  if (chapterIds && chapterIds.length > 0) {
    params.append('chapterIds', chapterIds.join(','));
  }
  if (timelineEventIds && timelineEventIds.length > 0) {
    params.append('timelineEventIds', timelineEventIds.join(','));
  }
  return `${API_BASE}/export/download/${narratorId}?${params.toString()}`;
}
