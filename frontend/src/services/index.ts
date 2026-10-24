// Screens import data functions only from here. VITE_USE_MOCK=true selects the fake data layer.
import * as real from './api';
import * as mock from './mockApi';

// Compile-time check: the mock must keep the same signatures as the real api.
const _check: typeof real = mock;
void _check;

export const IS_MOCK: boolean = import.meta.env.VITE_USE_MOCK === 'true';

const impl: typeof real = IS_MOCK ? mock : real;

export const {
  loginUser, registerUser, getCurrentUser, getDashboardOverview,
  getNarrators, getNarratorById, createNarrator, updateNarrator, archiveNarrator,
  getAllSessions, getSessionById, createSession, updateSessionStatus,
  addQuestionToSession, updateQuestionStatus, getQuestionBank,
  getAllRecordings, uploadRecordingBlob,
  getTranscriptsByRecording, updateTranscript, regenerateTranscript, refineTranscriptProse,
  getAIFollowUpQuestions, extractMemoriesWithAI, generateStoryDraftWithAI, synthesizeSpeech,
  getTimelineByNarrator, createLifeEvent, updateLifeEventStatus, deleteLifeEvent,
  getStoryDrafts, saveStoryDraft, updateStoryDraft,
  getExportPreview, getAudioUrl, getDownloadArchiveUrl,
  getConsent, recordConsent, getTopicProgress, generateStoryDraftFromSources, createArchiveExport,
} = impl;
