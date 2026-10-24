import React, { useEffect, useState } from 'react';
import {
  User,
  Mic,
  Clock,
  BookOpen,
  Download,
  Calendar,
  MapPin,
  Languages,
  Headphones,
  FileText,
  Heart,
  PlusCircle,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Search,
  Lock,
  Eye,
  CheckCircle2,
  ChevronRight,
  Volume2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getNarratorById } from '../services/api';
import type { NarratorDetail, StoryDraft, StoryChapter } from '../types';
import { AudioPlayer } from '../components/AudioPlayer';
import { PageNavigationFooter } from '../components/PageNavigationFooter';

export const Screen6_NarratorProfile: React.FC = () => {
  const { user } = useAuth();
  const {
    activeNarrator,
    setCurrentScreen,
    goToNewInterview,
    goToInterview,
    setActiveRecordingForReview,
    setIsTranscriptModalOpen,
    uiLanguage,
    initialProfileTab,
  } = useApp();

  const [narrator, setNarrator] = useState<NarratorDetail | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'lifestory' | 'timeline' | 'sessions' | 'recordings' | 'transcripts'
  >((initialProfileTab as any) || 'overview');
  const [loading, setLoading] = useState(true);

  // Sync activeTab whenever initialProfileTab changes (e.g. from Inspiring Journeys)
  useEffect(() => {
    if (initialProfileTab) {
      setActiveTab(initialProfileTab as any);
    }
  }, [initialProfileTab, activeNarrator?.id]);

  // Life story tab state
  const [storyLang, setStoryLang] = useState<'ta' | 'en'>('ta');
  const [selectedChapterIdx, setSelectedChapterIdx] = useState<number>(0);

  const loadProfile = async () => {
    if (!activeNarrator?.id) return;
    try {
      setLoading(true);
      const data = await getNarratorById(activeNarrator.id);
      setNarrator(data);
    } catch (err) {
      console.error('Failed to load narrator profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [activeNarrator?.id]);

  // Ownership permission check
  const isOwner = Boolean(
    user &&
      ((narrator?.created_by && user.id === narrator.created_by) ||
        (narrator?.creator_email && user.email?.toLowerCase() === narrator.creator_email.toLowerCase()) ||
        user.role === 'admin')
  );

  // If a non-owner somehow lands on a restricted tab, fall back to overview or lifestory
  useEffect(() => {
    if (!isOwner && (activeTab === 'sessions' || activeTab === 'recordings' || activeTab === 'transcripts')) {
      setActiveTab('overview');
    }
  }, [isOwner, activeTab]);

  if (!activeNarrator) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ color: 'var(--text-muted)' }}>No narrator selected.</p>
        <button
          className="btn-pill-primary"
          style={{ marginTop: '14px' }}
          onClick={() => setCurrentScreen('narrators')}
        >
          Go to Narrators
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
        Loading verified archive profile...
      </div>
    );
  }

  const name = narrator?.full_name_tamil || narrator?.full_name_english || 'Narrator';
  const sessions = narrator?.sessions || [];
  const recordings = narrator?.recordings || [];
  const timeline = narrator?.timeline || [];
  const drafts: StoryDraft[] = (narrator?.drafts as StoryDraft[]) || [];

  // Match story draft by language preference
  const currentDraft =
    drafts.find((d) => d.language_code === storyLang) ||
    drafts.find((d) => d.language_code === 'ta') ||
    drafts[0];

  const chapters: StoryChapter[] = (currentDraft?.chapters as StoryChapter[]) || [];
  const activeChapter = chapters[selectedChapterIdx] || chapters[0];

  // Allowed tabs based on permissions
  const availableTabs = [
    { id: 'overview', labelTa: '1. மேலோட்டம்', labelEn: '1. Overview', icon: <User size={15} /> },
    {
      id: 'lifestory',
      labelTa: `2. வாழ்க்கை வரலாறு (${chapters.length})`,
      labelEn: `2. Life Story Book (${chapters.length})`,
      icon: <BookOpen size={15} />,
    },
    {
      id: 'timeline',
      labelTa: `3. காலவரிசை (${timeline.length})`,
      labelEn: `3. Chronological Timeline (${timeline.length})`,
      icon: <Clock size={15} />,
    },
    ...(isOwner
      ? [
          {
            id: 'sessions',
            labelTa: `4. அமர்வுகள் (${sessions.length})`,
            labelEn: `4. Sessions (${sessions.length})`,
            icon: <Mic size={15} />,
          },
          {
            id: 'recordings',
            labelTa: `5. குரல் பதிவுகள் (${recordings.length})`,
            labelEn: `5. Recordings (${recordings.length})`,
            icon: <Headphones size={15} />,
          },
          {
            id: 'transcripts',
            labelTa: '6. உரையாடல் பிரதிகள்',
            labelEn: '6. Transcripts',
            icon: <FileText size={15} />,
          },
        ]
      : []),
  ];

  return (
    <div className="page-container" style={{ maxWidth: '1160px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Breadcrumb & Status Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <button
          onClick={() => setCurrentScreen('narrators')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--slate-gray)',
            fontSize: '13.5px',
            fontWeight: 700,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Narrators Directory</span>
        </button>

        {/* Access Badge */}
        {isOwner ? (
          <span
            className="badge-pill"
            style={{
              background: 'rgba(140, 83, 56, 0.12)',
              color: 'var(--accent-green)',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '12px',
            }}
          >
            <ShieldCheck size={14} />
            <span>Primary Archivist (Full Editing Access)</span>
          </span>
        ) : (
          <span
            className="badge-pill"
            style={{
              background: 'rgba(47, 42, 40, 0.08)',
              color: 'var(--slate-taupe-dark)',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '12px',
            }}
          >
            <Eye size={14} />
            <span>
              Family Reader Mode • Curated by {narrator?.creator_name || narrator?.creator_email || 'Archivist'}
            </span>
          </span>
        )}
      </div>

      {/* Hero Header Card */}
      <div
        className="modern-card tinted"
        style={{
          padding: '36px 40px',
          marginBottom: '32px',
          background: 'linear-gradient(135deg, #FDFBF7 0%, #F8F4EE 100%)',
          border: '1.5px solid #E8DFD5',
          borderRadius: '24px',
          boxShadow: '0 8px 30px rgba(47, 42, 40, 0.05)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle decorative gold line at top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #8C5338, #C48232, #8C5338)',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '28px',
          }}
        >
          {/* Avatar and Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '92px',
                height: '92px',
                borderRadius: '50%',
                background: 'linear-gradient(145deg, #8C5338, #5A321E)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '38px',
                fontWeight: 800,
                boxShadow: '0 8px 24px rgba(140, 83, 56, 0.3)',
                border: '3px solid #FFFFFF',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {narrator?.profile_photo_url ? (
                <img
                  src={narrator.profile_photo_url}
                  alt={name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                name.charAt(0)
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h1
                  style={{
                    fontSize: 'clamp(26px, 3.8vw, 38px)',
                    color: 'var(--slate-taupe-dark)',
                    margin: 0,
                    fontWeight: 800,
                    letterSpacing: '-0.5px',
                  }}
                >
                  {name}
                </h1>
                {narrator?.preferred_name && (
                  <span
                    className="badge-pill"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2D9CC',
                      color: 'var(--accent-green)',
                      fontWeight: 700,
                      padding: '4px 12px',
                      fontSize: '12.5px',
                    }}
                  >
                    {narrator.preferred_name}
                  </span>
                )}
              </div>

              {narrator?.full_name_english && narrator?.full_name_tamil && (
                <p
                  style={{
                    fontSize: '16.5px',
                    color: 'var(--slate-gray)',
                    marginTop: '3px',
                    fontWeight: 600,
                    marginBottom: '8px',
                  }}
                >
                  {narrator.full_name_english}
                </p>
              )}

              {/* Badges metadata row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  fontSize: '13.5px',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  flexWrap: 'wrap',
                  marginTop: '8px',
                }}
              >
                {narrator?.birth_year && (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#FFFFFF',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: '1px solid #EAE3D9',
                    }}
                  >
                    <Calendar size={13} color="var(--accent-green)" />
                    <span>Born {narrator.birth_year}</span>
                  </span>
                )}
                {narrator?.place_of_birth && (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#FFFFFF',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: '1px solid #EAE3D9',
                    }}
                  >
                    <MapPin size={13} color="var(--accent-green)" />
                    <span>{narrator.place_of_birth}</span>
                  </span>
                )}
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: '#FFFFFF',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid #EAE3D9',
                  }}
                >
                  <Languages size={13} color="var(--accent-green)" />
                  <span>{narrator?.tamil_dialect || 'Kongu Tamil (கொங்குத் தமிழ்)'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Contextual Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              alignItems: 'center',
              marginLeft: isOwner ? undefined : 'auto',
            }}
          >
            {isOwner ? (
              <>
                <button
                  className="btn-pill-primary"
                  onClick={() => goToNewInterview(narrator!)}
                  title="Start a new oral interview"
                >
                  <Mic size={15} />
                  <span>{uiLanguage === 'ta' ? 'புதிய நேர்காணல்' : 'New Interview'}</span>
                </button>

                {sessions.find((s) => s.status === 'in_progress') && (
                  <button
                    className="btn-pill-accent"
                    onClick={() => goToInterview(sessions.find((s) => s.status === 'in_progress')!)}
                    title="Resume active interview session"
                  >
                    <ArrowRight size={15} />
                    <span>Continue Interview</span>
                  </button>
                )}

                <button
                  className="btn-pill-outline"
                  onClick={() => setActiveTab('lifestory')}
                  title="Read Life Story"
                >
                  <BookOpen size={15} />
                  <span>Life Story</span>
                </button>

                <button
                  className="btn-pill-outline"
                  onClick={() => setCurrentScreen('export')}
                  title="Export archive as PDF"
                >
                  <Download size={15} />
                  <span>Export</span>
                </button>
              </>
            ) : (
              /* Non-Owner Reader Action: Keep only Read Life Story positioned at right side */
              <button
                className="btn-pill-primary"
                onClick={() => setActiveTab('lifestory')}
                title="Read full authentic life story"
                style={{
                  padding: '12px 24px',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                }}
              >
                <BookOpen size={16} />
                <span>{uiLanguage === 'ta' ? 'வாழ்க்கைக் கதை வாசிக்க' : 'READ LIFE STORY'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modern Adaptive Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '28px',
          overflowX: 'auto',
          paddingBottom: '6px',
        }}
      >
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`btn-pill-outline ${activeTab === tab.id ? 'active' : ''}`}
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 700,
              background: activeTab === tab.id ? 'var(--slate-taupe-dark)' : '#FFFFFF',
              color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-primary)',
              borderColor: activeTab === tab.id ? 'var(--slate-taupe-dark)' : 'var(--border-subtle)',
              whiteSpace: 'nowrap',
              borderRadius: '50px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.18s ease',
            }}
          >
            {tab.icon}
            <span>{uiLanguage === 'ta' ? tab.labelTa : tab.labelEn}</span>
          </button>
        ))}
      </div>

      {/* =========================================================================
          TAB 1: OVERVIEW
         ========================================================================= */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
          {/* Permission Mode Banner */}
          {!isOwner ? (
            <div
              style={{
                background: 'linear-gradient(135deg, #FFFDF9 0%, #FAF6EE 100%)',
                border: '1.5px solid #EAE0D2',
                borderRadius: '16px',
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'rgba(140, 83, 56, 0.12)',
                    color: 'var(--accent-green)',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <BookOpen size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>
                    Family Heritage Reader Mode Active
                  </h4>
                  <p style={{ margin: '3px 0 0', fontSize: '13.5px', color: 'var(--text-muted)' }}>
                    You are exploring the preserved oral archive of <strong>{name}</strong>, curated by{' '}
                    <strong>{narrator?.creator_name || narrator?.creator_email || 'the Family Archivist'}</strong>.
                    You have full access to read the Life Story and explore the chronological timeline milestones.
                  </p>
                </div>
              </div>

              <button
                className="btn-pill-primary"
                style={{ padding: '8px 18px', fontSize: '12.5px' }}
                onClick={() => setActiveTab('lifestory')}
              >
                <span>Read Life Story Book</span>
                <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            <div
              style={{
                background: 'linear-gradient(135deg, #F9FBF9 0%, #EEF4EE 100%)',
                border: '1.5px solid #D2E4D2',
                borderRadius: '16px',
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'rgba(140, 83, 56, 0.12)',
                    color: 'var(--accent-green)',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>
                    Archivist Studio Control Room
                  </h4>
                  <p style={{ margin: '3px 0 0', fontSize: '13.5px', color: 'var(--text-muted)' }}>
                    Welcome back, <strong>{user?.fullName || 'Archivist'}</strong>. You are the designated curator of
                    this oral history archive. You have full access to record interviews, review transcripts, and
                    publish chapters.
                  </p>
                </div>
              </div>

              <button
                className="btn-pill-primary"
                style={{ padding: '8px 18px', fontSize: '12.5px' }}
                onClick={() => goToNewInterview(narrator!)}
              >
                <Mic size={14} />
                <span>Start New Interview</span>
              </button>
            </div>
          )}

          {/* 3 Main Heritage Grid Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '24px',
            }}
          >
            {/* Card 1: Life Story Overview & Authentic Narrative */}
            <div
              className="modern-card"
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '30px',
                border: '1px solid #E8DFD5',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <span
                    className="badge-pill"
                    style={{
                      fontSize: '11px',
                      background: 'rgba(140, 83, 56, 0.12)',
                      color: 'var(--accent-green)',
                    }}
                  >
                    {uiLanguage === 'ta' ? 'வாழ்க்கைப் பின்னணி' : 'Life Biography'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Oral Heritage Edition
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: 'var(--slate-taupe-dark)',
                    marginBottom: '14px',
                  }}
                >
                  {uiLanguage === 'ta' ? 'வாழ்க்கைப் பின்னணிச் சுருக்கம்' : 'Life Story Overview'}
                </h3>

                <p
                  style={{
                    fontSize: '15px',
                    lineHeight: 1.8,
                    color: 'var(--slate-taupe-dark)',
                    margin: 0,
                  }}
                >
                  {narrator?.full_name_tamil || narrator?.full_name_english}
                  {narrator?.birth_year ? ` அவர்கள் ${narrator.birth_year} ஆம் ஆண்டு பிறந்தார்.` : ''}
                  {narrator?.place_of_birth ? ` சொந்த ஊர்: ${narrator.place_of_birth}.` : ''}
                  {narrator?.preferred_name
                    ? ` குடும்பத்தினரால் '${narrator.preferred_name}' என்று அன்போடு அழைக்கப்படுகிறார்.`
                    : ''}
                  {narrator?.tamil_dialect ? ` இவரது தமிழ் வட்டார வழக்கு: ${narrator.tamil_dialect}.` : ''}{' '}
                  {uiLanguage === 'ta'
                    ? 'இவரது வாய்மொழி வரலாற்றுப் பதிவுகளும் குடும்ப நினைவுகளும் இங்கு பாதுகாப்பாக ஆவணப்படுத்தப்பட்டு வருகின்றன.'
                    : 'Their authentic oral memories and personal life stories are safely preserved here.'}
                </p>
              </div>

              {/* Dialectical highlight note */}
              <div
                style={{
                  marginTop: '22px',
                  padding: '16px 20px',
                  background: 'var(--bg-app)',
                  borderRadius: '14px',
                  borderLeft: '4px solid var(--accent-green)',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'var(--slate-taupe-dark)',
                    marginBottom: '4px',
                  }}
                >
                  Archival Preservation Status:
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                  {sessions.length} sessions recorded · {recordings.length} voice answers preserved · {timeline.length}{' '}
                  verified life milestones.
                </p>
              </div>
            </div>

            {/* Card 2: Archive Vault & Quick Stats */}
            <div
              className="modern-card tinted"
              style={{
                background: 'linear-gradient(135deg, #FDFBF7 0%, #F6F1EA 100%)',
                borderRadius: '20px',
                padding: '30px',
                border: '1.5px solid #E8DFD5',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <span
                    className="badge-pill"
                    style={{
                      fontSize: '11px',
                      background: 'rgba(47, 42, 40, 0.1)',
                      color: 'var(--slate-taupe-dark)',
                    }}
                  >
                    Preservation Vault
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Bilingual Edition
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: 'var(--slate-taupe-dark)',
                    marginBottom: '18px',
                  }}
                >
                  Archive Metrics & Preservation
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingBottom: '10px',
                      borderBottom: '1px solid rgba(47, 42, 40, 0.08)',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>Life Milestones Preserved:</span>
                    <span style={{ fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>{timeline.length} events</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingBottom: '10px',
                      borderBottom: '1px solid rgba(47, 42, 40, 0.08)',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>Oral History Sessions:</span>
                    <span style={{ fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>{sessions.length} sessions</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingBottom: '10px',
                      borderBottom: '1px solid rgba(47, 42, 40, 0.08)',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>Voice Audio Stories:</span>
                    <span style={{ fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>{recordings.length} master takes</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Tamil Dialect Nuance:</span>
                    <span style={{ fontWeight: 800, color: 'var(--accent-green)' }}>
                      {narrator?.tamil_dialect || 'Kongu Tamil'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {isOwner ? (
                <button
                  className="btn-pill-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '24px' }}
                  onClick={() => goToNewInterview(narrator!)}
                >
                  <Mic size={16} />
                  <span>Start Next Interview</span>
                </button>
              ) : (
                <button
                  className="btn-pill-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '24px' }}
                  onClick={() => setActiveTab('lifestory')}
                >
                  <BookOpen size={16} />
                  <span>Read Complete Life Story</span>
                </button>
              )}
            </div>

            {/* Card 3: Featured Milestones Preview */}
            <div
              className="modern-card"
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '30px',
                border: '1px solid #E8DFD5',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <span
                    className="badge-pill"
                    style={{
                      fontSize: '11px',
                      background: 'rgba(196, 130, 50, 0.15)',
                      color: '#C48232',
                    }}
                  >
                    Milestone Highlights
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: 'var(--slate-taupe-dark)',
                    marginBottom: '16px',
                  }}
                >
                  Key Historical Events
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {timeline.slice(0, 3).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      onClick={() => setActiveTab('timeline')}
                      style={{
                        padding: '12px 14px',
                        background: 'var(--bg-app)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '4px',
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>
                          {item.title}
                        </span>
                        {item.approximate_year && (
                          <span
                            className="badge-pill"
                            style={{ fontSize: '10.5px', background: '#FFFFFF', padding: '2px 8px' }}
                          >
                            {item.approximate_year}
                          </span>
                        )}
                      </div>
                      {item.place_name && (
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                          📍 {item.place_name}
                        </p>
                      )}
                    </div>
                  ))}
                  {timeline.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                      No milestones recorded yet.
                    </p>
                  )}
                </div>
              </div>

              <button
                className="btn-pill-outline"
                style={{ width: '100%', justifyContent: 'center', marginTop: '20px', fontSize: '12.5px' }}
                onClick={() => setActiveTab('timeline')}
              >
                <span>Explore All {timeline.length} Milestones</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: LIFE STORY BOOK (Integrated Reading View for All Users)
         ========================================================================= */}
      {activeTab === 'lifestory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Bar for Life Story */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              padding: '18px 24px',
              background: '#FFFFFF',
              borderRadius: '18px',
              border: '1px solid #E8DFD5',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>
                {uiLanguage === 'ta' ? 'வாழ்க்கை வரலாறு புத்தகம்' : 'Life Story Biography Book'}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--text-muted)' }}>
                {currentDraft?.title || `${name}'s Life Story`}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Language Switcher */}
              <div
                style={{
                  display: 'flex',
                  background: 'var(--slate-bg-tint)',
                  borderRadius: '50px',
                  padding: '3px',
                }}
              >
                <button
                  onClick={() => setStoryLang('ta')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '50px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: storyLang === 'ta' ? 'var(--slate-taupe-dark)' : 'transparent',
                    color: storyLang === 'ta' ? '#FFFFFF' : 'var(--text-muted)',
                  }}
                >
                  தமிழ் பதிப்பு
                </button>
                <button
                  onClick={() => setStoryLang('en')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '50px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: storyLang === 'en' ? 'var(--slate-taupe-dark)' : 'transparent',
                    color: storyLang === 'en' ? '#FFFFFF' : 'var(--text-muted)',
                  }}
                >
                  English Edition
                </button>
              </div>

              <button
                className="btn-pill-primary"
                style={{ padding: '8px 16px', fontSize: '12px' }}
                onClick={() => setCurrentScreen('export')}
                title="Download verified PDF"
              >
                <Download size={13} />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Chapters and Reader Pane */}
          {chapters.length === 0 ? (
            <div
              className="modern-card"
              style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}
            >
              <BookOpen size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ fontSize: '16px', fontWeight: 700 }}>No story chapters generated yet.</p>
              <p style={{ fontSize: '14px', marginTop: '6px' }}>
                Open the LifeStory Builder to synthesize biography chapters from oral interviews.
              </p>
              <button
                className="btn-pill-primary"
                style={{ marginTop: '16px' }}
                onClick={() => setCurrentScreen('story_builder')}
              >
                Go to LifeStory Builder
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(260px, 320px) 1fr',
                gap: '24px',
                alignItems: 'start',
              }}
            >
              {/* Left Column: Chapters Navigation */}
              <div
                className="modern-card"
                style={{
                  background: '#FFFFFF',
                  borderRadius: '18px',
                  padding: '20px',
                  border: '1px solid #E8DFD5',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginBottom: '6px',
                    letterSpacing: '0.6px',
                  }}
                >
                  Table of Contents ({chapters.length} Chapters)
                </div>

                {chapters.map((chap, idx) => (
                  <button
                    key={chap.id || idx}
                    onClick={() => setSelectedChapterIdx(idx)}
                    style={{
                      textAlign: 'left',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: 'none',
                      background:
                        selectedChapterIdx === idx ? 'rgba(140, 83, 56, 0.12)' : 'transparent',
                      color:
                        selectedChapterIdx === idx ? 'var(--accent-green)' : 'var(--slate-taupe-dark)',
                      fontWeight: selectedChapterIdx === idx ? 800 : 600,
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chap.chapter_number || idx + 1}. {chap.title}
                    </span>
                    {selectedChapterIdx === idx && <ChevronRight size={14} />}
                  </button>
                ))}
              </div>

              {/* Right Column: Book Page Reader View */}
              {activeChapter && (
                <div
                  className="modern-card"
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '20px',
                    padding: '36px 44px',
                    border: '1px solid #E8DFD5',
                    boxShadow: '0 4px 20px rgba(47, 42, 40, 0.04)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '20px',
                      paddingBottom: '16px',
                      borderBottom: '1px solid #EFEAE2',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <span
                        className="badge-pill"
                        style={{
                          fontSize: '11px',
                          background: 'rgba(140, 83, 56, 0.12)',
                          color: 'var(--accent-green)',
                          marginBottom: '8px',
                        }}
                      >
                        Chapter {activeChapter.chapter_number || selectedChapterIdx + 1}
                      </span>
                      <h2
                        style={{
                          fontSize: '26px',
                          fontWeight: 800,
                          color: 'var(--slate-taupe-dark)',
                          margin: 0,
                          lineHeight: 1.3,
                        }}
                      >
                        {activeChapter.title}
                      </h2>
                      {activeChapter.title_english && storyLang === 'ta' && (
                        <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                          {activeChapter.title_english}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn-pill-outline"
                        style={{ padding: '6px 14px', fontSize: '12px' }}
                        onClick={() => setCurrentScreen('story_builder')}
                      >
                        <span>Full Builder</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Chapter Body Content in elegant book typography */}
                  <div
                    style={{
                      fontSize: '16px',
                      lineHeight: 2,
                      color: '#2F2A28',
                      fontFamily: storyLang === 'ta' ? "'Noto Serif Tamil', serif" : 'inherit',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {activeChapter.content}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: CHRONOLOGICAL TIMELINE (Vertical Visual Timeline)
         ========================================================================= */}
      {activeTab === 'timeline' && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '36px',
            border: '1px solid #E8DFD5',
          }}
        >
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-taupe-dark)', margin: 0 }}>
              Chronological Life Milestones Timeline
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
              From early childhood in {narrator?.place_of_birth || 'Tamil Nadu'} to career milestones and family
              memories.
            </p>
          </div>

          <div
            style={{
              position: 'relative',
              paddingLeft: '32px',
              borderLeft: '3px solid #E8DFD5',
              display: 'flex',
              flexDirection: 'column',
              gap: '28px',
            }}
          >
            {timeline.map((event, idx) => (
              <div key={event.id || idx} style={{ position: 'relative' }}>
                {/* Timeline node circle */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-41px',
                    top: '2px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#8C5338',
                    border: '3px solid #FFFFFF',
                    boxShadow: '0 0 0 2px #E8DFD5',
                  }}
                />

                <div
                  style={{
                    background: 'var(--bg-app)',
                    borderRadius: '14px',
                    padding: '18px 22px',
                    border: '1px solid #EAE3D9',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginBottom: '6px',
                    }}
                  >
                    {(() => {
                      const isEn = uiLanguage === 'en';
                      const parenMatch = event.title?.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
                      const eventTitleTamil = event.title_tamil || (parenMatch ? parenMatch[1].trim() : event.title);
                      const eventTitleEnglish = event.title_english || (parenMatch ? parenMatch[2].trim() : event.title);
                      const displayTitle = isEn ? (eventTitleEnglish || event.title) : (eventTitleTamil || event.title);
                      const displayDesc = isEn ? (event.description_english || event.description) : (event.description || event.description_english);

                      return (
                        <>
                          <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>
                            {event.approximate_year ? `${event.approximate_year} — ` : ''}
                            {displayTitle}
                          </span>

                          {event.place_name && (
                            <span
                              className="badge-pill"
                              style={{ fontSize: '11px', background: '#FFFFFF', color: 'var(--slate-taupe-dark)' }}
                            >
                              📍 {event.place_name}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {(() => {
                    const isEn = uiLanguage === 'en';
                    const displayDesc = isEn ? (event.description_english || event.description) : (event.description || event.description_english);
                    return displayDesc ? (
                      <p
                        style={{
                          fontSize: '14px',
                          color: 'var(--slate-taupe-dark)',
                          lineHeight: 1.7,
                          margin: 0,
                        }}
                      >
                        {displayDesc}
                      </p>
                    ) : null;
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: SESSIONS (Strictly Owner Only)
         ========================================================================= */}
      {isOwner && activeTab === 'sessions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-taupe-dark)', margin: 0 }}>
                Oral Interview Sessions ({sessions.length})
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Archival sessions conducted with {name}.
              </p>
            </div>

            <button className="btn-pill-primary" onClick={() => goToNewInterview(narrator!)}>
              <Mic size={15} />
              <span>New Interview</span>
            </button>
          </div>

          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="modern-card"
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                padding: '24px 28px',
                border: '1px solid #E8DFD5',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '20px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span className="badge-pill" style={{ fontSize: '11px' }}>
                    Session #{sess.session_number}
                  </span>
                  <span
                    className="badge-pill"
                    style={{
                      fontSize: '11px',
                      background: sess.status === 'completed' ? 'rgba(140, 83, 56, 0.15)' : '#FDF6EC',
                      color: sess.status === 'completed' ? 'var(--accent-green)' : '#C48232',
                    }}
                  >
                    {sess.status}
                  </span>
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-taupe-dark)', margin: 0 }}>
                  {sess.title}
                </h3>
                {sess.notes && (
                  <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {sess.notes}
                  </p>
                )}
              </div>

              <button className="btn-pill-outline" onClick={() => goToInterview(sess)}>
                <span>{sess.status === 'completed' ? 'Review Questions' : 'Resume Interview'}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
          TAB 6: RECORDINGS (Strictly Owner Only - Voice Audio Masters)
         ========================================================================= */}
      {isOwner && activeTab === 'recordings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ marginBottom: '10px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-taupe-dark)', margin: 0 }}>
              Master Audio Recordings ({recordings.length})
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Master audio files recorded during sessions. Protected archivist master files.
            </p>
          </div>

          {recordings.map((rec) => (
            <div
              key={rec.id}
              className="modern-card"
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                padding: '24px 28px',
                border: '1px solid #E8DFD5',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '14px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <span className="badge-pill" style={{ fontSize: '11px', marginBottom: '6px' }}>
                    {rec.session_title || 'Session Recording'}
                  </span>
                  <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-taupe-dark)', margin: '4px 0 0' }}>
                    {rec.question_tamil}
                  </h4>
                  {rec.question_english && (
                    <p style={{ fontSize: '13.5px', color: 'var(--slate-gray)', marginTop: '2px' }}>
                      {rec.question_english}
                    </p>
                  )}
                </div>

                <span
                  className="badge-pill"
                  style={{
                    background: 'rgba(140, 83, 56, 0.15)',
                    color: 'var(--accent-green)',
                    fontSize: '11px',
                  }}
                >
                  Saved (v{rec.version_number})
                </span>
              </div>

              {rec.transcript_text && (
                <p
                  style={{
                    padding: '14px 18px',
                    background: 'var(--bg-app)',
                    borderRadius: '14px',
                    fontSize: '14px',
                    color: 'var(--slate-taupe-dark)',
                    lineHeight: 1.7,
                    fontStyle: 'italic',
                    marginBottom: '16px',
                    borderLeft: '4px solid var(--accent-green)',
                  }}
                >
                  "{rec.transcript_text}"
                </p>
              )}

              {/* Master Audio Player with download enabled strictly for owner */}
              <AudioPlayer
                storageKey={rec.storage_key}
                durationSeconds={rec.duration_seconds}
                showDownload={isOwner}
              />
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
          TAB 7: TRANSCRIPTS (Strictly Owner Only)
         ========================================================================= */}
      {isOwner && activeTab === 'transcripts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ marginBottom: '10px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-taupe-dark)', margin: 0 }}>
              AI Transcripts Verification
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              AI Tamil speech transcriptions ready for archivist editorial review.
            </p>
          </div>

          {recordings.map((rec) => (
            <div
              key={rec.id}
              className="modern-card"
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                padding: '24px 28px',
                border: '1px solid #E8DFD5',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <h4 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--slate-taupe-dark)', margin: 0 }}>
                  {rec.question_tamil}
                </h4>
                <button
                  className="btn-pill-outline"
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                  onClick={() => {
                    setActiveRecordingForReview(rec);
                    setIsTranscriptModalOpen(true);
                  }}
                >
                  Review Transcript
                </button>
              </div>
              <p
                style={{
                  fontSize: '14.5px',
                  lineHeight: 1.8,
                  color: 'var(--slate-taupe-dark)',
                  padding: '16px',
                  background: 'var(--bg-app)',
                  borderRadius: '12px',
                  margin: 0,
                }}
              >
                {rec.transcript_text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Navigation Buttons: Previous to list, Next to Interview */}
      <PageNavigationFooter
        visible={Boolean(narrator)}
        prevScreen="narrators"
        prevLabel={{
          en: 'Back to Narrators',
          ta: 'நினைவாளர் பட்டியல்',
        }}
        nextScreen="session_setup"
        nextLabel={{
          en: narrator
            ? `Next Step: Start Interview with ${narrator.full_name_english}`
            : 'Next Step: Start Interview',
          ta: narrator
            ? `அடுத்த படி: ${narrator.full_name_tamil || narrator.full_name_english} உடன் நேர்காணல்`
            : 'அடுத்த படி: நேர்காணலைத் தொடங்கு',
        }}
        onNext={() => {
          if (narrator) {
            goToNewInterview(narrator);
          } else {
            setCurrentScreen('session_setup');
          }
        }}
      />
    </div>
  );
};
