// Declarative seed data for the mock API. Plain objects only; behaviour lives in mockStore.ts.
// Ids are stable: screens and tests reference them directly.
import type {
  Narrator, InterviewSession, BankQuestion, LifeEvent, StoryDraft, ConsentRecord, TranscriptJobStatus,
} from '../types';

export const DEMO_USER = { id: 'u-demo', fullName: 'அன்பரசன்', email: 'demo@family.test', role: 'assistant' as const };

export const STAGE_CHILDHOOD = 'Early Years';
export const STAGE_SCHOOL = 'Education';
export const STAGE_WORK = 'Adult';
export const STAGE_FAMILY = 'Family';
// Backend shape: category is an English topic name, life_stage an English stage. Tamil labels come from a UI label map.
const CATEGORY: Record<string, string> = {
  'Early Years': 'Childhood', Education: 'School days', Adult: 'Career', Family: 'Parents and siblings',
};

const bq = (id: string, stage: string, order: number, ta: string, en: string): BankQuestion => ({
  id, category: CATEGORY[stage], life_stage: stage, question_tamil: ta, question_english: en, display_order: order, is_enabled: true,
});

export const seedBank: BankQuestion[] = [
  bq('b-c1', STAGE_CHILDHOOD, 1, 'நீங்கள் எந்த ஊரில் பிறந்தீர்கள்? அந்த ஊரைப் பற்றிச் சொல்லுங்கள்.', 'Where were you born? Tell us about that place.'),
  bq('b-c2', STAGE_CHILDHOOD, 2, 'உங்கள் சிறுவயது வீடு எப்படி இருந்தது?', 'What was your childhood home like?'),
  bq('b-c3', STAGE_CHILDHOOD, 3, 'சிறுவயதில் நீங்கள் விளையாடிய விளையாட்டுகள் என்ன?', 'What games did you play as a child?'),
  bq('b-c4', STAGE_CHILDHOOD, 4, 'உங்கள் அம்மா அல்லது அப்பா சொன்ன ஒரு கதை நினைவிருக்கிறதா?', 'Do you remember a story your mother or father told you?'),
  bq('b-c5', STAGE_CHILDHOOD, 5, 'சிறுவயதில் பண்டிகைகள் எப்படிக் கொண்டாடப்பட்டன?', 'How were festivals celebrated when you were a child?'),
  bq('b-s1', STAGE_SCHOOL, 1, 'உங்கள் முதல் பள்ளி நாள் நினைவிருக்கிறதா?', 'Do you remember your first day at school?'),
  bq('b-s2', STAGE_SCHOOL, 2, 'உங்களுக்குப் பிடித்த ஆசிரியர் யார்? ஏன்?', 'Who was your favourite teacher, and why?'),
  bq('b-s3', STAGE_SCHOOL, 3, 'பள்ளிக்கு எப்படிப் போவீர்கள்?', 'How did you get to school?'),
  bq('b-s4', STAGE_SCHOOL, 4, 'பள்ளியில் உங்கள் நண்பர்களைப் பற்றிச் சொல்லுங்கள்.', 'Tell us about your friends at school.'),
  bq('b-w1', STAGE_WORK, 1, 'உங்கள் முதல் வேலை என்ன? அதை எப்படிப் பெற்றீர்கள்?', 'What was your first job, and how did you get it?'),
  bq('b-w2', STAGE_WORK, 2, 'ஒரு சாதாரண வேலை நாள் எப்படி இருக்கும்?', 'What was an ordinary working day like?'),
  bq('b-w3', STAGE_WORK, 3, 'வேலையில் நீங்கள் மிகவும் பெருமைப்பட்ட தருணம் எது?', 'What moment at work made you proudest?'),
  bq('b-w4', STAGE_WORK, 4, 'வேலையில் சந்தித்த கடினமான காலம் எது?', 'What was the hardest time you faced at work?'),
  bq('b-w5', STAGE_WORK, 5, 'உங்களுடன் வேலை செய்தவர்களில் மறக்க முடியாதவர் யார்?', 'Who is the unforgettable person you worked with?'),
  bq('b-f1', STAGE_FAMILY, 1, 'உங்கள் திருமணம் எப்படி நடந்தது?', 'How did your wedding take place?'),
  bq('b-f2', STAGE_FAMILY, 2, 'உங்கள் குழந்தைகள் பிறந்த நாட்களை நினைவுகூருங்கள்.', 'Recall the days your children were born.'),
  bq('b-f3', STAGE_FAMILY, 3, 'உங்கள் குடும்பத்தில் கடைப்பிடிக்கும் பழக்கவழக்கங்கள் என்ன?', 'What customs does your family follow?'),
  bq('b-f4', STAGE_FAMILY, 4, 'உங்கள் பேரப்பிள்ளைகளுக்கு என்ன சொல்ல விரும்புகிறீர்கள்?', 'What would you like to tell your grandchildren?'),
  bq('b-f5', STAGE_FAMILY, 5, 'குடும்பத்தில் மறக்க முடியாத ஒரு உணவு எது?', 'Which dish in your family is unforgettable?'),
  bq('b-f6', STAGE_FAMILY, 6, 'வாழ்க்கையில் நீங்கள் கற்ற மிக முக்கியமான பாடம் என்ன?', 'What is the most important lesson life has taught you?'),
];

