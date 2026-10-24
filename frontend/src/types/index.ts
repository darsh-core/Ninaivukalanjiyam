export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'assistant';
  // TODO(api): users have no profile photo on the backend yet
  photo_url?: string | null;
}

export interface ProfileInput {
  fullName: string;
  email: string;
  photo_url?: string | null;
}

export interface Narrator {
  id: string;
  full_name_tamil: string | null;
  full_name_english: string | null;
  preferred_name: string | null;
  birth_year: number | null;
  place_of_birth: string | null;
  preferred_language: string;
  tamil_dialect: string | null;
  profile_photo_url: string | null;
  status: string;
  created_at?: string;
  created_by?: string | null;
  creator_name?: string | null;
  creator_email?: string | null;
  session_count?: number;
  recording_count?: number;
  event_count?: number;
  last_session_title?: string | null;
  last_session_date?: string | null;
  // TODO(api): handwritten "next up" note shown on the photo frame
  photo_frame_note?: string | null;
}

export interface NarratorDetail extends Narrator {
  sessions: InterviewSession[];
  timeline: LifeEvent[];
  recordings: Recording[];
  drafts: StoryDraft[];
}

export interface NarratorInput {
  full_name_tamil: string;
  full_name_english: string;
  preferred_name: string;
  birth_year: string;
  place_of_birth: string;
  preferred_language: string;
  tamil_dialect: string;
  profile_photo_url?: string;
  created_by?: string;
}

export interface InterviewSession {
  id: string;
  narrator_id: string;
  session_number: number;
  title: string;
  interview_mode: 'structured' | 'intelligent' | 'free_storytelling';
  preferred_language: string;
  status: 'in_progress' | 'paused' | 'completed' | 'abandoned';
  notes?: string | null;
  started_at: string;
  ended_at?: string | null;
  last_activity_at: string;
  created_by?: string | null;
  creator_name?: string | null;
  creator_email?: string | null;
  full_name_tamil?: string;
  full_name_english?: string;
  preferred_name?: string;
  question_count?: number;
  answered_count?: number;
  recording_count?: number;
  questions?: SessionQuestion[];
}

export interface BankQuestion {
  id: string;
  category: string;
  life_stage: string;
  question_tamil: string;
  question_english: string;
  display_order: number;
  is_enabled: boolean;
}

export interface SessionQuestion {
  id: string;
  session_id: string;
  question_id?: string | null;
  question_tamil: string;
  question_english?: string | null;
  question_type: 'structured' | 'follow_up' | 'free_storytelling';
  display_order: number;
  status: 'pending' | 'asked' | 'answered' | 'skipped';
  asked_at?: string | null;
  answered_at?: string | null;
  recording_id?: string | null;
  storage_key?: string | null;
  duration_seconds?: number | null;
  recording_version?: number | null;
  recording_status?: string | null;
  transcript_id?: string | null;
  transcript_text?: string | null;
  transcript_text_english?: string | null;
  transcript_source?: string | null;
  transcript_reviewed_at?: string | null;
  // TODO(api): transcription job state
  transcript_job_status?: TranscriptJobStatus;
}

export interface Recording {
  id: string;
  session_question_id: string;
  version_number: number;
  storage_key: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  duration_seconds: number;
  status: 'uploading' | 'saved' | 'processing' | 'failed';
  is_active: boolean;
  created_at: string;
  question_tamil?: string;
  question_english?: string;
  session_id?: string;
  session_title?: string;
  session_number?: number;
  narrator_id?: string;
  full_name_tamil?: string;
  full_name_english?: string;
  preferred_name?: string;
  created_by?: string | null;
  creator_name?: string | null;
  creator_email?: string | null;
  transcript_id?: string;
  transcript_text?: string;
  transcript_text_english?: string | null;
  transcript_source?: string;
  transcript_reviewed_at?: string | null;
  // TODO(api): transcription job state
  transcript_job_status?: TranscriptJobStatus;
}

export interface Transcript {
  id: string;
  recording_id: string;
  version_number: number;
  transcript_text: string;
  transcript_text_english?: string | null;
  language_code: string;
  source: 'speech_to_text' | 'manual' | 'corrected';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reviewed_at?: string | null;
  // TODO(api): transcription job state
  job_status?: TranscriptJobStatus;
  created_at: string;
}

export interface LifeEvent {
  id: string;
  narrator_id: string;
  title: string;
  title_tamil?: string | null;
  title_english?: string | null;
  description?: string | null;
  description_english?: string | null;
  approximate_year?: number | null;
  date_precision: 'exact' | 'year' | 'approximate' | 'relative' | 'unknown';
  event_type?: string | null;
  place_name?: string | null;
  extraction_status: 'unreviewed' | 'confirmed' | 'corrected' | 'rejected';
  created_at: string;
  recording_id?: string | null;
  storage_key?: string | null;
  duration_seconds?: number | null;
  source_excerpt?: string | null;
}

export interface StoryChapter {
  id: string;
  title: string;
  content: string;
  chapter_number?: number;
  title_english?: string;
  recording_ids?: string[];
  status?: string;
}

export interface StoryDraft {
  id: string;
  narrator_id: string;
  title: string;
  language_code: string;
  version: number;
  chapters: StoryChapter[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  totalNarrators: number;
  interviewSessions: number;
  storiesRecorded: number;
  pendingTranscripts: number;
  memoriesCollected: number;
}

export interface DashboardOverview {
  metrics: DashboardMetrics;
  recentNarrators: Narrator[];
  unfinishedSession: InterviewSession | null;
  recentStories: Recording[];
  recentActivities: Array<{
    id: string;
    type: string;
    text: string;
    time: string;
  }>;
}


export type TranscriptJobStatus = 'queued' | 'processing' | 'done' | 'needs_review' | 'failed';

export interface ConsentRecord {
  narrator_id: string;
  consent_text_version: string;
  consented_at: string;
}

export interface TopicProgress {
  life_stage: string;
  total: number;
  answered: number;
}

export type ArchiveKind = 'audio' | 'transcripts' | 'full';

export interface ArchiveExport {
  kind: ArchiveKind;
  status: 'ready';
  download_url: string;
  size_bytes: number;
}
