import React from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Users,
  Mic,
  Headphones,
  Calendar,
  BookOpen,
  Archive,
  Check,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ActiveScreen } from '../types';

export type WorkflowStepId =
  | 'narrators'
  | 'interviews'
  | 'recordings'
  | 'timeline'
  | 'story_builder'
  | 'export';

interface PreservationWorkflowFooterProps {
  currentStep: WorkflowStepId;
  onNext?: () => void;
  onPrev?: () => void;
  nextDisabled?: boolean;
  nextTooltip?: string;
  customNextLabel?: { en: string; ta: string };
  customPrevLabel?: { en: string; ta: string };
  hideNext?: boolean;
  hidePrev?: boolean;
}

interface StepConfig {
  id: WorkflowStepId;
  stepNumber: number;
  labelEn: string;
  labelTa: string;
  shortLabelEn: string;
  shortLabelTa: string;
  screen: ActiveScreen;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  nextPromptEn: string;
  nextPromptTa: string;
}

export const WORKFLOW_STEPS: StepConfig[] = [
  {
    id: 'narrators',
    stepNumber: 1,
    labelEn: '1. Register Narrator',
    labelTa: '1. நினைவாளர் பதிவு',
    shortLabelEn: 'Narrator',
    shortLabelTa: 'நினைவாளர்',
    screen: 'narrators',
    icon: Users,
    nextPromptEn: 'Start an oral history interview session with your narrator.',
    nextPromptTa: 'தேர்ந்தெடுத்த நினைவாளருடன் வாய்மொழி நேர்காணலைத் தொடங்குங்கள்.',
  },
  {
    id: 'interviews',
    stepNumber: 2,
    labelEn: '2. Interview & Record',
    labelTa: '2. நேர்காணல் & ஒலிப்பதிவு',
    shortLabelEn: 'Interview',
    shortLabelTa: 'நேர்காணல்',
    screen: 'session_setup',
    icon: Mic,
    nextPromptEn: 'Review audio recordings and inspect AI Tamil transcriptions.',
    nextPromptTa: 'ஒலிப்பதிவுகளைக் கேட்டு AI தமிழ் உரைகளைச் சரிபார்க்கவும்.',
  },
  {
    id: 'recordings',
    stepNumber: 3,
    labelEn: '3. Recordings & Transcripts',
    labelTa: '3. ஒலிப்பதிவு & உரைவடிவம்',
    shortLabelEn: 'Transcripts',
    shortLabelTa: 'உரைவடிவம்',
    screen: 'recordings',
    icon: Headphones,
    nextPromptEn: 'Explore extracted milestones, historical places, and timelines.',
    nextPromptTa: 'நினைவுகளிலிருந்து தொகுக்கப்பட்ட காலவரிசை நிகழ்வுகளைக் காண்க.',
  },
  {
    id: 'timeline',
    stepNumber: 4,
    labelEn: '4. Memories & Timeline',
    labelTa: '4. நினைவுகள் & காலவரிசை',
    shortLabelEn: 'Timeline',
    shortLabelTa: 'காலவரிசை',
    screen: 'timeline',
    icon: Calendar,
    nextPromptEn: 'Synthesise life chapters into literary written prose with AI.',
    nextPromptTa: 'நினைவுகளைத் தொகுத்து வாழ்க்கை வரலாற்றுப் புத்தக அத்தியாயங்களை உருவாக்குங்கள்.',
  },
  {
    id: 'story_builder',
    stepNumber: 5,
    labelEn: '5. LifeStory Builder',
    labelTa: '5. வாழ்க்கை வரலாறு',
    shortLabelEn: 'Story Builder',
    shortLabelTa: 'வாழ்க்கை வரலாறு',
    screen: 'story_builder',
    icon: BookOpen,
    nextPromptEn: 'Export publication-ready PDF biography book, audio zip, and archives.',
    nextPromptTa: 'முழுமையான தமிழ்/ஆங்கில PDF புத்தகம் மற்றும் ஆவணங்களைப் பதிவிறக்கவும்.',
  },
  {
    id: 'export',
    stepNumber: 6,
    labelEn: '6. Export & Archive',
    labelTa: '6. ஏற்றுமதி & ஆவணம்',
    shortLabelEn: 'Export',
    shortLabelTa: 'ஏற்றுமதி',
    screen: 'export',
    icon: Archive,
    nextPromptEn: 'Preservation complete! Manage narrators or preserve more memories.',
    nextPromptTa: 'ஆவணப்படுத்துதல் நிறைவடைந்தது! புதிய நினைவுகளைப் பாதுகாக்கலாம்.',
  },
];