export const seedNarrators: Narrator[] = [
  {
    id: 'n-rajeshwari', full_name_tamil: 'ராஜேஸ்வரி பாட்டி', full_name_english: 'Rajeshwari', preferred_name: 'பாட்டி',
    birth_year: 1948, place_of_birth: 'ஈரோடு', preferred_language: 'ta', tamil_dialect: 'கொங்கு', profile_photo_url: null,
    status: 'active', created_at: '2026-09-02T10:00:00Z', created_by: 'u-demo', creator_name: 'அன்பரசன்', creator_email: 'demo@family.test',
    photo_frame_note: 'அடுத்து: வேலை நாட்கள்',
  },
  {
    id: 'n-shanmugam', full_name_tamil: 'சண்முகம் தாத்தா', full_name_english: 'Shanmugam', preferred_name: 'தாத்தா',
    birth_year: 1945, place_of_birth: 'மதுரை', preferred_language: 'ta', tamil_dialect: 'மதுரை', profile_photo_url: null,
    status: 'active', created_at: '2026-09-20T09:00:00Z', created_by: 'u-demo', creator_name: 'அன்பரசன்', creator_email: 'demo@family.test',
    photo_frame_note: null,
  },
  {
    id: 'n-new', full_name_tamil: 'கமலா அம்மாள்', full_name_english: 'Kamala', preferred_name: 'அம்மாள்',
    birth_year: 1952, place_of_birth: 'சேலம்', preferred_language: 'ta', tamil_dialect: null, profile_photo_url: null,
    status: 'active', created_at: '2026-10-20T08:00:00Z', created_by: 'u-demo', creator_name: 'அன்பரசன்', creator_email: 'demo@family.test',
    photo_frame_note: null,
  },
];

export const seedConsents: ConsentRecord[] = [
  { narrator_id: 'n-rajeshwari', consent_text_version: 'v1', consented_at: '2026-09-02T10:05:00Z' },
];

export const seedSessions: Omit<InterviewSession, 'questions'>[] = [
  {
    id: 's-r1', narrator_id: 'n-rajeshwari', session_number: 1, title: 'சிறுவயது நினைவுகள்', interview_mode: 'structured',
    preferred_language: 'ta', status: 'completed', notes: null, started_at: '2026-09-03T10:00:00Z', ended_at: '2026-09-03T11:10:00Z',
    last_activity_at: '2026-09-03T11:10:00Z', created_by: 'u-demo',
  },
  {
    id: 's-r2', narrator_id: 'n-rajeshwari', session_number: 2, title: 'வேலை நாட்கள்', interview_mode: 'structured',
    preferred_language: 'ta', status: 'in_progress', notes: null, started_at: '2026-10-18T16:00:00Z', ended_at: null,
    last_activity_at: '2026-10-18T16:30:00Z', created_by: 'u-demo',
  },
  {
    id: 's-m1', narrator_id: 'n-shanmugam', session_number: 1, title: 'மதுரை நாட்கள்', interview_mode: 'structured',
    preferred_language: 'ta', status: 'completed', notes: null, started_at: '2026-09-21T10:00:00Z', ended_at: '2026-09-21T10:40:00Z',
    last_activity_at: '2026-09-21T10:40:00Z', created_by: 'u-demo',
  },
];

