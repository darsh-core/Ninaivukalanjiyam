import React, { useState, useEffect } from 'react';
import {
  Volume2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Mic,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getSessionById, updateQuestionStatus, synthesizeSpeech } from '../services/api';
import type { InterviewSession, SessionQuestion } from '../types';

export const Screen8_InterviewQuestion: React.FC = () => {
  const {
    activeSession,
    setCurrentScreen,
    activeQuestionIndex,
    setActiveQuestionIndex,
    setIsAIFollowUpModalOpen,
    setActiveFollowUpContext,
    uiLanguage,
  } = useApp();

  const [session, setSession] = useState<InterviewSession | null>(activeSession);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);

  useEffect(() => {
    async function refreshSession() {
      if (activeSession?.id) {
        try {
          const fresh = await getSessionById(activeSession.id);
          setSession(fresh);
        } catch (err) {
          console.error(err);
        }
      }
    }
    void refreshSession();
  }, [activeSession?.id]);

  const questions = session?.questions || [];
  const currentQuestion: SessionQuestion | undefined = questions[activeQuestionIndex];

  const playQuestionTTS = async () => {
    if (!currentQuestion) return;

    try {
      setIsPlayingTTS(true);
      const res = await synthesizeSpeech(currentQuestion.question_tamil, 'kavitha');
      if (res && res.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${res.audioBase64}`);
        audio.onended = () => setIsPlayingTTS(false);
        audio.onerror = () => setIsPlayingTTS(false);
        await audio.play();
        return;
      }
    } catch (ttsErr) {
      console.warn('Backend TTS notice, falling back to browser speech synthesis:', ttsErr);
    }

    // Fallback to browser Web Speech API
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentQuestion.question_tamil);
      utterance.lang = 'ta-IN';
      utterance.rate = 0.9;
      utterance.onstart = () => setIsPlayingTTS(true);
      utterance.onend = () => setIsPlayingTTS(false);
      utterance.onerror = () => setIsPlayingTTS(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingTTS(false);
    }
  };

  const handleNext = () => {
    if (activeQuestionIndex < questions.length - 1) {
      setActiveQuestionIndex(activeQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (activeQuestionIndex > 0) {
      setActiveQuestionIndex(activeQuestionIndex - 1);
    }
  };

  const handleSkip = async () => {
    if (!currentQuestion) return;
    try {
      await updateQuestionStatus(currentQuestion.id, 'skipped');
      if (activeQuestionIndex < questions.length - 1) {
        setActiveQuestionIndex(activeQuestionIndex + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordAnswer = () => {
    setCurrentScreen('recording_studio');
  };

  const handleOpenAIFollowUps = () => {
    if (!currentQuestion) return;
    setActiveFollowUpContext({
      question: currentQuestion.question_tamil,
      answer: currentQuestion.transcript_text || undefined,
      questionId: currentQuestion.id,
    });
    setIsAIFollowUpModalOpen(true);
  };

  if (!currentQuestion) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ color: 'var(--text-muted)' }}>No questions available for this session.</p>
        <button className="btn-pill-primary" style={{ marginTop: '14px' }} onClick={() => setCurrentScreen('session_setup')}>
          Back to Session Setup
        </button>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '940px', minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar with Session info and Back button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button
          onClick={() => setCurrentScreen('dashboard')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--slate-gray)', fontSize: '13px', fontWeight: 700 }}
        >
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="section-pill-tag" style={{ margin: 0, padding: '5px 14px' }}>
            {session?.full_name_tamil || session?.full_name_english || (uiLanguage === 'ta' ? 'நினைவாளர்' : 'Narrator')}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-gray)' }}>
            Question {activeQuestionIndex + 1} of {questions.length}
          </span>
        </div>
      </div>

      {/* Main Question Card - Super-rounded serene design */}
      <div
        className="modern-card"
        style={{
          borderRadius: 'var(--radius-xl)',
          padding: 'clamp(40px, 6vw, 64px) clamp(24px, 4vw, 48px)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '380px',
          marginBottom: '28px',
        }}
      >
        <div className="section-pill-tag" style={{ marginBottom: '24px' }}>
          <span>{currentQuestion.question_type === 'follow_up' ? 'AI Follow-up Question' : 'Life Story Question'}</span>
        </div>

        {/* Large Tamil Question */}
        <h2
          style={{
            fontSize: 'clamp(28px, 4.2vw, 44px)',
            fontWeight: 800,
            color: 'var(--slate-taupe-dark)',
            lineHeight: 1.35,
            maxWidth: '780px',
            marginBottom: '16px',
            letterSpacing: '-0.02em',
          }}
        >
          {currentQuestion.question_tamil}
        </h2>

        {/* English Translation */}
        {currentQuestion.question_english && (
          <p style={{ fontSize: '18px', color: 'var(--slate-gray)', maxWidth: '680px', lineHeight: 1.6, marginBottom: '32px', fontWeight: 500 }}>
            {currentQuestion.question_english}
          </p>
        )}

        {/* Audio TTS Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="btn-pill-outline"
            onClick={playQuestionTTS}
            style={{ borderColor: isPlayingTTS ? 'var(--slate-taupe-dark)' : undefined }}
          >
            <Volume2 size={16} />
            <span>{isPlayingTTS ? 'Playing Question...' : 'Play Question Aloud'}</span>
          </button>

          <button
            className="circle-action-btn"
            onClick={playQuestionTTS}
            title="Replay question"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {currentQuestion.status === 'answered' && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-green)', fontSize: '13px', fontWeight: 700, marginTop: '20px' }}>
            <CheckCircle2 size={16} />
            <span>Answer recorded for this question</span>
          </div>
        )}
      </div>

      {/* Main Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <button
          className="btn-pill-accent"
          onClick={handleRecordAnswer}
          style={{ padding: '16px 36px', fontSize: '15px' }}
        >
          <Mic size={18} />
          <span>Record Answer</span>
        </button>

        <button
          className="btn-pill-primary"
          onClick={handleOpenAIFollowUps}
          style={{ padding: '16px 28px', fontSize: '15px' }}
        >
          <Sparkles size={17} />
          <span>AI Follow-up Suggestions</span>
        </button>
      </div>

      {/* Bottom Navigation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          background: '#FFFFFF',
          borderRadius: 'var(--radius-pill)',
          border: '1.5px solid var(--border-subtle)',
          marginTop: 'auto',
        }}
      >
        <button
          className="btn-pill-outline"
          disabled={activeQuestionIndex === 0}
          onClick={handlePrev}
          style={{ opacity: activeQuestionIndex === 0 ? 0.4 : 1, padding: '8px 20px', fontSize: '13px' }}
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </button>

        <button
          onClick={handleSkip}
          style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-gray)', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <SkipForward size={15} />
          <span>Skip Question</span>
        </button>

        <button
          className="btn-pill-outline"
          disabled={activeQuestionIndex >= questions.length - 1}
          onClick={handleNext}
          style={{ opacity: activeQuestionIndex >= questions.length - 1 ? 0.4 : 1, padding: '8px 20px', fontSize: '13px' }}
        >
          <span>Next Question</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
