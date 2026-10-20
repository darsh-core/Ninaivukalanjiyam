import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  MessageSquare,
  PlusCircle,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getAIFollowUpQuestions, addQuestionToSession } from '../services/api';

export const Screen11_AIFollowUpModal: React.FC = () => {
  const {
    isAIFollowUpModalOpen,
    setIsAIFollowUpModalOpen,
    activeFollowUpContext,
    activeSession,
    showToast,
    uiLanguage,
  } = useApp();

  const [suggestions, setSuggestions] = useState<Array<{ tamil: string; english: string; theme: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);

  const fetchSuggestions = async () => {
    if (!activeFollowUpContext) return;
    try {
      setLoading(true);
      const list = await getAIFollowUpQuestions({
        question: activeFollowUpContext.question,
        answer: activeFollowUpContext.answer || '',
        narrator_name: activeSession?.full_name_tamil || activeSession?.full_name_english || (uiLanguage === 'ta' ? 'நினைவாளர்' : 'Narrator'),
      });
      setSuggestions(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAIFollowUpModalOpen && activeFollowUpContext) {
      void fetchSuggestions();
    }
  }, [isAIFollowUpModalOpen, activeFollowUpContext?.question]);

  if (!isAIFollowUpModalOpen || !activeFollowUpContext) return null;

  const handleAskQuestion = async (item: { tamil: string; english: string }, index: number) => {
    if (!activeSession?.id) return;
    try {
      setAddingId(index);
      await addQuestionToSession(activeSession.id, {
        question_tamil: item.tamil,
        question_english: item.english,
        question_type: 'follow_up',
      });

      showToast(
        uiLanguage === 'ta'
          ? 'தொடர் வினா நேர்காணல் வரிசையில் சேர்க்கப்பட்டது!'
          : 'Follow-up question added to session queue!'
      );
      setIsAIFollowUpModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add question');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{
          maxWidth: '820px',
          borderRadius: '32px',
          padding: '36px 40px',
          boxShadow: '0 24px 60px rgba(94, 86, 83, 0.15)',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge-pill">
                <Sparkles size={12} />
                SCREEN 11 · AI FOLLOW-UP QUESTIONS
              </span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>
              {uiLanguage === 'ta' ? 'தொடர்புடைய AI தொடர் வினாக்கள்' : 'AI Contextual Follow-up Suggestions'}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {uiLanguage === 'ta'
                ? 'நேர்காணலை இயல்பான உரையாடலாக மாற்ற AI பரிந்துரைக்கும் கனிவான வினாக்கள்'
                : 'Empathetic follow-ups suggested based on the narrator’s previous answer'}
            </p>
          </div>

          <button
            onClick={() => setIsAIFollowUpModalOpen(false)}
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

        {/* Previous Answer Context Banner */}
        <div
          style={{
            background: 'var(--slate-bg-tint)',
            borderRadius: '24px',
            padding: '20px 24px',
            marginBottom: '26px',
            borderLeft: '4px solid var(--accent-green)',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--slate-gray)', letterSpacing: '0.8px', marginBottom: '6px' }}>
            INITIAL QUESTION & ANSWER
          </div>
          <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--slate-taupe-dark)', marginBottom: '4px' }}>
            {activeFollowUpContext.question}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--slate-taupe-dark)', fontStyle: 'italic', lineHeight: 1.5 }}>
            "{activeFollowUpContext.answer || 'நான் தினமும் நண்பர்களுடன் நடந்து பள்ளிக்குச் செல்வேன்.'}"
          </div>
        </div>

        {/* AI Suggestions Cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '44px 0', color: 'var(--text-muted)' }}>
            <Sparkles size={28} style={{ animation: 'spin 2s linear infinite', color: 'var(--accent-green)' }} />
            <p style={{ marginTop: '14px', fontSize: '14px', fontWeight: 600 }}>
              {uiLanguage === 'ta' ? 'AI தொடர் வினாக்களை உருவாக்குகிறது...' : 'Generating natural follow-up questions...'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '26px' }}>
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '24px',
                  padding: '20px 24px',
                  border: '1px solid var(--border-card)',
                  boxShadow: '0 4px 16px rgba(94, 86, 83, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '18px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ flex: 1 }}>
                  <span className="badge-pill" style={{ fontSize: '10px', marginBottom: '8px' }}>
                    {item.theme}
                  </span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--slate-taupe-dark)', lineHeight: 1.4 }}>
                    {item.tamil}
                  </div>
                  {item.english && (
                    <div style={{ fontSize: '13px', color: 'var(--slate-gray)', marginTop: '4px' }}>
                      {item.english}
                    </div>
                  )}
                </div>

                <button
                  className="btn-pill-primary"
                  disabled={addingId === idx}
                  onClick={() => handleAskQuestion(item, idx)}
                  style={{ whiteSpace: 'nowrap', padding: '10px 20px', fontSize: '13px' }}
                >
                  <PlusCircle size={15} />
                  <span>{addingId === idx ? 'Adding...' : uiLanguage === 'ta' ? 'இந்தக் கேள்வியைக் கேள்' : 'Ask This Question'}</span>
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
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
            ))}
          </div>
        )}

        {/* AI Rules Guard Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderRadius: '20px',
            background: 'var(--slate-bg-tint)',
            border: '1px solid var(--border-subtle)',
            fontSize: '12px',
            color: 'var(--slate-taupe-dark)',
            marginBottom: '24px',
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
            <ShieldAlert size={16} color="var(--accent-green)" />
          </div>
          <span>
            {uiLanguage === 'ta'
              ? 'AI நெறிமுறைகள்: புதிய தகவல்களைத் தானாக உருவாக்காது; துன்புறுத்தும் அல்லது உணர்வுபூர்வமான சங்கடமான தலைப்புகளைத் தவிர்த்து, பெரியவர்களின் கண்ணியத்தை மட்டுமே முன்னிறுத்தும்.'
              : 'AI Rules: Strictly follows narrator language, avoids repeated questions, never hallucinates facts, and respects privacy.'}
          </span>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            className="btn-pill-outline"
            onClick={fetchSuggestions}
            disabled={loading}
          >
            <RotateCcw size={14} />
            <span>{uiLanguage === 'ta' ? 'மேலும் பரிந்துரைகளை உருவாக்கு' : 'Generate More'}</span>
          </button>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn-pill-outline"
              onClick={() => setIsAIFollowUpModalOpen(false)}
            >
              {uiLanguage === 'ta' ? 'பரிந்துரைகளைத் தவிர்' : 'Skip Suggestions'}
            </button>

            <button
              className="btn-pill-secondary"
              onClick={() => setIsAIFollowUpModalOpen(false)}
            >
              <span>{uiLanguage === 'ta' ? 'நேர்காணலுக்குத் திரும்பு' : 'Return to Interview'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
