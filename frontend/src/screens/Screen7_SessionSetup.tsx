import React, { useState, useEffect } from 'react';
import {
  Mic,
  Sparkles,
  MessageSquare,
  ChevronRight,
  User,
  UserPlus,
  PlusCircle,
  Settings2,
  Calendar,
  Languages,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getNarrators, getAllSessions, createSession } from '../services/api';
import type { Narrator, InterviewSession } from '../types';

export const Screen7_SessionSetup: React.FC = () => {
  const { user } = useAuth();
  const {
    activeNarrator,
    setActiveNarrator,
    goToInterview,
    setCurrentScreen,
    setIsAddNarratorOpen,
    setEditingNarrator,
    showToast,
    uiLanguage,
  } = useApp();

  const [narrators, setNarrators] = useState<Narrator[]>([]);
  const [selectedNarratorId, setSelectedNarratorId] = useState<string>(activeNarrator?.id || '');
  const [sessionNumber, setSessionNumber] = useState<number>(1);
  const [title, setTitle] = useState<string>('');
  const [mode, setMode] = useState<'structured' | 'intelligent' | 'free_storytelling'>('structured');
  const [language, setLanguage] = useState<'ta' | 'en' | 'bilingual'>('ta');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper to auto-detect the next sequential session number for any narrator
  const autoDetectSessionNumber = async (narratorId: string, fallbackList: Narrator[] = narrators) => {
    if (!narratorId) {
      setSessionNumber(1);
      return;
    }
    try {
      const existingSessions = await getAllSessions(narratorId);
      if (existingSessions && existingSessions.length > 0) {
        const maxNum = Math.max(...existingSessions.map((s: InterviewSession) => Number(s.session_number) || 0), 0);
        setSessionNumber(maxNum + 1);
      } else {
        setSessionNumber(1);
      }
    } catch {
      const found = fallbackList.find((n) => n.id === narratorId);
      const count = parseInt(String(found?.session_count ?? 0), 10) || 0;
      setSessionNumber(count + 1);
    }
  };

  // Filter: ONLY narrators belonging to the currently logged in user are available for recording interviews
  const userNarrators = narrators.filter((n) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return (
      (n.created_by && n.created_by === user.id) ||
      (n.creator_email && user.email && n.creator_email.toLowerCase() === user.email.toLowerCase())
    );
  });

  const fetchNarratorsList = async () => {
    try {
      const list = await getNarrators();
      setNarrators(list);

      const owned = list.filter((n) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        return (
          (n.created_by && n.created_by === user.id) ||
          (n.creator_email && user.email && n.creator_email.toLowerCase() === user.email.toLowerCase())
        );
      });

      let initialId = '';
      if (activeNarrator?.id && owned.some((n) => n.id === activeNarrator.id)) {
        initialId = activeNarrator.id;
        setSelectedNarratorId(activeNarrator.id);
      } else if (owned.length > 0) {
        initialId = owned[0].id;
        setSelectedNarratorId(owned[0].id);
        setActiveNarrator(owned[0]);
      } else {
        setSelectedNarratorId('');
      }

      if (initialId) {
        void autoDetectSessionNumber(initialId, list);
      } else {
        setSessionNumber(1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void fetchNarratorsList();
    const handleUpdate = () => void fetchNarratorsList();
    window.addEventListener('narrator_list_updated', handleUpdate);
    return () => window.removeEventListener('narrator_list_updated', handleUpdate);
  }, [activeNarrator?.id, user?.id, user?.email]);

  const handleNarratorChange = (id: string) => {
    setSelectedNarratorId(id);
    const chosen = userNarrators.find((n) => n.id === id);
    if (chosen) {
      setActiveNarrator(chosen);
    }
    void autoDetectSessionNumber(id);
  };

  const handleBeginInterview = async (e: React.FormEvent) => {
    e.preventDefault();

    const currentNarrator = userNarrators.find((n) => n.id === selectedNarratorId) || activeNarrator;
    const narratorIdToUse = selectedNarratorId || currentNarrator?.id;

    if (!narratorIdToUse) {
      setError(uiLanguage === 'ta' ? 'தயவுசெய்து ஒரு நினைவாளரைத் தேர்ந்தெடுக்கவும்' : 'Please select a narrator');
      return;
    }

    if (!user) {
      showToast(
        uiLanguage === 'ta'
          ? 'நேர்காணலைத் தொடங்க தயவுசெய்து உள்நுழையவும்.'
          : 'Please sign in to begin an interview session.',
        'info'
      );
      setCurrentScreen('signin');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const finalTitle = title.trim() || (uiLanguage === 'ta' ? `அமர்வு ${sessionNumber}` : `Session ${sessionNumber}`);
      const session = await createSession({
        narrator_id: narratorIdToUse,
        session_number: sessionNumber,
        title: finalTitle,
        interview_mode: mode,
        preferred_language: language,
        notes: notes.trim() || undefined,
      });

      showToast(
        uiLanguage === 'ta'
          ? 'நேர்காணல் அமர்வு வெற்றிகரமாகத் தொடங்கியது!'
          : 'Interview session created successfully!'
      );

      goToInterview(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const currentNarrator = userNarrators.find((n) => n.id === selectedNarratorId) || (activeNarrator && userNarrators.some(n => n.id === activeNarrator.id) ? activeNarrator : userNarrators[0]);
  const isAllowed = Boolean(user && currentNarrator);

  return (
    <div className="page-container" style={{ maxWidth: '920px' }}>
      <div style={{ marginBottom: '32px' }}>
        <span className="badge-pill" style={{ marginBottom: '8px' }}>
          {uiLanguage === 'ta' ? 'அமர்வு கட்டமைப்பு' : 'Session Configuration'}
        </span>
        <h1 style={{ fontSize: '30px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginTop: '4px' }}>
          {uiLanguage === 'ta' ? 'நேர்காணல் தொடக்கம் / அமைப்பு' : 'Start Interview / Session Setup'}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '6px' }}>
          {uiLanguage === 'ta'
            ? 'நேர்காணல் எவ்வாறு நடைபெற வேண்டும் என்பதைத் தேர்வு செய்து உரையாடலைத் தொடங்குங்கள்.'
            : 'Configure how this interview session will proceed, pick the mode and question sequence.'}
        </p>
      </div>

      {error && (
        <div style={{ padding: '14px 20px', background: 'var(--status-red-bg)', color: 'var(--status-red)', borderRadius: '20px', marginBottom: '24px', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {userNarrators.length === 0 ? (
        <div
          className="modern-card"
          style={{
            padding: '54px 36px',
            textAlign: 'center',
            borderRadius: '32px',
            background: '#FFFFFF',
            border: '1px solid var(--border-card)',
            boxShadow: '0 12px 32px rgba(94, 86, 83, 0.05)',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'var(--slate-bg-tint)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 20px',
              color: 'var(--slate-taupe-dark)',
            }}
          >
            <UserPlus size={30} />
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
            {uiLanguage === 'ta' ? 'தங்களின் நினைவாளர் இன்னும் சேர்க்கப்படவில்லை' : 'No Narrators Added to Your Account Yet'}
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
              maxWidth: '520px',
              margin: '0 auto 26px',
              lineHeight: 1.6,
            }}
          >
            {uiLanguage === 'ta'
              ? 'நேர்காணலைத் தொடங்க, முதலில் உங்கள் குடும்பப் பெரியவரை (நினைவாளர்) சேர்க்கவும். பிற கணக்குகளின் நினைவாளர்களை இங்கு பதிவு செய்ய முடியாது.'
              : 'Each account manages its own family elders. To start recording sessions, please add your family narrator first.'}
          </p>
          <button
            type="button"
            className="btn-pill-primary"
            onClick={() => {
              setEditingNarrator(null);
              setIsAddNarratorOpen(true);
            }}
            style={{ padding: '14px 32px', fontSize: '14px' }}
          >
            <PlusCircle size={17} />
            <span>{uiLanguage === 'ta' ? 'புதிய நினைவாளர் சேர்க்க' : 'Add New Narrator'}</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleBeginInterview}>
          {/* Narrator Picker Card */}
          <div className="modern-card" style={{ padding: '30px 34px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>
                {uiLanguage === 'ta' ? '1. நினைவாளர் தேர்வு (Narrator)' : '1. Select Narrator'}
              </h3>
              <span className="badge-pill" style={{ fontSize: '11px' }}>Step 1 of 3</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--slate-sand), var(--slate-taupe-dark))',
                    color: '#FFFFFF',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '24px',
                    fontWeight: 800,
                    flexShrink: 0,
                    boxShadow: '0 8px 20px rgba(94, 86, 83, 0.2)',
                  }}
                >
                  {(currentNarrator?.full_name_tamil || currentNarrator?.full_name_english || '?').charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--slate-taupe-dark)' }}>
                    {currentNarrator?.full_name_tamil || currentNarrator?.full_name_english || 'Select a Narrator'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {currentNarrator?.preferred_name && `${currentNarrator.preferred_name} · `}
                    Born {currentNarrator?.birth_year || '—'} · {currentNarrator?.place_of_birth || 'Tamil Nadu'}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate-gray)' }}>
                    {uiLanguage === 'ta' ? 'நினைவாளரை மாற்றுக:' : 'Choose Narrator:'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNarrator(null);
                      setIsAddNarratorOpen(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--slate-taupe-dark)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <PlusCircle size={13} />
                    <span>{uiLanguage === 'ta' ? 'புதிய நினைவாளர்' : 'Add Narrator'}</span>
                  </button>
                </div>
                <select
                  value={selectedNarratorId}
                  onChange={(e) => handleNarratorChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 18px',
                    borderRadius: '9999px',
                    border: '1px solid var(--border-subtle)',
                    background: '#FAF9F8',
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none',
                    color: 'var(--slate-taupe-dark)',
                  }}
                >
                  {userNarrators.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.full_name_tamil || n.full_name_english} ({n.preferred_name || 'Narrator'}) — Born {n.birth_year || '—'} · {n.place_of_birth || ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

        {/* Session Details Card */}
        <div className="modern-card" style={{ padding: '30px 34px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>
              {uiLanguage === 'ta' ? '2. அமர்வு விவரங்கள்' : '2. Session Details'}
            </h3>
            <span className="badge-pill" style={{ fontSize: '11px' }}>Step 2 of 3</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '18px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)' }}>
                  {uiLanguage === 'ta' ? 'அமர்வு எண்' : 'Session #'}
                </label>
                <span className="badge-pill" style={{ fontSize: '10px', padding: '2px 8px' }}>
                  {uiLanguage === 'ta' ? 'தானியங்கி' : 'Auto'}
                </span>
              </div>
              <input
                type="number"
                min="1"
                value={sessionNumber}
                onChange={(e) => setSessionNumber(parseInt(e.target.value, 10) || 1)}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)',
                  background: '#FAF9F8',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)' }}>
                  {uiLanguage === 'ta' ? 'நேர்காணல் தலைப்பு (Interview Title)' : 'Interview Title'}
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {uiLanguage === 'ta' ? '(விருப்பமானது)' : '(Optional)'}
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  uiLanguage === 'ta'
                    ? `எ.கா: அமர்வு ${sessionNumber} - குழந்தைப் பருவம், கல்லூரி வாழ்க்கை, பணி அனுபவம்...`
                    : `e.g. Session ${sessionNumber} - Childhood Memories, Career Journey, Family Traditions...`
                }
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)',
                  background: '#FAF9F8',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
              {uiLanguage === 'ta' ? 'மொழி தேர்வு' : 'Interview Language'}
            </label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={language === 'ta' ? 'btn-pill-primary' : 'btn-pill-outline'}
                style={{ padding: '8px 18px', fontSize: '13px' }}
                onClick={() => setLanguage('ta')}
              >
                தமிழ் (Tamil - Primary)
              </button>
              <button
                type="button"
                className={language === 'en' ? 'btn-pill-primary' : 'btn-pill-outline'}
                style={{ padding: '8px 18px', fontSize: '13px' }}
                onClick={() => setLanguage('en')}
              >
                English
              </button>
              <button
                type="button"
                className={language === 'bilingual' ? 'btn-pill-primary' : 'btn-pill-outline'}
                style={{ padding: '8px 18px', fontSize: '13px' }}
                onClick={() => setLanguage('bilingual')}
              >
                தமிழ் & English
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
              {uiLanguage === 'ta' ? 'அமர்வுக்கான சிறப்புக் குறிப்புகள் (Optional Notes)' : 'Session Notes'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                uiLanguage === 'ta'
                  ? 'எ.கா: குடும்பப் பெரியவர் தம் இல்லத்தில் அன்புடன் பகிர்ந்த நினைவுகள்...'
                  : 'e.g. Recorded at family home, shared with grandchildren...'
              }
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '20px',
                border: '1px solid var(--border-subtle)',
                background: '#FAF9F8',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* 3 Interview Modes as specified in prompt */}
        <div className="modern-card" style={{ padding: '30px 34px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>
              {uiLanguage === 'ta' ? '3. நேர்காணல் முறை (Interview Mode)' : '3. Interview Mode'}
            </h3>
            <span className="badge-pill" style={{ fontSize: '11px' }}>Step 3 of 3</span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '22px' }}>
            {uiLanguage === 'ta'
              ? 'உரையாடல் எவ்வாறு அமைய வேண்டும் என்பதைத் தேர்வு செய்யுங்கள்'
              : 'Choose the conversational flow for this recording session'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
            {/* Mode 1: Structured */}
            <div
              onClick={() => setMode('structured')}
              style={{
                padding: '24px',
                borderRadius: '26px',
                border: mode === 'structured' ? '2px solid var(--slate-taupe-dark)' : '1px solid var(--border-subtle)',
                background: mode === 'structured' ? '#FFFFFF' : '#FAF9F8',
                boxShadow: mode === 'structured' ? '0 12px 30px rgba(94, 86, 83, 0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: mode === 'structured' ? 'var(--slate-taupe-dark)' : 'var(--slate-bg-tint)',
                    color: mode === 'structured' ? '#FFFFFF' : 'var(--slate-taupe-dark)',
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <MessageSquare size={18} />
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginBottom: '6px' }}>
                  Structured Interview
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {uiLanguage === 'ta'
                    ? 'முன்பே தயாரிக்கப்பட்ட வரிசைக்கிரம வினாக்களைப் பின்பற்றும் முறை.'
                    : 'Questions follow a predefined sequence from the bank.'}
                </p>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge-pill" style={{ fontSize: '10px' }}>Fixed sequence</span>
              </div>
            </div>

            {/* Mode 2: Intelligent */}
            <div
              onClick={() => setMode('intelligent')}
              style={{
                padding: '24px',
                borderRadius: '26px',
                border: mode === 'intelligent' ? '2px solid var(--accent-green)' : '1px solid var(--border-subtle)',
                background: mode === 'intelligent' ? '#FFFFFF' : '#FAF9F8',
                boxShadow: mode === 'intelligent' ? '0 12px 30px rgba(140, 83, 56, 0.15)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: mode === 'intelligent' ? 'var(--accent-green)' : 'var(--slate-bg-tint)',
                    color: mode === 'intelligent' ? '#FFFFFF' : 'var(--slate-sand)',
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <Sparkles size={18} />
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginBottom: '6px' }}>
                  Intelligent Interview
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {uiLanguage === 'ta'
                    ? 'பதில்களின் அடிப்படையில் AI தானாக தொடர்புடைய தொடர் வினாக்களைப் பரிந்துரைக்கும்.'
                    : 'AI suggests relevant follow-up questions based on previous answers.'}
                </p>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge-pill" style={{ fontSize: '10px', background: 'rgba(140, 83, 56, 0.15)', color: 'var(--accent-green)' }}>AI-guided</span>
              </div>
            </div>

            {/* Mode 3: Free Storytelling */}
            <div
              onClick={() => setMode('free_storytelling')}
              style={{
                padding: '24px',
                borderRadius: '26px',
                border: mode === 'free_storytelling' ? '2px solid var(--slate-sand)' : '1px solid var(--border-subtle)',
                background: mode === 'free_storytelling' ? '#FFFFFF' : '#FAF9F8',
                boxShadow: mode === 'free_storytelling' ? '0 12px 30px rgba(171, 151, 140, 0.15)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: mode === 'free_storytelling' ? 'var(--slate-sand)' : 'var(--slate-bg-tint)',
                    color: mode === 'free_storytelling' ? '#FFFFFF' : 'var(--slate-taupe-dark)',
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <Mic size={18} />
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginBottom: '6px' }}>
                  Free Storytelling
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {uiLanguage === 'ta'
                    ? 'கட்டுப்பாடற்ற திறந்தவெளி முறை — நினைவாளர் விரும்பும் நினைவுகளைப் பகிரலாம்.'
                    : 'The narrator shares memories freely without following a fixed question list.'}
                </p>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge-pill" style={{ fontSize: '10px' }}>Open form</span>
              </div>
            </div>
          </div>
        </div>

        {/* Begin Interview Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            {!isAllowed && currentNarrator && (
              <span style={{ fontSize: '13px', color: '#C48232', fontWeight: 600 }}>
                🔒 Reader Mode: Only {currentNarrator.creator_name || currentNarrator.creator_email || 'the primary archivist'} can record sessions.
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-pill-outline"
              onClick={() => setCurrentScreen('dashboard')}
            >
              {uiLanguage === 'ta' ? 'ரத்து செய்க' : 'Cancel'}
            </button>

            <button
              type="submit"
              className="btn-pill-primary"
              disabled={loading}
              style={{
                padding: '14px 34px',
                fontSize: '15px',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              title={!isAllowed ? 'Only the primary archivist can start sessions' : 'Begin Interview'}
            >
              <Mic size={18} />
              <span>
                {loading
                  ? uiLanguage === 'ta'
                    ? 'துவக்குகிறது...'
                    : 'Initializing...'
                  : uiLanguage === 'ta'
                  ? 'நேர்காணலைத் தொடங்குக'
                  : 'Begin Interview'}
              </span>
              <span
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '12px',
                }}
              >
                ↗
              </span>
            </button>
          </div>
        </div>
      </form>
      )}
    </div>
  );
};
