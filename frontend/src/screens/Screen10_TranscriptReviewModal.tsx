import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Save,
  CheckCircle2,
  Sparkles,
  FileText,
  Volume2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  updateTranscript,
  regenerateTranscript,
  refineTranscriptProse,
  getTranscriptsByRecording,
  extractMemoriesWithAI,
} from '../services/api';
import { AudioPlayer } from '../components/AudioPlayer';
import type { Transcript } from '../types';

export const Screen10_TranscriptReviewModal: React.FC = () => {
  const {
    isTranscriptModalOpen,
    setIsTranscriptModalOpen,
    activeRecordingForReview,
    showToast,
    uiLanguage,
  } = useApp();

  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [editedText, setEditedText] = useState('');
  const [englishText, setEnglishText] = useState('');
  const [originalSTTText, setOriginalSTTText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [refining, setRefining] = useState(false);
  const [isReviewed, setIsReviewed] = useState(false);

  useEffect(() => {
    async function loadTranscripts() {
      if (!activeRecordingForReview?.id) return;
      try {
        setLoading(true);
        const list = await getTranscriptsByRecording(activeRecordingForReview.id);
        setTranscripts(list);

        if (list.length > 0) {
          const latest = list[0];
          setEditedText(latest.transcript_text);
          setEnglishText(latest.transcript_text_english || '');
          setIsReviewed(!!latest.reviewed_at);

          // Find original STT version (source === 'speech_to_text' or oldest version)
          const original = list.find((t) => t.source === 'speech_to_text') || list[list.length - 1];
          setOriginalSTTText(original?.transcript_text || latest.transcript_text);
        } else if (activeRecordingForReview.transcript_text) {
          setEditedText(activeRecordingForReview.transcript_text);
          setEnglishText(activeRecordingForReview.transcript_text_english || '');
          setOriginalSTTText(activeRecordingForReview.transcript_text);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (isTranscriptModalOpen && activeRecordingForReview) {
      void loadTranscripts();
    }
  }, [isTranscriptModalOpen, activeRecordingForReview?.id]);

  if (!isTranscriptModalOpen || !activeRecordingForReview) return null;

  const handleSaveCorrections = async () => {
    try {
      setSaving(true);
      const activeTranscriptId = transcripts[0]?.id || activeRecordingForReview.transcript_id;
      if (activeTranscriptId) {
        await updateTranscript(activeTranscriptId, editedText, isReviewed);
      }

      // If marked as reviewed & verified, automatically extract memories to timeline!
      if (isReviewed && activeRecordingForReview.narrator_id) {
        try {
          await extractMemoriesWithAI(activeRecordingForReview.narrator_id);
        } catch (memErr) {
          console.warn('Auto memory extraction notice:', memErr);
        }
      }

      showToast(
        uiLanguage === 'ta'
          ? (isReviewed
              ? 'உரையாடல் சரிபார்க்கப்பட்டு, முக்கிய நினைவுகள் காலவரிசையில் சேர்க்கப்பட்டன!'
              : 'உரையாடல் திருத்தங்கள் வெற்றிகரமாகப் பதியப்பட்டன!')
          : (isReviewed
              ? 'Transcript verified and memories added to Life Timeline!'
              : 'Transcript corrections saved successfully!')
      );
      setIsTranscriptModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save transcript');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      const fresh = await regenerateTranscript(activeRecordingForReview.id);
      setEditedText(fresh.transcript_text);
      setEnglishText(fresh.transcript_text_english || '');
      setOriginalSTTText(fresh.transcript_text);
      showToast(
        uiLanguage === 'ta'
          ? 'குரல்-வழி உரை மீண்டும் உருவாக்கப்பட்டது.'
          : 'Transcript regenerated via Speech-to-Text engine.'
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  const handleRefineProse = async () => {
    if (!editedText || !editedText.trim()) return;
    try {
      setRefining(true);
      const res = await refineTranscriptProse(editedText);
      if (res.refined_text) {
        setEditedText(res.refined_text);
        if (res.refined_english) {
          setEnglishText(res.refined_english);
        }
        showToast(
          uiLanguage === 'ta'
            ? 'உரையாடல் இலக்கண ரீதியாகச் செப்பனிடப்பட்டு நயமான உரைநடையாக மாற்றப்பட்டது!'
            : 'Transcript refined into grammatically correct written Tamil prose!'
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Refinement failed');
    } finally {
      setRefining(false);
    }
  };

  const handleExtractMemories = async () => {
    if (!activeRecordingForReview.narrator_id) return;
    try {
      await extractMemoriesWithAI(activeRecordingForReview.narrator_id);
      showToast(
        uiLanguage === 'ta'
          ? 'இந்த உரையில் இருந்து முக்கிய நினைவுகள் பிரித்தெடுக்கப்பட்டு காலவரிசையில் சேர்க்கப்பட்டன!'
          : 'Memories extracted from transcript and added to timeline!'
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Memory extraction failed');
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{
          maxWidth: '980px',
          borderRadius: '32px',
          padding: '36px 40px',
          boxShadow: '0 24px 60px rgba(94, 86, 83, 0.15)',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '26px' }}>
          <div>
            <span className="badge-pill" style={{ marginBottom: '8px' }}>
              SCREEN 10 · TRANSCRIPT REVIEW
            </span>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>
              {uiLanguage === 'ta' ? 'உரையாடல் பிரதியை சரிபார்த்தல்' : 'Review & Correct Transcript'}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {activeRecordingForReview.question_tamil}
            </p>
          </div>

          <button
            onClick={() => setIsTranscriptModalOpen(false)}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#FAF9F8',
              border: '1px solid var(--border-subtle)',
              color: 'var(--slate-taupe-dark)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Split Screen Layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.25fr',
            gap: '24px',
            marginBottom: '26px',
          }}
        >
          {/* Left Side: Original Audio Player & Details */}
          <div
            style={{
              background: '#FAF9F8',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-taupe-dark)', margin: 0 }}>
                {uiLanguage === 'ta' ? 'மூலக் குரல் பதிவு (Original Audio)' : 'Original Audio Player'}
              </h4>
              <span className="badge-pill" style={{ fontSize: '10px' }}>Master Voice</span>
            </div>

            <AudioPlayer
              storageKey={activeRecordingForReview.storage_key}
              durationSeconds={activeRecordingForReview.duration_seconds}
              title={activeRecordingForReview.question_tamil}
            />

            {/* Recording Details */}
            <div style={{ fontSize: '12px', color: 'var(--slate-gray)', lineHeight: 1.8 }}>
              <div><strong>Recording File:</strong> {activeRecordingForReview.storage_key}</div>
              <div><strong>Duration:</strong> {activeRecordingForReview.duration_seconds ? Math.round(Number(activeRecordingForReview.duration_seconds)) : 0} seconds</div>
              <div><strong>Version:</strong> v{activeRecordingForReview.version_number || 1}</div>
              <div><strong>Status:</strong> {activeRecordingForReview.status}</div>
              <div><strong>Recorded for:</strong> {activeRecordingForReview.full_name_tamil || activeRecordingForReview.preferred_name || (uiLanguage === 'ta' ? 'நினைவாளர்' : 'Narrator')}</div>
            </div>

            {/* Original STT Output Snippet */}
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '6px' }}>
                {uiLanguage === 'ta' ? 'தொடக்க STT உரை (Original STT):' : 'Original Speech-to-Text:'}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.6 }}>
                "{originalSTTText || (uiLanguage === 'ta' ? 'ஒலிப்பதிவில் பேச்சு எதுவும் கண்டறியப்படவில்லை.' : 'No speech detected in audio.')}"
              </p>
            </div>
          </div>

          {/* Right Side: Editable Tamil Text & Review Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-taupe-dark)', margin: 0 }}>
                  {uiLanguage === 'ta' ? 'இலக்கண உரைநடைத் தமிழ் (Written Prose)' : 'Grammatically Correct Tamil Prose'}
                </h4>
                <span className="badge-pill" style={{ fontSize: '10px', background: '#EBF3ED', color: 'var(--accent-green)', fontWeight: 700 }}>
                  {uiLanguage === 'ta' ? 'எழுத்துத் தமிழ்' : 'Written Tamil'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-pill-secondary"
                  style={{ padding: '6px 14px', fontSize: '12px', background: '#F4ECE4', borderColor: '#E5D6C5', color: '#6A432D', fontWeight: 700 }}
                  onClick={handleRefineProse}
                  disabled={refining || !editedText}
                  title="பேச்சு வழக்கினை இலக்கண ரீதியான தூய எழுத்துத் தமிழாக மாற்றும்"
                >
                  <Sparkles size={13} color="#8C5338" />
                  <span>{refining ? (uiLanguage === 'ta' ? 'மாற்றுகிறது...' : 'Refining...') : (uiLanguage === 'ta' ? 'இலக்கணச் சீரமைப்பு' : 'Refine to Prose')}</span>
                </button>

                <button
                  type="button"
                  className="btn-pill-outline"
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                  onClick={handleRegenerate}
                  disabled={regenerating}
                >
                  <RotateCcw size={13} />
                  <span>{regenerating ? 'Regenerating...' : 'Regenerate'}</span>
                </button>
              </div>
            </div>

            <textarea
              rows={8}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              placeholder="தமிழில் பேசப்பட்ட வாசகங்களைத் துல்லியமாகத் திருத்தி எழுதவும்..."
              style={{
                width: '100%',
                padding: '16px 18px',
                borderRadius: '20px',
                border: '1px solid var(--border-subtle)',
                fontSize: '15px',
                lineHeight: 1.8,
                color: 'var(--slate-taupe-dark)',
                fontFamily: 'inherit',
                background: '#FAF9F8',
                resize: 'vertical',
                outline: 'none',
              }}
            />

            {/* Bilingual Translation Preview */}
            {englishText && (
              <div
                style={{
                  background: '#F7F6F2',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                  {uiLanguage === 'ta' ? 'ஆங்கில மொழிபெயர்ப்பு (Mayura Translation):' : 'English Translation:'}
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--slate-taupe-dark)', lineHeight: 1.6 }}>
                  {englishText}
                </p>
              </div>
            )}

            {/* Mark as Reviewed Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                background: '#FAF9F8',
                borderRadius: '9999px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)' }}>
                <input
                  type="checkbox"
                  checked={isReviewed}
                  onChange={(e) => setIsReviewed(e.target.checked)}
                  style={{ accentColor: 'var(--accent-green)', width: '16px', height: '16px' }}
                />
                <span>{uiLanguage === 'ta' ? 'உரை சரிபார்க்கப்பட்டது என குறிக்கவும்' : 'Mark as Reviewed & Verified'}</span>
              </label>

              <button
                className="btn-pill-secondary"
                style={{ padding: '6px 14px', fontSize: '12px' }}
                onClick={handleExtractMemories}
              >
                <Sparkles size={13} color="var(--accent-green)" />
                <span>{uiLanguage === 'ta' ? 'நினைவுகளைப் பிரித்தெடு' : 'Extract Memories'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '22px' }}>
          <button className="btn-pill-outline" onClick={() => setIsTranscriptModalOpen(false)}>
            {uiLanguage === 'ta' ? 'ரத்து செய்க' : 'Cancel'}
          </button>

          <button
            className="btn-pill-primary"
            onClick={handleSaveCorrections}
            disabled={saving}
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : uiLanguage === 'ta' ? 'திருத்தங்களைச் சேமிக்க' : 'Save Corrections'}</span>
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
        </div>
      </div>
    </div>
  );
};