// Session questions reference bank questions by id; the store fills the Tamil/English text from the bank.
export interface SeedSessionQuestion {
  id: string;
  session_id: string;
  question_id: string;
  display_order: number;
  status: 'pending' | 'asked' | 'answered' | 'skipped';
}
const sq = (session: string, n: number, bank: string, status: SeedSessionQuestion['status']): SeedSessionQuestion => ({
  id: `q-${session}-${n}`, session_id: `s-${session}`, question_id: bank, display_order: n, status,
});
export const seedSessionQuestions: SeedSessionQuestion[] = [
  sq('r1', 1, 'b-c1', 'answered'), sq('r1', 2, 'b-c2', 'answered'), sq('r1', 3, 'b-c3', 'answered'), sq('r1', 4, 'b-c4', 'answered'),
  sq('r1', 5, 'b-c5', 'answered'), sq('r1', 6, 'b-s1', 'answered'), sq('r1', 7, 'b-s2', 'skipped'), sq('r1', 8, 'b-s3', 'skipped'),
  sq('r2', 1, 'b-w1', 'answered'), sq('r2', 2, 'b-w2', 'answered'), sq('r2', 3, 'b-w3', 'asked'), sq('r2', 4, 'b-w4', 'pending'),
  sq('r2', 5, 'b-f1', 'pending'), sq('r2', 6, 'b-f2', 'pending'), sq('r2', 7, 'b-f3', 'pending'), sq('r2', 8, 'b-f4', 'pending'),
  sq('m1', 1, 'b-c1', 'answered'), sq('m1', 2, 'b-c2', 'answered'), sq('m1', 3, 'b-s1', 'skipped'), sq('m1', 4, 'b-s2', 'skipped'),
];

export interface SeedRecording {
  id: string;
  session_question_id: string;
  version_number: number;
  duration_seconds: number;
  is_active: boolean;
  created_at: string;
}
const rc = (id: string, q: string, v: number, dur: number, active: boolean, at: string): SeedRecording => ({
  id, session_question_id: q, version_number: v, duration_seconds: dur, is_active: active, created_at: at,
});
export const seedRecordings: SeedRecording[] = [
  rc('rec-r1-1', 'q-r1-1', 1, 94, true, '2026-09-03T10:05:00Z'),
  rc('rec-r1-2a', 'q-r1-2', 1, 40, false, '2026-09-03T10:15:00Z'),
  rc('rec-r1-2', 'q-r1-2', 2, 128, true, '2026-09-03T10:20:00Z'),
  rc('rec-r1-3', 'q-r1-3', 1, 77, true, '2026-09-03T10:30:00Z'),
  rc('rec-r1-4', 'q-r1-4', 1, 63, true, '2026-09-03T10:42:00Z'),
  rc('rec-r1-5', 'q-r1-5', 1, 101, true, '2026-09-03T10:55:00Z'),
  rc('rec-r1-6', 'q-r1-6', 1, 58, true, '2026-09-03T11:05:00Z'),
  rc('rec-r2-1', 'q-r2-1', 1, 86, true, '2026-10-18T16:10:00Z'),
  rc('rec-r2-2', 'q-r2-2', 1, 72, true, '2026-10-18T16:25:00Z'),
  rc('rec-m1-1', 'q-m1-1', 1, 110, true, '2026-09-21T10:10:00Z'),
  rc('rec-m1-2', 'q-m1-2', 1, 83, true, '2026-09-21T10:25:00Z'),
];

