import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  Save,
  ArrowUp,
  ArrowDown,
  Globe,
  Edit2,
  CheckCircle2,
  Headphones,
  User,
  ShieldCheck,
  FileDown,
  Volume2,
  Search,
  ListFilter,
  Lock,
  PlusCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  getNarrators,
  getStoryDrafts,
  saveStoryDraft,
  updateStoryDraft,
  generateStoryDraftWithAI,
  synthesizeSpeech,
  refineTranscriptProse,
} from '../services/api';
import type { Narrator, StoryDraft, StoryChapter } from '../types';
import { PreservationWorkflowFooter } from '../components/PreservationWorkflowFooter';

export const Screen13_LifeStoryBuilder: React.FC = () => {
  const { user } = useAuth();
  const { activeNarrator, setActiveNarrator, showToast, setCurrentScreen, uiLanguage, setIsAddNarratorOpen, setEditingNarrator } = useApp();

  const [narrators, setNarrators] = useState<Narrator[]>([]);
  const [selectedNarratorId, setSelectedNarratorId] = useState<string>(activeNarrator?.id || '');
  const [drafts, setDrafts] = useState<StoryDraft[]>([]);
  const [activeDraft, setActiveDraft] = useState<StoryDraft | null>(null);
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [languageCode, setLanguageCode] = useState<'ta' | 'en'>('ta');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playingChapterId, setPlayingChapterId] = useState<string | null>(null);
  const [refiningChapterId, setRefiningChapterId] = useState<string | null>(null);

  // Multi-tenant: Only narrators owned by current user can be accessed
  const userNarrators = narrators.filter((n) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return Boolean(
      (n.created_by && n.created_by === user.id) ||
      (n.creator_email && user.email && n.creator_email.toLowerCase() === user.email.toLowerCase())
    );
  });

  const currentNarrator = userNarrators.find((n) => n.id === selectedNarratorId) || (activeNarrator && userNarrators.find((n) => n.id === activeNarrator.id));
  const isOwner = Boolean(
    user &&
    (
      (currentNarrator?.created_by && user.id === currentNarrator.created_by) ||
      (currentNarrator?.creator_email && user.email && currentNarrator.creator_email.toLowerCase() === user.email.toLowerCase()) ||
      user.role === 'admin'
    )
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await getNarrators();
      setNarrators(list);

      const owned = list.filter((n) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        return Boolean(
          (n.created_by && n.created_by === user.id) ||
          (n.creator_email && user.email && n.creator_email.toLowerCase() === user.email.toLowerCase())
        );
      });

      const targetId =
        (selectedNarratorId && owned.some((n) => n.id === selectedNarratorId) && selectedNarratorId) ||
        (activeNarrator?.id && owned.some((n) => n.id === activeNarrator.id) && activeNarrator.id) ||
        owned[0]?.id ||
        '';

      if (targetId) {
        setSelectedNarratorId(targetId);
        const chosen = owned.find((n) => n.id === targetId);
        if (chosen) setActiveNarrator(chosen);

        const dList = await getStoryDrafts(targetId);
        setDrafts(dList);

        if (dList.length > 0) {
          const match = dList.find((d: any) => d.language_code === languageCode) || dList[0];
          setActiveDraft(match);
          setChapters(match.chapters || []);
          if (match.language_code) setLanguageCode(match.language_code as any);
        } else {
          setActiveDraft(null);
          setChapters([]);
        }
      } else {
        setSelectedNarratorId('');
        setActiveDraft(null);
        setChapters([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [selectedNarratorId]);

  const handleNarratorSwitch = async (id: string) => {
    setSelectedNarratorId(id);
    const chosen = narrators.find((n) => n.id === id);
    if (chosen) setActiveNarrator(chosen);
    setLoading(true);
    try {
      const dList = await getStoryDrafts(id);
      setDrafts(dList);
      if (dList.length > 0) {
        const match = dList.find((d: any) => d.language_code === languageCode) || dList[0];
        setActiveDraft(match);
        setChapters(match.chapters || []);
        if (match.language_code) setLanguageCode(match.language_code as any);
      } else {
        setActiveDraft(null);
        setChapters([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSwitch = async (newLang: 'ta' | 'en') => {
    setLanguageCode(newLang);
    let currentDrafts = drafts;

    if (selectedNarratorId) {
      try {
        currentDrafts = await getStoryDrafts(selectedNarratorId);
        setDrafts(currentDrafts);
      } catch (err) {
        console.error('Failed to reload drafts during language switch:', err);
      }
    }

    const matchingDraft = currentDrafts.find((d: any) => d.language_code === newLang);
    if (matchingDraft) {
      setActiveDraft(matchingDraft);
      setChapters(matchingDraft.chapters || []);
    } else {
      setActiveDraft(null);
      setChapters([]);
    }
  };

  const handleGenerateAI = async () => {
    if (!selectedNarratorId) return;
    try {
      setGenerating(true);
      const newDraft = await generateStoryDraftWithAI(selectedNarratorId, languageCode);
      setActiveDraft(newDraft);
      setChapters(newDraft.chapters || []);
      const freshList = await getStoryDrafts(selectedNarratorId);
      setDrafts(freshList);
      showToast(
        uiLanguage === 'ta'
          ? 'சரிபார்க்கப்பட்ட நினைவுகளில் இருந்து வாழ்க்கை வரலாறு வெற்றிகரமாக உருவாக்கப்பட்டது!'
          : 'Life biography draft synthesized from verified memories!'
      );
    } catch (err) {
      alert('Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedNarratorId) return;
    try {
      setSaving(true);
      if (activeDraft?.id) {
        await updateStoryDraft(activeDraft.id, {
          chapters,
          language_code: languageCode,
        });
      } else {
        const created = await saveStoryDraft(selectedNarratorId, {
          title: languageCode === 'en' ? 'Life Story Biography' : 'வாழ்க்கை வரலாறு — நினைவுக் களஞ்சியம்',
          language_code: languageCode,
          chapters,
        });
        setActiveDraft(created);
      }
      showToast(
        uiLanguage === 'ta'
          ? 'வரலாற்று வரைவு வெற்றிகரமாகச் சேமிக்கப்பட்டது!'
          : 'Biography draft saved successfully!'
      );
    } catch (err) {
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Reorder Chapters
  const moveChapter = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= chapters.length) return;

    const updated = [...chapters];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setChapters(updated);
  };

  const updateChapterContent = (id: string, newContent: string) => {
    setChapters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, content: newContent } : c))
    );
  };

  const handleRefineChapter = async (chapterId: string, currentContent: string) => {
    if (!currentContent || !currentContent.trim()) return;
    try {
      setRefiningChapterId(chapterId);
      const res = await refineTranscriptProse(currentContent);
      if (res.refined_text) {
        updateChapterContent(chapterId, res.refined_text);
        showToast(
          uiLanguage === 'ta'
            ? 'அத்தியாயம் இலக்கண ரீதியாகச் செப்பனிடப்பட்டு நயமான உரைநடையாக மாற்றப்பட்டது!'
            : 'Chapter refined into grammatically correct written Tamil prose!'
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Refinement failed');
    } finally {
      setRefiningChapterId(null);
    }
  };

  const handlePlayChapterAudio = async (chapter: StoryChapter) => {
    if (!chapter.content) return;
    if (playingChapterId === chapter.id) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setPlayingChapterId(null);
      return;
    }

    try {
      setPlayingChapterId(chapter.id);
      const res = await synthesizeSpeech(chapter.content.substring(0, 480), 'kavitha');
      if (res && res.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${res.audioBase64}`);
        audio.onended = () => setPlayingChapterId(null);
        audio.onerror = () => setPlayingChapterId(null);
        await audio.play();
        return;
      }
    } catch (ttsErr) {
      console.warn('Backend TTS notice, falling back to browser speech synthesis:', ttsErr);
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(chapter.content);
      utterance.lang = languageCode === 'ta' ? 'ta-IN' : 'en-US';
      utterance.rate = 0.92;
      utterance.onend = () => setPlayingChapterId(null);
      utterance.onerror = () => setPlayingChapterId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setPlayingChapterId(null);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '960px' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <span className="badge-pill" style={{ marginBottom: '8px' }}>
            {uiLanguage === 'ta' ? 'வாழ்க்கை வரலாற்று உருவாக்கம்' : 'Biography Synthesis'}
          </span>
          <h1 style={{ fontSize: '30px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginTop: '4px' }}>
            {uiLanguage === 'ta' ? 'வாழ்க்கை வரலாறு தயாரிப்பாளர்' : 'Life Story Builder'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '6px' }}>
            {uiLanguage === 'ta'
              ? 'சரிபார்க்கப்பட்ட நேர்காணல் நினைவுகளை ஒரு அழகான சுயசரிதைப் புத்தகமாகத் தொகுக்கவும்'
              : 'Combine reviewed memories and transcripts into a readable chapter-by-chapter biography'}
          </p>
        </div>

        {userNarrators.length === 0 ? null : (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Language Toggle in pill form */}
            <div
              style={{
                background: '#FAF9F8',
                borderRadius: '9999px',
                padding: '4px',
                display: 'flex',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                style={{
                  border: 'none',
                  background: languageCode === 'ta' ? 'var(--slate-taupe-dark)' : 'transparent',
                  color: languageCode === 'ta' ? '#FFFFFF' : 'var(--slate-taupe-dark)',
                  borderRadius: '9999px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => handleLanguageSwitch('ta')}
              >
                தமிழ் பதிப்பு
              </button>
              <button
                style={{
                  border: 'none',
                  background: languageCode === 'en' ? 'var(--slate-taupe-dark)' : 'transparent',
                  color: languageCode === 'en' ? '#FFFFFF' : 'var(--slate-taupe-dark)',
                  borderRadius: '9999px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => handleLanguageSwitch('en')}
              >
                English Edition
              </button>
            </div>

            {isOwner ? (
              <>
                <button
                  className="btn-pill-accent"
                  onClick={handleGenerateAI}
                  disabled={generating}
                >
                  <Sparkles size={16} />
                  <span>{generating ? 'Synthesizing...' : uiLanguage === 'ta' ? 'வரைவு உருவாக்குக' : 'Generate AI Draft'}</span>
                </button>

                <button
                  className="btn-pill-primary"
                  onClick={handleSaveDraft}
                  disabled={saving}
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : uiLanguage === 'ta' ? 'வரைவைச் சேமிக்க' : 'Save Draft'}</span>
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '11px',
                    }}
                  >
                    ↗
                  </span>
                </button>
              </>
            ) : (
              <div
                className="badge-pill"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  fontSize: '13px',
                  background: 'var(--slate-bg-tint)',
                  color: 'var(--slate-taupe-dark)',
                }}
              >
                <Lock size={14} />
                <span>{uiLanguage === 'ta' ? 'பார்வையாளர் பயன்முறை (Reader Mode)' : 'Reader Mode · Verified Story'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          {uiLanguage === 'ta' ? 'வாழ்க்கைக் கதையை ஏற்றுகிறது...' : 'Loading life story draft...'}
        </div>
      ) : userNarrators.length === 0 ? (
        <div
          className="modern-card tinted"
          style={{ textAlign: 'center', padding: '60px 20px', alignItems: 'center', marginTop: '16px' }}
        >
          <div className="card-top-icon tinted" style={{ width: '56px', height: '56px', margin: '0 auto 16px' }}>
            <BookOpen size={24} />
          </div>
          <h3 style={{ fontSize: '20px', color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
            {uiLanguage === 'ta' ? 'தங்களின் குடும்ப நினைவாளர்கள் இன்னும் சேர்க்கப்படவில்லை' : 'No Family Narrators Found'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '460px', margin: '0 auto 24px', lineHeight: '1.6' }}>
            {uiLanguage === 'ta'
              ? 'வாழ்க்கைக் கதைகளை அத்தியாயங்களாகத் தொகுக்க, முதலில் தங்களின் குடும்ப நினைவாளரைச் சேர்க்கவும்.'
              : 'To compose and synthesize verified life story chapters, please add a narrator to your family account first.'}
          </p>
          <button
            className="btn-pill-primary"
            onClick={() => {
              setEditingNarrator(null);
              setIsAddNarratorOpen(true);
            }}
          >
            <PlusCircle size={16} />
            <span>{uiLanguage === 'ta' ? 'நினைவாளர் சேர்க்க' : 'Add First Narrator'}</span>
          </button>
        </div>
      ) : (
        <>
          {/* Search and Filters: Separate Independent Elements (as in Screenshot) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '26px',
              flexWrap: 'wrap',
              width: '100%',
            }}
          >
            {/* 1. Left: Search Input Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flex: '1 1 320px',
                minWidth: '220px',
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '9px 14px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
            >
              <Search size={16} color="#4B5563" style={{ flexShrink: 0 }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  uiLanguage === 'ta'
                    ? 'அத்தியாயம் அல்லது உரை வரிகளில் தேடுக...'
                    : 'Search chapters by title or content...'
                }
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  background: 'transparent',
                  color: '#1F2937',
                  fontWeight: 400,
                }}
              />
            </div>

            {/* 2. Middle: Profile Icon with Narrator Select Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '9px 14px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                flexShrink: 0,
              }}
            >
              <User size={16} color="#4B5563" style={{ flexShrink: 0 }} />
              <select
                value={selectedNarratorId}
                onChange={(e) => handleNarratorSwitch(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '14px',
                  color: '#1F2937',
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer',
                  paddingRight: '6px',
                }}
              >
                {userNarrators.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.full_name_tamil || n.full_name_english} ({n.preferred_name || 'Narrator'})
                  </option>
                ))}
              </select>
            </div>

        {/* 3. Right: Draft Version & Export Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '7px 14px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
            flexShrink: 0,
          }}
        >
          <ListFilter size={16} color="#4B5563" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
            {uiLanguage === 'ta' ? 'வரைவு:' : 'Draft:'} <strong>v{activeDraft?.version || 1}</strong>
          </span>
          <button
            onClick={() => setCurrentScreen('export')}
            style={{
              border: 'none',
              background: '#F3F4F6',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--slate-taupe-dark)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <FileDown size={13} />
            <span>{uiLanguage === 'ta' ? 'ஏற்றுமதி' : 'Export'}</span>
          </button>
        </div>
      </div>

      {/* Hallucination Guard Alert */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px 22px',
          background: 'var(--slate-bg-tint)',
          borderRadius: '22px',
          borderLeft: '4px solid var(--accent-green)',
          fontSize: '13px',
          color: 'var(--slate-taupe-dark)',
          marginBottom: '28px',
          lineHeight: 1.5,
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#FFFFFF',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={18} color="var(--accent-green)" />
        </div>
        <div>
          <strong>Essential Rule:</strong> The AI distinguishes confirmed facts from missing details. It never invents dates, family relationships, or achievements.
        </div>
      </div>

      {/* Chapters Editor List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading life story draft...
        </div>
      ) : chapters.length === 0 ? (
        <div
          className="modern-card"
          style={{ textAlign: 'center', padding: '56px 24px', background: '#FFFFFF', border: '1px dashed var(--border-subtle)', borderRadius: '32px' }}
        >
          <BookOpen size={40} color="var(--slate-taupe-dark)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
            {languageCode === 'en'
              ? 'No English Biography Draft Yet'
              : uiLanguage === 'ta'
              ? 'வரைவு இன்னும் உருவாக்கப்படவில்லை'
              : 'No Biography Draft Yet'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '440px', margin: '0 auto 24px' }}>
            {languageCode === 'en'
              ? 'Click "Generate AI Draft" to synthesize the English edition from reviewed memories and transcripts.'
              : uiLanguage === 'ta'
              ? 'சரிபார்க்கப்பட்ட நேர்காணல்களில் இருந்து அத்தியாயங்களை உருவாக்க "வரைவு உருவாக்குக" என்பதை அழுத்தவும்.'
              : 'Click "Generate AI Draft" to synthesize reviewed transcripts into the standard life story chapters.'}
          </p>
          <button className="btn-pill-primary" onClick={handleGenerateAI} disabled={generating}>
            <Sparkles size={16} />
            <span>
              {generating
                ? (languageCode === 'en' ? 'Synthesizing English Draft...' : 'உருவாக்கப்படுகிறது...')
                : languageCode === 'en'
                ? 'Generate English Biography Draft'
                : uiLanguage === 'ta'
                ? 'வரைவு உருவாக்குக'
                : 'Generate Draft from Reviewed Transcripts'}
            </span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {chapters.filter((c) => !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.content.toLowerCase().includes(search.toLowerCase())).map((chapter, index) => (
            <div
              key={chapter.id}
              className="modern-card"
              style={{
                borderRadius: '28px',
                padding: '28px 32px',
                border: '1px solid var(--border-card)',
                boxShadow: '0 8px 24px rgba(94, 86, 83, 0.04)',
              }}
            >
              {/* Chapter Header with Reordering controls */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="badge-pill" style={{ fontSize: '11px' }}>
                    Chapter {index + 1}
                  </span>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-taupe-dark)', margin: 0 }}>
                    {chapter.title}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Reorder Up strictly for owner */}
                  {isOwner && (
                    <button
                      disabled={index === 0}
                      onClick={() => moveChapter(index, 'up')}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#FAF9F8',
                        border: '1px solid var(--border-subtle)',
                        color: index === 0 ? 'var(--border-subtle)' : 'var(--slate-taupe-dark)',
                        cursor: index === 0 ? 'default' : 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                      title="Move chapter up"
                    >
                      <ArrowUp size={15} />
                    </button>
                  )}

                  {/* Reorder Down strictly for owner */}
                  {isOwner && (
                    <button
                      disabled={index === chapters.length - 1}
                      onClick={() => moveChapter(index, 'down')}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#FAF9F8',
                        border: '1px solid var(--border-subtle)',
                        color: index === chapters.length - 1 ? 'var(--border-subtle)' : 'var(--slate-taupe-dark)',
                        cursor: index === chapters.length - 1 ? 'default' : 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                      title="Move chapter down"
                    >
                      <ArrowDown size={15} />
                    </button>
                  )}

                  {/* Listen Aloud */}
                  <button
                    className="btn-pill-outline"
                    style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => handlePlayChapterAudio(chapter)}
                    title={playingChapterId === chapter.id ? 'Stop audio' : 'Listen aloud'}
                  >
                    <Volume2 size={13} />
                    <span>
                      {playingChapterId === chapter.id
                        ? (uiLanguage === 'ta' ? 'நிறுத்து' : 'Stop')
                        : (uiLanguage === 'ta' ? 'கேட்க' : 'Listen')}
                    </span>
                  </button>

                  {/* Edit Toggle strictly for owner */}
                  {isOwner && (
                    <button
                      className="btn-pill-outline"
                      style={{ padding: '6px 14px', fontSize: '12px' }}
                      onClick={() =>
                        setEditingChapterId(editingChapterId === chapter.id ? null : chapter.id)
                      }
                    >
                      <Edit2 size={13} />
                      <span>{editingChapterId === chapter.id ? 'Done' : 'Edit'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Chapter Body: Text or In-place Editor */}
              {isOwner && editingChapterId === chapter.id ? (
                <div>
                  <textarea
                    rows={6}
                    value={chapter.content}
                    onChange={(e) => updateChapterContent(chapter.id, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '16px 18px',
                      borderRadius: '20px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '15px',
                      lineHeight: 1.8,
                      fontFamily: 'inherit',
                      color: 'var(--slate-taupe-dark)',
                      background: '#FAF9F8',
                      resize: 'vertical',
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-pill-secondary"
                      style={{ padding: '6px 14px', fontSize: '12px', background: '#F4ECE4', borderColor: '#E5D6C5', color: '#6A432D', fontWeight: 700 }}
                      onClick={() => handleRefineChapter(chapter.id, chapter.content)}
                      disabled={refiningChapterId === chapter.id || !chapter.content}
                      title="பேச்சு வழக்கினை இலக்கண ரீதியான தூய எழுத்துத் தமிழாக மாற்றும்"
                    >
                      <Sparkles size={13} color="#8C5338" />
                      <span>
                        {refiningChapterId === chapter.id
                          ? (uiLanguage === 'ta' ? 'மாற்றுகிறது...' : 'Refining...')
                          : (uiLanguage === 'ta' ? 'இலக்கணச் சீரமைப்பு' : 'Refine to Written Prose')}
                      </span>
                    </button>

                    <button
                      className="btn-pill-primary"
                      style={{ padding: '8px 18px', fontSize: '12px' }}
                      onClick={() => setEditingChapterId(null)}
                    >
                      {uiLanguage === 'ta' ? 'முடிந்தது' : 'Done Editing'}
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  style={{
                    fontSize: '15px',
                    lineHeight: 1.8,
                    color: 'var(--slate-taupe-dark)',
                    margin: 0,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {chapter.content}
                </p>
              )}

              {/* Link to source audio recordings if available */}
              {chapter.recording_ids && chapter.recording_ids.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '18px',
                    paddingTop: '12px',
                    borderTop: '1px dashed var(--border-subtle)',
                    fontSize: '12px',
                    color: 'var(--slate-gray)',
                  }}
                >
                  <Headphones size={13} color="var(--accent-green)" />
                  <span>Linked to original oral recordings: <strong>{chapter.recording_ids.length} voice excerpt(s)</strong></span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* 6-Step Workflow Footer */}
      <PreservationWorkflowFooter
        currentStep="story_builder"
        onPrev={() => setCurrentScreen('timeline')}
        onNext={() => setCurrentScreen('export')}
        customPrevLabel={{
          en: 'Previous: Memories & Timeline',
          ta: 'முந்தைய படி: நினைவுகள் & காலவரிசை',
        }}
        customNextLabel={{
          en: 'Next Step: Export & Archive',
          ta: 'அடுத்த படி: ஏற்றுமதி & ஆவணம்',
        }}
      />
    </div>
  );
};
