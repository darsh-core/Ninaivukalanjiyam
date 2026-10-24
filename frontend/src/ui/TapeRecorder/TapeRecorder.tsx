import { useEffect, useRef, type ChangeEvent } from 'react';
import { useUi } from '../../context/UiContext';
import { Button } from '../Button/Button';
import { useRecorder, type RecorderError } from './useRecorder';
import s from './TapeRecorder.module.css';

interface Props {
  onSave: (blob: Blob, durationSeconds: number) => Promise<void>;
  disabled?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  size?: 'lg';
}

const BARS = [0, 1, 2, 3, 4, 5, 6];

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const sec = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Cassette window: two reels and a 7-bar level meter. Animated only while `active`. */
export function CassetteWindow({ active }: { active: boolean }) {
  return (
    <div className={`${s.window} ${active ? s.active : ''}`} aria-hidden="true">
      <div className={s.reel} />
      <div className={s.meter}>
        {BARS.map((i) => (
          <span key={i} className={s.bar} style={{ animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
      <div className={s.reel} />
    </div>
  );
}

export function TapeRecorder({ onSave, disabled, onDirtyChange, size = 'lg' }: Props) {
  const { tr } = useUi();
  const rec = useRecorder();
  const fileRef = useRef<HTMLInputElement>(null);
  const fromFileRef = useRef(false);
  const { state, blob } = rec;

  const dirty = state !== 'idle' && state !== 'saved' && !(state === 'error' && !blob);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const message = (e: RecorderError | null) => {
    if (!e) return '';
    const detail = e.detail ? ` (${e.detail})` : '';
    switch (e.kind) {
      case 'insecure':
        return tr(
          'இந்தப் பக்கம் பாதுகாப்பான (HTTPS) முகவரியில் இல்லாததால் மைக்ரோஃபோன் வேலை செய்யாது. HTTPS முகவரியில் திறக்கவும் அல்லது போனின் குரல் பதிவியைப் பயன்படுத்தவும்.',
          "The microphone needs a secure (HTTPS) address. Open this page over HTTPS or use your phone's voice recorder.",
        );
      case 'denied':
        return tr(
          'மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது. உலாவி அமைப்பில் அனுமதியுங்கள் அல்லது போனின் குரல் பதிவியைப் பயன்படுத்தவும்.',
          "Microphone permission was denied. Allow it in the browser or use your phone's voice recorder.",
        );
      case 'nomic':
        return tr(
          'இந்தச் சாதனத்தில் மைக்ரோஃபோன் இல்லை. போனின் குரல் பதிவியைப் பயன்படுத்தவும்.',
          "No microphone was found on this device. Use your phone's voice recorder.",
        );
      case 'unsupported':
        return tr(
          'இந்த உலாவி நேரடிப் பதிவை ஆதரிக்கவில்லை. போனின் குரல் பதிவியைப் பயன்படுத்தவும்.',
          "This browser does not support live recording. Use your phone's voice recorder.",
        );
      case 'save':
        return tr('சேமிக்க முடியவில்லை. பதிவு அப்படியே உள்ளது, மீண்டும் முயலுங்கள்.', 'Could not save. Your recording is kept; please try again.') + detail;
      default:
        return tr(
          'பதிவைத் தொடங்க முடியவில்லை. போனின் குரல் பதிவியைப் பயன்படுத்தவும்.',
          "Could not start recording. Use your phone's voice recorder.",
        ) + detail;
    }
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    fromFileRef.current = true;
    rec.loadFile(f);
  };

  const save = async () => {
    if (!rec.blob) return;
    rec.markSaving();
    try {
      await onSave(rec.blob, rec.getSeconds());
      rec.markSaved();
    } catch (err) {
      rec.markSaveFailed(err instanceof Error ? err.message : undefined);
    }
  };

  const again = () => {
    if (window.confirm(tr('இந்தப் பதிவை நீக்கி மீண்டும் பதிவு செய்யவா?', 'Discard this recording and record again?'))) {
      fromFileRef.current = false;
      rec.reset();
    }
  };

  const hasTake = !!blob && state !== 'recording' && state !== 'paused';
  const micError = state === 'error' && !blob;
  const statusText: Record<string, string> = {
    idle: tr('பதிவு செய்யத் தயார்', 'Ready to record'),
    recording: tr('பதிவாகிறது', 'Recording'),
    paused: tr('இடைநிறுத்தப்பட்டது', 'Paused'),
    recorded: tr('பதிவு முடிந்தது', 'Recording finished'),
    saving: tr('சேமிக்கிறது…', 'Saving…'),
    saved: tr('சேமிக்கப்பட்டது', 'Saved'),
    error: blob ? tr('சேமிக்கப்படவில்லை', 'Not saved') : tr('பதிவு தொடங்கவில்லை', 'Could not start'),
  };
  const btnSize = size === 'lg' ? 'lg' : 'md';

  return (
    <div className={s.recorder}>
      <CassetteWindow active={state === 'recording'} />
      <div className={s.time} aria-hidden="true">
        {fmt(rec.elapsed)}
      </div>
      <p className={s.status} role="status" aria-live="polite">
        {statusText[state]}
      </p>

      {rec.error && (
        <p className={s.error} role="alert">
          {message(rec.error)}
        </p>
      )}

      <div className={s.controls}>
        {(state === 'idle' || micError) && (
          <Button size={btnSize} disabled={disabled} onClick={() => void rec.start()}>
            ● {tr('பதிவைத் தொடங்கு', 'Start recording')}
          </Button>
        )}
        {state === 'recording' && (
          <>
            <Button size={btnSize} variant="secondary" onClick={rec.pause}>
              {tr('இடைநிறுத்து', 'Pause')}
            </Button>
            <Button size={btnSize} onClick={rec.stop}>
              ■ {tr('நிறுத்து', 'Stop')}
            </Button>
          </>
        )}
        {state === 'paused' && (
          <>
            <Button size={btnSize} variant="secondary" onClick={rec.resume}>
              {tr('தொடர்', 'Resume')}
            </Button>
            <Button size={btnSize} onClick={rec.stop}>
              ■ {tr('நிறுத்து', 'Stop')}
            </Button>
          </>
        )}
      </div>

      {hasTake && rec.url && (
        <div className={s.preview}>
          <audio
            controls
            src={rec.url}
            className={s.audio}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (fromFileRef.current && Number.isFinite(d)) rec.setDuration(Math.round(d));
            }}
          />
          <div className={s.controls}>
            {state !== 'saved' && (
              <Button size={btnSize} disabled={disabled || state === 'saving'} onClick={() => void save()}>
                {tr('சேமி', 'Save')}
              </Button>
            )}
            <Button size={btnSize} variant="secondary" disabled={state === 'saving'} onClick={again}>
              {tr('மீண்டும் பதிவு', 'Record again')}
            </Button>
          </div>
        </div>
      )}

      {(state === 'idle' || micError) && (
        <div className={s.fallback}>
          <Button variant="text" onClick={() => fileRef.current?.click()}>
            {tr("📱 போனின் குரல் பதிவியைப் பயன்படுத்து", "📱 Use phone's voice recorder")}
          </Button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        capture="user"
        className={s.fileInput}
        onChange={onFile}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