export interface SeedTranscript {
  id: string;
  recording_id: string;
  version_number: number;
  transcript_text: string;
  transcript_text_english?: string | null;
  source: 'speech_to_text' | 'manual' | 'corrected';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  job_status: TranscriptJobStatus;
  reviewed_at?: string | null;
  created_at: string;
}
const tx = (id: string, rec: string, v: number, text: string, en: string | null, job: TranscriptJobStatus,
  source: SeedTranscript['source'] = 'speech_to_text', reviewed: string | null = null): SeedTranscript => ({
  id, recording_id: rec, version_number: v, transcript_text: text, transcript_text_english: en, source, job_status: job,
  status: job === 'done' || job === 'needs_review' ? 'completed' : job === 'failed' ? 'failed' : job === 'processing' ? 'processing' : 'pending',
  reviewed_at: reviewed, created_at: '2026-09-03T12:00:00Z',
});
export const seedTranscripts: SeedTranscript[] = [
  tx('t-r1-1', 'rec-r1-1', 1, 'நான் ஈரோட்டுக்குப் பக்கத்துல இருக்கற சின்ன கிராமத்துல பொறந்தேன். காவேரி ஆறு பக்கத்துலயே ஓடும். காலையில எழுந்தா ஆத்துப் பக்கம் போய் குளிச்சிட்டு வருவோம்.', 'I was born in a small village near Erode. The Kaveri river flowed close by, and every morning we would go to bathe there.', 'done', 'speech_to_text', '2026-09-04T09:00:00Z'),
  tx('t-r1-2a', 'rec-r1-2a', 1, 'எங்க வீடு ஓட்டு வீடு.', 'Our house had a tiled roof.', 'done'),
  tx('t-r1-2', 'rec-r1-2', 1, 'எங்க வீடு ஓட்டு வீடு, முன்னால பெரிய திண்ணை இருக்கும். திண்ணையில உக்காந்து பாட்டி கதை சொல்வாங்க.', 'Our house had a tiled roof and a big front verandah where grandmother told stories.', 'done'),
  tx('t-r1-2b', 'rec-r1-2', 2, 'எங்க வீடு ஓட்டு வீடு, முன்னால பெரிய திண்ணை இருக்கும். அந்தத் திண்ணையில உக்காந்து என் பாட்டி ராத்திரி கதை சொல்வாங்க.', 'Our house had a tiled roof and a big verandah, where my grandmother told night-time stories.', 'done', 'corrected', '2026-09-04T09:20:00Z'),
  tx('t-r1-3', 'rec-r1-3', 1, 'பல்லாங்குழி, தாயம், கண்ணாமூச்சி எல்லாம் விளையாடுவோம். மழை பெஞ்சா காகிதக் கப்பல் விடுவோம்.', 'We played pallanguzhi, thayam and hide-and-seek, and sailed paper boats when it rained.', 'needs_review'),
  tx('t-r1-4', 'rec-r1-4', 1, '', null, 'failed'),
  tx('t-r1-5', 'rec-r1-5', 1, 'பொங்கல் வந்தா வீடு முழுக்க மாக்கோலம் போடுவோம். கரும்பு, புது அரிசி, சூரியனுக்குப் படையல்.', 'At Pongal we drew kolam all over the house: sugarcane, new rice, an offering to the sun.', 'done', 'speech_to_text', '2026-09-04T09:40:00Z'),
  tx('t-r1-6', 'rec-r1-6', 1, 'முதல் நாள் பள்ளிக்கூடம் போகும்போது அழுதேன். வாத்தியார் கற்கண்டு கொடுத்தாரு.', 'I cried on my first day of school. The teacher gave me rock sugar.', 'done'),
  tx('t-r2-1', 'rec-r2-1', 1, '', null, 'processing'),
  tx('t-r2-2', 'rec-r2-2', 1, '', null, 'queued'),
  tx('t-m1-1', 'rec-m1-1', 1, 'மதுரையில மீனாட்சி அம்மன் கோயில் பக்கத்துலதான் எங்க வீடு. சித்திரைத் திருவிழா வந்தா ஊரே கலகலனு இருக்கும்.', 'Our house was near the Meenakshi temple in Madurai. During the Chithirai festival the whole town came alive.', 'done', 'speech_to_text', '2026-09-22T09:00:00Z'),
  tx('t-m1-2', 'rec-m1-2', 1, 'நாங்க நாலு பேரு ஒரே அறையில படுத்துத் தூங்குவோம். மொட்டை மாடியில கோடையில பாய் விரிச்சுப் படுப்போம்.', 'Four of us slept in one room, and in summer we laid mats on the terrace.', 'done'),
];

