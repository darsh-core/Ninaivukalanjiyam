import React, { useState, useEffect } from 'react';
import {
  Headphones,
  Search,
  Filter,
  ListFilter,
  Download,
  FileText,
  User,
  Calendar,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getAllRecordings, getNarrators } from '../services/api';
import type { Recording, Narrator } from '../types';
import { AudioPlayer } from '../components/AudioPlayer';
import { PreservationWorkflowFooter } from '../components/PreservationWorkflowFooter';

export const Screen14_RecordingLibrary: React.FC = () => {
  const { user } = useAuth();
  const {
    activeNarrator,
    setCurrentScreen,
    setActiveRecordingForReview,
    setIsTranscriptModalOpen,
    uiLanguage,
  } = useApp();

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [narrators, setNarrators] = useState<Narrator[]>([]);
  const [selectedNarratorId, setSelectedNarratorId] = useState<string>(activeNarrator?.id || '');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'reviewed' | 'pending'>('all');
  const [loading, setLoading] = useState(true);

  // Filter: ONLY narrators belonging to the currently logged in user
  const userNarrators = narrators.filter((n) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return (
      (n.created_by && n.created_by === user.id) ||
      (n.creator_email && user.email && n.creator_email.toLowerCase() === user.email.toLowerCase())
    );
  });

  const loadRecordings = async () => {
    try {
      setLoading(true);
      const [recList, nList] = await Promise.all([
        getAllRecordings({
          narrator_id: selectedNarratorId || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          createdBy: user?.role === 'admin' ? undefined : user?.id,
        }),
        getNarrators(),
      ]);
      setNarrators(nList);

      const owned = nList.filter((n) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        return (
          (n.created_by && n.created_by === user.id) ||
          (n.creator_email && user.email && n.creator_email.toLowerCase() === user.email.toLowerCase())
        );
      });

      // Strict client-side isolation to guarantee zero leaks of other families' audio
      const safeRecs = recList.filter((r) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        return (
          (r.created_by && r.created_by === user.id) ||
          (r.creator_email && user.email && r.creator_email.toLowerCase() === user.email.toLowerCase()) ||
          owned.some((n) => n.id === r.narrator_id)
        );
      });

      setRecordings(safeRecs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecordings();
  }, [selectedNarratorId, statusFilter, user?.id, user?.email]);

  const filteredRecordings = recordings.filter((r) => {
    const q = search.toLowerCase();
    return (
      (r.question_tamil && r.question_tamil.toLowerCase().includes(q)) ||
      (r.transcript_text && r.transcript_text.toLowerCase().includes(q)) ||
      (r.full_name_tamil && r.full_name_tamil.toLowerCase().includes(q)) ||
      (r.full_name_english && r.full_name_english.toLowerCase().includes(q))
    );
  });

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
          gap: '16px',
        }}
      >
        <div>
          <span className="badge-pill" style={{ marginBottom: '8px' }}>
            {uiLanguage === 'ta' ? 'குரல் ஆவணகம்' : 'Audio Archive'}
          </span>
          <h1 style={{ fontSize: '30px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginTop: '4px' }}>
            {uiLanguage === 'ta' ? 'பதிவுகள் நூலகம் (Recording Library)' : 'Voice Recordings Library'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '6px' }}>
            {uiLanguage === 'ta'
              ? 'முன்னோர்களின் அசல் குரல் பதிவுகள், உரையாடல் பிரதிகள், மற்றும் காலப் பதிவுகள்'
              : 'Search, listen, review transcripts, and download original master audio files'}
          </p>
        </div>
      </div>

      {/* Search and Filters: Separate Independent Elements (as in Screenshot) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '28px',
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
                ? 'கேள்வி அல்லது உரை வரிகளில் தேடுக...'
                : 'Search recordings by question or transcript text...'
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
            onChange={(e) => setSelectedNarratorId(e.target.value)}
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
            <option value="">{uiLanguage === 'ta' ? 'அனைத்து நினைவாளர்கள்' : 'All My Narrators'}</option>
            {userNarrators.map((n) => (
              <option key={n.id} value={n.id}>
                {n.full_name_tamil || n.full_name_english}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Right: Status Filter Box */}
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
          <ListFilter size={16} color="#4B5563" style={{ flexShrink: 0 }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
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
            <option value="all">{uiLanguage === 'ta' ? 'அனைத்து நிலைகள்' : 'All Status'}</option>
            <option value="reviewed">{uiLanguage === 'ta' ? 'சரிபார்க்கப்பட்டது' : 'Reviewed & Verified'}</option>
            <option value="pending">{uiLanguage === 'ta' ? 'சரிபார்க்கப்படாதது' : 'Pending Review'}</option>
          </select>
        </div>
      </div>

      {/* Recordings Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading recordings...
        </div>
      ) : userNarrators.length === 0 ? (
        <div
          className="modern-card"
          style={{
            textAlign: 'center',
            padding: '56px 28px',
            background: '#FFFFFF',
            border: '2px dashed var(--border-subtle)',
            borderRadius: '32px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--slate-bg-tint)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 18px',
              color: 'var(--slate-taupe-dark)',
            }}
          >
            <Headphones size={30} />
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
            {uiLanguage === 'ta' ? 'தங்களின் குடும்பக் குரல் காப்பகம்' : 'Your Private Family Audio Vault'}
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
              maxWidth: '540px',
              margin: '0 auto 24px',
              lineHeight: 1.6,
            }}
          >
            {uiLanguage === 'ta'
              ? 'முன்னோர்களின் அசல் குரல் பதிவுகள், ஒலி வடிவங்கள் மற்றும் உரையாடல் பிரதிகள் ஆகியவை அந்தந்தக் குடும்பத்தினருக்கு மட்டுமே பாதுகாக்கப்பட்டு வழங்கப்படும். பிறரின் குரல் பதிவுகளை இங்கு கேட்கவோ பதிவிறக்கவோ முடியாது.'
              : 'Original master voice recordings and transcripts are private family property, accessible only to the elder’s registered archivist. You currently have no narrators in this account.'}
          </p>
        </div>
      ) : filteredRecordings.length === 0 ? (
        <div
          className="modern-card"
          style={{ textAlign: 'center', padding: '56px 24px', background: '#FFFFFF', border: '1px dashed var(--border-subtle)', borderRadius: '32px' }}
        >
          <Headphones size={40} color="var(--slate-sand)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
            No Recordings Match Your Filter
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Try clearing filters or record a new session answer.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {filteredRecordings.map((recording) => (
            <div
              key={recording.id}
              className="modern-card"
              style={{
                borderRadius: '28px',
                padding: '28px 32px',
                border: '1px solid var(--border-card)',
                boxShadow: '0 8px 24px rgba(94, 86, 83, 0.04)',
              }}
            >
              {/* Header info */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '14px',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="badge-pill" style={{ fontSize: '11px' }}>
                      {recording.full_name_tamil || recording.full_name_english || (uiLanguage === 'ta' ? 'நினைவாளர்' : 'Narrator')}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {recording.session_title || `Session #${recording.session_number || 1}`}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--slate-gray)' }}>
                      • v{recording.version_number}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--slate-taupe-dark)', margin: 0 }}>
                    {recording.question_tamil}
                  </h3>
                  {recording.question_english && (
                    <p style={{ fontSize: '14px', color: 'var(--slate-gray)', marginTop: '4px' }}>
                      {recording.question_english}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    className="badge-pill"
                    style={{
                      fontSize: '11px',
                      background: recording.transcript_reviewed_at ? 'rgba(140, 83, 56, 0.15)' : 'var(--slate-bg-tint)',
                      color: recording.transcript_reviewed_at ? 'var(--accent-green)' : 'var(--slate-taupe-dark)',
                    }}
                  >
                    {recording.transcript_reviewed_at ? '✓ Reviewed' : 'Pending Review'}
                  </span>

                  {(() => {
                    const isOwner = Boolean(
                      user &&
                      (
                        (recording.created_by && user.id === recording.created_by) ||
                        (recording.creator_email && user.email?.toLowerCase() === recording.creator_email.toLowerCase()) ||
                        user.role === 'admin'
                      )
                    );

                    return (
                      <>
                        <button
                          className="btn-pill-primary"
                          style={{
                            padding: '8px 16px',
                            fontSize: '12px',
                            background: isOwner ? 'var(--accent-green)' : 'var(--slate-taupe-dark)',
                          }}
                          onClick={() => {
                            setActiveRecordingForReview(recording);
                            setIsTranscriptModalOpen(true);
                          }}
                        >
                          <FileText size={14} />
                          <span>{isOwner ? 'Review Transcript' : 'View Verified Transcript'}</span>
                          <span
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: 'rgba(255,255,255,0.2)',
                              display: 'grid',
                              placeItems: 'center',
                              fontSize: '10px',
                            }}
                          >
                            ↗
                          </span>
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Transcript Preview Snippet */}
              {recording.transcript_text && (
                <p
                  style={{
                    background: 'var(--bg-app)',
                    padding: '14px 20px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: 'var(--slate-taupe-dark)',
                    fontStyle: 'italic',
                    marginBottom: '18px',
                    borderLeft: '4px solid var(--accent-green)',
                  }}
                >
                  "{recording.transcript_text}"
                </p>
              )}

              {/* Inline Master Audio Player with Download strictly for owners */}
              {(() => {
                const isOwner = Boolean(
                  user &&
                  (
                    (recording.created_by && user.id === recording.created_by) ||
                    (recording.creator_email && user.email?.toLowerCase() === recording.creator_email.toLowerCase()) ||
                    user.role === 'admin'
                  )
                );

                return (
                  <AudioPlayer
                    storageKey={recording.storage_key}
                    durationSeconds={recording.duration_seconds}
                    showDownload={isOwner}
                  />
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {/* 6-Step Workflow Footer */}
      <PreservationWorkflowFooter
        currentStep="recordings"
        onPrev={() => setCurrentScreen('session_setup')}
        onNext={() => setCurrentScreen('timeline')}
        customPrevLabel={{
          en: 'Previous: Interviews',
          ta: 'முந்தைய படி: நேர்காணல்கள்',
        }}
        customNextLabel={{
          en: 'Next Step: Memories & Timeline',
          ta: 'அடுத்த படி: நினைவுகள் & காலவரிசை',
        }}
      />
    </div>
  );
};
