-- ==========================================
-- NinaivuKalanjiyam
-- Migration 002: Schema Enhancements & Seed Data
-- ==========================================

-- 1. Schema Enhancements
ALTER TABLE interview_sessions 
    ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT 'Interview Session',
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(20) DEFAULT 'ta';

ALTER TABLE session_questions
    ADD COLUMN IF NOT EXISTS question_english TEXT;

ALTER TABLE transcripts
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS transcript_text_english TEXT;

ALTER TABLE life_events
    ADD COLUMN IF NOT EXISTS title_tamil TEXT,
    ADD COLUMN IF NOT EXISTS title_english TEXT,
    ADD COLUMN IF NOT EXISTS description_english TEXT;

CREATE TABLE IF NOT EXISTS story_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    narrator_id UUID NOT NULL REFERENCES narrators(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    language_code VARCHAR(20) NOT NULL DEFAULT 'ta',
    version INTEGER NOT NULL DEFAULT 1,
    chapters JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_drafts_narrator ON story_drafts(narrator_id);

-- 2. Seed Default User (if not exists)
INSERT INTO users (id, full_name, email, password_hash, role)
VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'அன்பரசன் (Anbarasan - Family Archivist)',
    'assistant@ninaivukalanjiyam.family',
    'scrypt:32768:8:1$placeholder$mockhash',
    'assistant'
)
ON CONFLICT (email) DO NOTHING;

-- 3. Seed Question Bank across all 12 categories
INSERT INTO questions (category, life_stage, question_tamil, question_english, display_order)
VALUES
-- Childhood
('Childhood', 'Early Years', 'உங்கள் குழந்தைப் பருவத்தைப் பற்றி சொல்ல முடியுமா?', 'Could you tell me about your childhood?', 1),
('Childhood', 'Early Years', 'நீங்கள் வளர்ந்த ஊர் மற்றும் வீட்டைப் பற்றி விவரியுங்கள்.', 'Describe the town and home you grew up in.', 2),
('Childhood', 'Early Years', 'சிறுவயதில் நீங்கள் விரும்பி விளையாடிய பாரம்பரிய விளையாட்டுகள் என்ன?', 'What traditional games did you love playing as a child?', 3),

-- Parents and siblings
('Parents and siblings', 'Family', 'உங்கள் பெற்றோரைப் பற்றிய உங்களின் முதல் அல்லது மிக ஆழமான நினைவு எது?', 'What is your earliest or most profound memory of your parents?', 4),
('Parents and siblings', 'Family', 'உங்கள் உடன்பிறப்புகளுடனான உறவு எப்படி இருந்தது? அவர்கள் பற்றி கூறுங்கள்.', 'How was your relationship with your siblings? Tell us about them.', 5),

-- School days
('School days', 'Education', 'உங்கள் பள்ளிப் பருவத்தைப் பற்றி சொல்லுங்கள். எப்படி பள்ளிக்குச் செல்வீர்கள்?', 'Tell us about your school days. How did you commute to school?', 6),
('School days', 'Education', 'உங்கள் ஆசிரியர்களில் உங்களுக்கு மிகவும் பிடித்தவர் அல்லது உங்கள் வாழ்வில் மாற்றத்தை ஏற்படுத்தியவர் யார்?', 'Who was your favorite teacher or someone who made a deep impact on your life?', 7),

-- Friends
('Friends', 'Youth', 'உங்கள் பால்ய கால நண்பர்களில் யாரை இன்னும் நினைவில் வைத்திருக்கிறீர்கள்?', 'Which childhood friends do you still remember warmly?', 8),
('Friends', 'Youth', 'நண்பர்களுடன் சேர்ந்து செய்த மறக்க முடியாத நிகழ்வு அல்லது பயணம் ஏதாவது உண்டா?', 'Is there an unforgettable incident or trip you had with your friends?', 9),

-- Education
('Education', 'Youth', 'நீங்கள் உயர்கல்வி அல்லது பிற பயிற்சிகள் பெற்ற அனுபவம் எப்படி இருந்தது?', 'How was your experience pursuing higher studies or vocational learning?', 10),

-- Career
('Career', 'Adult', 'உங்கள் முதல் வேலை அல்லது தொழில் அனுபவம் எவ்வாறு தொடங்கியது?', 'How did your first job or career experience begin?', 11),
('Career', 'Adult', 'உங்கள் தொழில் வாழ்க்கையில் நீங்கள் அடைந்த மிகப்பெரிய சாதனை அல்லது பெருமிதம் எது?', 'What was the proudest achievement in your professional life?', 12),

-- Marriage and family
('Marriage and family', 'Adult', 'உங்கள் திருமணம் எவ்வாறு நிச்சயமானது? அந்தத் திருமண நாள் எப்படி அமைந்தது?', 'How was your wedding arranged, and what was that wedding day like?', 13),
('Marriage and family', 'Adult', 'குடும்ப வாழ்க்கையின் தொடக்க கால நினைவுகள் பற்றி பகிர்ந்து கொள்ளுங்கள்.', 'Please share your memories from the early years of your married life.', 14),

-- Children
('Children', 'Family', 'உங்கள் குழந்தைகள் பிறந்த தருணத்தில் நீங்கள் உணர்ந்த உணர்வுகள் என்ன?', 'What emotions did you feel when your children were born?', 15),
('Children', 'Family', 'பிள்ளைகளை வளர்ப்பதில் நீங்கள் கடைப்பிடித்த முக்கிய நற்குணங்கள் என்ன?', 'What core values and ethics did you emphasize while raising children?', 16),