const ev = (id: string, title: string, titleEn: string, year: number, place: string, status: LifeEvent['extraction_status'],
  rec: string, excerpt: string, type = 'milestone'): LifeEvent => ({
  id, narrator_id: 'n-rajeshwari', title, title_tamil: title, title_english: titleEn, description: excerpt, description_english: null,
  approximate_year: year, date_precision: 'approximate', event_type: type, place_name: place, extraction_status: status,
  created_at: '2026-09-05T10:00:00Z', recording_id: rec, source_excerpt: excerpt,
});
export const seedEvents: LifeEvent[] = [
  ev('ev-1', 'ஈரோட்டில் பிறப்பு', 'Born near Erode', 1948, 'ஈரோடு', 'confirmed', 'rec-r1-1', 'ஈரோட்டுக்குப் பக்கத்துல இருக்கற சின்ன கிராமத்துல பொறந்தேன்.', 'birth'),
  ev('ev-2', 'ஓட்டு வீட்டில் வளர்ந்த நாட்கள்', 'Growing up in the tiled house', 1955, 'ஈரோடு', 'unreviewed', 'rec-r1-2', 'முன்னால பெரிய திண்ணை இருக்கும்.', 'residence'),
  ev('ev-3', 'முதல் பள்ளி நாள்', 'First day of school', 1953, 'ஈரோடு', 'corrected', 'rec-r1-6', 'முதல் நாள் பள்ளிக்கூடம் போகும்போது அழுதேன்.', 'education'),
  ev('ev-4', 'தவறாகக் கண்டறியப்பட்ட நிகழ்வு', 'Wrongly detected event', 1960, 'சென்னை', 'rejected', 'rec-r1-5', 'பொங்கல் வந்தா வீடு முழுக்க மாக்கோலம் போடுவோம்.', 'other'),
];

export const seedDrafts: StoryDraft[] = [
  {
    id: 'd-r1', narrator_id: 'n-rajeshwari', title: 'ராஜேஸ்வரி பாட்டியின் வாழ்க்கைக் கதை', language_code: 'ta', version: 1, status: 'draft',
    created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z',
    chapters: [
      { id: 'ch-1', chapter_number: 1, title: 'காவேரிக் கரையில் பிறப்பு', title_english: 'Born on the Kaveri bank', recording_ids: ['rec-r1-1'], status: 'draft',
        content: 'ஈரோட்டுக்குப் பக்கத்தில் உள்ள ஒரு சிறிய கிராமத்தில் பாட்டி பிறந்தார். காவேரி ஆறு வீட்டிற்கு அருகிலேயே ஓடியது. ஒவ்வொரு காலையும் ஆற்றில் குளித்துவிட்டுத்தான் அன்றைய நாள் தொடங்கும்.' },
      { id: 'ch-2', chapter_number: 2, title: 'திண்ணையும் கதைகளும்', title_english: 'The verandah and the stories', recording_ids: ['rec-r1-2'], status: 'draft',
        content: 'ஓட்டு வீட்டின் முன்னால் ஒரு பெரிய திண்ணை இருந்தது. இரவில் அங்கே உட்கார்ந்து பாட்டியின் பாட்டி கதைகள் சொல்வார். அந்தக் கதைகளே இன்று நினைவுகளாக நிற்கின்றன.' },
      { id: 'ch-3', chapter_number: 3, title: 'பொங்கலும் விளையாட்டும்', title_english: 'Pongal and games', recording_ids: ['rec-r1-3', 'rec-r1-5'], status: 'draft',
        content: 'பல்லாங்குழி, தாயம், கண்ணாமூச்சி என விளையாட்டுகளுக்குக் குறைவே இல்லை. பொங்கல் வந்தால் வீடு முழுவதும் கோலம், கரும்பு, புது அரிசி, சூரியனுக்குப் படையல்.' },
    ],
  },
];