export const PreservationWorkflowFooter: React.FC<PreservationWorkflowFooterProps> = ({
  currentStep,
  onNext,
  onPrev,
  nextDisabled = false,
  nextTooltip,
  customNextLabel,
  customPrevLabel,
  hideNext = false,
  hidePrev = false,
}) => {
  const { setCurrentScreen, activeNarrator, uiLanguage } = useApp();

  const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.id === currentStep);
  const currentConfig = WORKFLOW_STEPS[currentIndex] || WORKFLOW_STEPS[0];
  const prevConfig = currentIndex > 0 ? WORKFLOW_STEPS[currentIndex - 1] : null;
  const nextConfig = currentIndex < WORKFLOW_STEPS.length - 1 ? WORKFLOW_STEPS[currentIndex + 1] : null;

  const handleNavigate = (screen: ActiveScreen) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextClick = () => {
    if (onNext) {
      onNext();
    } else if (nextConfig) {
      handleNavigate(nextConfig.screen);
    } else {
      // Completed last step (export), loop back to narrators directory
      handleNavigate('narrators');
    }
  };

  const handlePrevClick = () => {
    if (onPrev) {
      onPrev();
    } else if (prevConfig) {
      handleNavigate(prevConfig.screen);
    }
  };

  return (
    <div
      className="modern-card workflow-journey-footer"
      style={{
        marginTop: '48px',
        marginBottom: '40px',
        padding: '28px 32px',
        borderRadius: '28px',
        background: '#FFFFFF',
        border: '1.5px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* 6-Step Visual Interactive Journey Tracker */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--border-subtle)',
          overflowX: 'auto',
          gap: '8px',
        }}
      >
        {WORKFLOW_STEPS.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const StepIcon = step.icon;

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => handleNavigate(step.screen)}
                title={`Go to Step ${step.stepNumber}: ${uiLanguage === 'ta' ? step.labelTa : step.labelEn}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: isCurrent ? 'var(--slate-bg-tint)' : 'transparent',
                  border: isCurrent ? '1.5px solid var(--slate-taupe-dark)' : '1px solid transparent',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-pill)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: isCurrent
                      ? 'var(--slate-taupe-dark)'
                      : isDone
                      ? 'var(--accent-brown)'
                      : 'var(--bg-subtle)',
                    color: isCurrent || isDone ? '#FFFFFF' : 'var(--text-muted)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                >
                  {isDone ? <Check size={13} strokeWidth={3} /> : step.stepNumber}
                </div>
                <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: isCurrent ? 800 : isDone ? 600 : 500,
                      color: isCurrent
                        ? 'var(--slate-taupe-dark)'
                        : isDone
                        ? 'var(--accent-brown)'
                        : 'var(--text-muted)',
                    }}
                  >
                    {uiLanguage === 'ta' ? step.shortLabelTa : step.shortLabelEn}
                  </div>
                </div>
              </button>

              {idx < WORKFLOW_STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    minWidth: '16px',
                    height: '2px',
                    background: idx < currentIndex ? 'var(--accent-brown)' : 'var(--border-subtle)',
                    transition: 'background 0.3s ease',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Main Guidance Bar & Action Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        {/* Left: Current Stage Context & Active Narrator */}
        <div style={{ textAlign: 'left', minWidth: '260px', flex: '1 1 300px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: 'var(--accent-brown)',
              marginBottom: '4px',
            }}
          >
            <Sparkles size={13} />
            <span>
              {uiLanguage === 'ta'
                ? `படிநிலை ${currentConfig.stepNumber} / 6: ${currentConfig.shortLabelTa}`
                : `Workflow Step ${currentConfig.stepNumber} of 6: ${currentConfig.shortLabelEn}`}
            </span>
          </div>

          <div
            style={{
              fontSize: '14.5px',
              fontWeight: 700,
              color: 'var(--slate-taupe-dark)',
              marginBottom: '2px',
            }}
          >
            {uiLanguage === 'ta' ? currentConfig.nextPromptTa : currentConfig.nextPromptEn}
          </div>

          {activeNarrator && (
            <div
              style={{
                fontSize: '12.5px',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                marginTop: '4px',
              }}
            >
              <span>{uiLanguage === 'ta' ? 'நினைவாளர்:' : 'Current Narrator:'}</span>
              <strong style={{ color: 'var(--slate-taupe-dark)' }}>
                {activeNarrator.full_name_tamil || activeNarrator.full_name_english}
              </strong>
            </div>
          )}
        </div>

        {/* Right: Step Navigation Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Previous Step Button */}
          {!hidePrev && prevConfig && (
            <button
              type="button"
              className="btn-pill-outline"
              onClick={handlePrevClick}
              style={{
                padding: '12px 22px',
                fontSize: '13.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <ChevronLeft size={16} />
              <span>
                {customPrevLabel
                  ? uiLanguage === 'ta'
                    ? customPrevLabel.ta
                    : customPrevLabel.en
                  : uiLanguage === 'ta'
                  ? `முந்தைய படி: ${prevConfig.shortLabelTa}`
                  : `Previous: ${prevConfig.shortLabelEn}`}
              </span>
            </button>
          )}

          {/* Next Step Button */}
          {!hideNext && (
            <button
              type="button"
              className="btn-pill-primary"
              onClick={handleNextClick}
              disabled={nextDisabled}
              title={nextTooltip}
              style={{
                padding: '13px 26px',
                fontSize: '14px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                opacity: nextDisabled ? 0.6 : 1,
                cursor: nextDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              <span>
                {customNextLabel
                  ? uiLanguage === 'ta'
                    ? customNextLabel.ta
                    : customNextLabel.en
                  : nextConfig
                  ? uiLanguage === 'ta'
                    ? `அடுத்த படி: ${nextConfig.labelTa.replace(/^\d+\.\s*/, '')}`
                    : `Next Step: ${nextConfig.labelEn.replace(/^\d+\.\s*/, '')}`
                  : uiLanguage === 'ta'
                  ? 'நினைவாளர் பட்டியலுக்குத் திரும்பு'
                  : 'Back to Narrator Directory'}
              </span>
              <span
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.25)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '11px',
                }}
              >
                {nextConfig ? '→' : '✓'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
