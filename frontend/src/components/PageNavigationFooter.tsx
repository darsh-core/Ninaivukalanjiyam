import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ActiveScreen } from '../types';

interface PageNavigationFooterProps {
  prevScreen?: ActiveScreen;
  nextScreen?: ActiveScreen;
  onPrev?: () => void;
  onNext?: () => void;
  prevLabel?: { en: string; ta: string };
  nextLabel?: { en: string; ta: string };
  visible?: boolean;
}

export const PageNavigationFooter: React.FC<PageNavigationFooterProps> = ({
  prevScreen,
  nextScreen,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
  visible = true,
}) => {
  const { setCurrentScreen, uiLanguage } = useApp();

  if (!visible) return null;

  const handlePrev = () => {
    if (onPrev) {
      onPrev();
    } else if (prevScreen) {
      setCurrentScreen(prevScreen);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else if (nextScreen) {
      setCurrentScreen(nextScreen);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: prevScreen || onPrev ? 'space-between' : 'flex-end',
        alignItems: 'center',
        marginTop: '36px',
        marginBottom: '28px',
        paddingTop: '20px',
        borderTop: '1px solid var(--border-subtle)',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      {Boolean(prevScreen || onPrev) && (
        <button
          type="button"
          className="btn-pill-outline"
          onClick={handlePrev}
          style={{
            padding: '12px 24px',
            fontSize: '13.5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ChevronLeft size={16} />
          <span>
            {prevLabel
              ? uiLanguage === 'ta'
                ? prevLabel.ta
                : prevLabel.en
              : uiLanguage === 'ta'
              ? 'முந்தைய படி'
              : 'Previous Step'}
          </span>
        </button>
      )}

      {Boolean(nextScreen || onNext) && (
        <button
          type="button"
          className="btn-pill-primary"
          onClick={handleNext}
          style={{
            padding: '12px 26px',
            fontSize: '14px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>
            {nextLabel
              ? uiLanguage === 'ta'
                ? nextLabel.ta
                : nextLabel.en
              : uiLanguage === 'ta'
              ? 'அடுத்த படி'
              : 'Next Step'}
          </span>
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
};
