-- ==========================================
-- TAMIL LIFE STORY
-- Initial Database Schema
-- ==========================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Family assistants and administrators
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'assistant'
        CHECK (role IN ('admin', 'assistant')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Narrator profiles
CREATE TABLE IF NOT EXISTS narrators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    full_name_tamil VARCHAR(200),
    full_name_english VARCHAR(200),
    preferred_name VARCHAR(200),

    birth_year INTEGER
        CHECK (birth_year IS NULL OR birth_year BETWEEN 1800 AND 2100),

    place_of_birth TEXT,
    preferred_language VARCHAR(20) NOT NULL DEFAULT 'ta',
    tamil_dialect VARCHAR(100),
    profile_photo_url TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (
        full_name_tamil IS NOT NULL
        OR full_name_english IS NOT NULL
    )
);

-- 3. Interview sessions
CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    narrator_id UUID NOT NULL
        REFERENCES narrators(id) ON DELETE RESTRICT,

    session_number INTEGER NOT NULL CHECK (session_number > 0),

    interview_mode VARCHAR(30) NOT NULL DEFAULT 'structured'
        CHECK (interview_mode IN ('structured', 'intelligent', 'free_storytelling')),

    status VARCHAR(30) NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'paused', 'completed', 'abandoned')),

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (narrator_id, session_number)
);

-- 4. Configurable question bank
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    category VARCHAR(100) NOT NULL,
    life_stage VARCHAR(100),

    question_tamil TEXT NOT NULL,
    question_english TEXT,

    display_order INTEGER NOT NULL DEFAULT 0,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Questions presented in each session
CREATE TABLE IF NOT EXISTS session_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL
        REFERENCES interview_sessions(id) ON DELETE RESTRICT,

    question_id UUID
        REFERENCES questions(id) ON DELETE SET NULL,

    question_tamil TEXT NOT NULL,

    question_type VARCHAR(30) NOT NULL DEFAULT 'structured'
        CHECK (question_type IN ('structured', 'follow_up', 'free_storytelling')),

    display_order INTEGER NOT NULL DEFAULT 0,

    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'asked', 'answered', 'skipped')),

    asked_at TIMESTAMPTZ,
    answered_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Audio recordings
CREATE TABLE IF NOT EXISTS recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_question_id UUID NOT NULL
        REFERENCES session_questions(id) ON DELETE RESTRICT,

    version_number INTEGER NOT NULL DEFAULT 1
        CHECK (version_number > 0),

    storage_key TEXT NOT NULL UNIQUE,
    original_filename TEXT,

    mime_type VARCHAR(150) NOT NULL,
    file_size_bytes BIGINT CHECK (file_size_bytes >= 0),
    duration_seconds NUMERIC(12, 3)
        CHECK (duration_seconds IS NULL OR duration_seconds >= 0),

    status VARCHAR(30) NOT NULL DEFAULT 'saved'
        CHECK (status IN ('uploading', 'saved', 'processing', 'failed')),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (session_question_id, version_number)
);

-- Only one active recording per question.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_recording_per_question
ON recordings(session_question_id)
WHERE is_active = TRUE;

-- 7. Transcript versions
CREATE TABLE IF NOT EXISTS transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    recording_id UUID NOT NULL
        REFERENCES recordings(id) ON DELETE RESTRICT,

    version_number INTEGER NOT NULL DEFAULT 1
        CHECK (version_number > 0),

    transcript_text TEXT NOT NULL DEFAULT '',
    language_code VARCHAR(20) NOT NULL DEFAULT 'ta',

    source VARCHAR(30) NOT NULL DEFAULT 'speech_to_text'
        CHECK (source IN ('speech_to_text', 'manual', 'corrected')),

    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (recording_id, version_number)
);

-- 8. Extracted life events
CREATE TABLE IF NOT EXISTS life_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    narrator_id UUID NOT NULL
        REFERENCES narrators(id) ON DELETE RESTRICT,

    title TEXT NOT NULL,
    description TEXT,

    event_date DATE,
    approximate_year INTEGER
        CHECK (
            approximate_year IS NULL
            OR approximate_year BETWEEN 1800 AND 2100
        ),

    date_description TEXT,
    date_precision VARCHAR(30) NOT NULL DEFAULT 'unknown'
        CHECK (
            date_precision IN (
                'exact',
                'year',
                'approximate',
                'relative',
                'unknown'
            )
        ),

    event_type VARCHAR(100),
    place_name TEXT,

    extraction_status VARCHAR(30) NOT NULL DEFAULT 'unreviewed'
        CHECK (
            extraction_status IN (
                'unreviewed',
                'confirmed',
                'corrected',
                'rejected'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Link life events to their source recordings
CREATE TABLE IF NOT EXISTS event_sources (
    event_id UUID NOT NULL
        REFERENCES life_events(id) ON DELETE RESTRICT,

    recording_id UUID NOT NULL
        REFERENCES recordings(id) ON DELETE RESTRICT,

    transcript_id UUID
        REFERENCES transcripts(id) ON DELETE RESTRICT,

    source_excerpt TEXT,

    PRIMARY KEY (event_id, recording_id, transcript_id)
);

-- 10. Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_narrators_created_by
ON narrators(created_by);

CREATE INDEX IF NOT EXISTS idx_sessions_narrator
ON interview_sessions(narrator_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_questions_session
ON session_questions(session_id, display_order);

CREATE INDEX IF NOT EXISTS idx_recordings_question
ON recordings(session_question_id);

CREATE INDEX IF NOT EXISTS idx_transcripts_recording
ON transcripts(recording_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_life_events_narrator
ON life_events(narrator_id, approximate_year);

CREATE INDEX IF NOT EXISTS idx_event_sources_recording
ON event_sources(recording_id);

-- ==========================================
-- END INITIAL SCHEMA
-- ==========================================