-- Festivals and traditions
('Festivals and traditions', 'Traditions', 'உங்கள் வீட்டில் பொங்கல், தீபாவளி போன்ற பண்டிகைகளை எப்படிக் கொண்டாடுவீர்கள்?', 'How did your family celebrate festivals like Pongal and Diwali?', 17),
('Festivals and traditions', 'Traditions', 'உங்கள் குடும்பத்தில் தலைமுறை தலைமுறையாகக் கடைப்பிடிக்கப்படும் தனித்துவமான வழக்கம் என்ன?', 'What is a cherished custom passed down through generations in your family?', 18),

-- Important life events
('Important life events', 'Milestones', 'உங்கள் வாழ்க்கையை மாற்றியமைத்த மிக முக்கியமான திருப்புமுனை எது?', 'What was a major turning point that shaped the course of your life?', 19),

-- Challenges and achievements
('Challenges and achievements', 'Milestones', 'உங்கள் வாழ்வில் நீங்கள் எதிர்கொண்ட கடினமான சவால் என்ன? அதை எவ்வாறு வென்றீர்கள்?', 'What was the toughest challenge you faced, and how did you overcome it?', 20),

-- Advice for future generations
('Advice for future generations', 'Wisdom', 'உங்கள் அடுத்த தலைமுறை பேரக்குழந்தைகளுக்கு நீங்கள் கூற விரும்பும் பொன்னான அறிவுரை என்ன?', 'What golden advice and wisdom would you like to give to your grandchildren and future generations?', 21)
ON CONFLICT DO NOTHING;

-- 4. Seed Narrators (Total 5 narrators)
-- Shanmugam (update or insert)
INSERT INTO narrators (id, created_by, full_name_tamil, full_name_english, preferred_name, birth_year, place_of_birth, preferred_language, tamil_dialect, status)
VALUES 
(
    '9a064be3-6c1b-4383-a5a9-ec80d5dd5684',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'சண்முகம்',
    'Shanmugam',
    'தாத்தா',
    1943,
    'Bhavani',
    'ta',
    'Erode Tamil',
    'active'
)
ON CONFLICT (id) DO UPDATE SET
    full_name_tamil = EXCLUDED.full_name_tamil,
    full_name_english = EXCLUDED.full_name_english,
    preferred_name = EXCLUDED.preferred_name,
    birth_year = EXCLUDED.birth_year,
    place_of_birth = EXCLUDED.place_of_birth,
    tamil_dialect = EXCLUDED.tamil_dialect;

INSERT INTO narrators (id, created_by, full_name_tamil, full_name_english, preferred_name, birth_year, place_of_birth, preferred_language, tamil_dialect, status)
VALUES 
(
    '11111111-1111-4111-a111-111111111111',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'ராஜேஸ்வரி',
    'Rajeshwari',
    'பாட்டி',
    1948,
    'Erode',
    'ta',
    'Kongu Tamil',
    'active'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Interview Sessions
-- Shanmugam Session 1: Childhood Memories
INSERT INTO interview_sessions (id, narrator_id, session_number, title, interview_mode, status, notes, started_at, ended_at)
VALUES (
    '55555555-5555-4555-a555-555555555551',
    '9a064be3-6c1b-4383-a5a9-ec80d5dd5684',
    1,
    'குழந்தைப் பருவ நினைவுகள் (Childhood Memories)',
    'structured',
    'completed',
    'Recorded at Bhavani ancestral home with family members present.',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days' + INTERVAL '45 minutes'
)
ON CONFLICT (narrator_id, session_number) DO NOTHING;

-- Shanmugam Session 2: School Days & Youth (In Progress for "Continue an unfinished interview")
INSERT INTO interview_sessions (id, narrator_id, session_number, title, interview_mode, status, notes, started_at, last_activity_at)
VALUES (
    '55555555-5555-4555-a555-555555555552',
    '9a064be3-6c1b-4383-a5a9-ec80d5dd5684',
    2,
    'பள்ளி மற்றும் வாலிபப் பருவம் (School & Youth)',
    'intelligent',
    'in_progress',
    'Continuation session focusing on schooling in Bhavani and early work.',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '2 hours'
)
ON CONFLICT (narrator_id, session_number) DO NOTHING;

-- Lakshmi Session 1: Family & Traditions
INSERT INTO interview_sessions (id, narrator_id, session_number, title, interview_mode, status, notes, started_at, ended_at)
VALUES (
    '66666666-6666-4666-a666-666666666661',
    '11111111-1111-4111-a111-111111111111',
    1,
    'குடும்பமும் பாரம்பரியமும் (Family & Traditions)',
    'structured',
    'completed',
    'Deep conversation about traditional Kongu recipes and Pongal celebrations.',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days' + INTERVAL '50 minutes'
)
ON CONFLICT (narrator_id, session_number) DO NOTHING;

-- 6. Seed Session Questions, Recordings, Transcripts for Shanmugam Session 1
-- Question 1: Childhood
INSERT INTO session_questions (id, session_id, question_tamil, question_english, question_type, display_order, status, asked_at, answered_at)
VALUES (
    '77777777-7777-4777-a777-777777777771',
    '55555555-5555-4555-a555-555555555551',
    'உங்கள் குழந்தைப் பருவத்தைப் பற்றி சொல்ல முடியுமா?',
    'Could you tell me about your childhood?',
    'structured',
    1,
    'answered',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days' + INTERVAL '5 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Questions for sessions are created dynamically or selected from the question bank.

