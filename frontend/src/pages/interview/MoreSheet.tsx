import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { getAIFollowUpQuestions } from '../../services';
import type { SessionQuestion } from '../../types';
import { useUi } from '../../context/UiContext';
import { Bi } from '../../ui/Bi/Bi';
import { Button } from '../../ui/Button/Button';
import s from './MoreSheet.module.css';

interface Suggestion { tamil: string; english: string; theme: string }

interface Props {
  question: SessionQuestion;
  questions: SessionQuestion[];
  current: number;
  narratorName?: string;
  busy: boolean;
  onClose(): void;
  onSkip(): void;
  onAdd(ta: string, en: string): Promise<void>;
  onJump(index: number): void;
  onPause(): void;
  onFinish(): void;
}

const FOCUSABLE = 'button:not(:disabled), textarea, input, [href], [tabindex]:not([tabindex="-1"])';

export function MoreSheet({
  question, questions, current, narratorName, busy, onClose, onSkip, onAdd, onJump, onPause, onFinish,
}: Props) {
  const { tr } = useUi();
  const panel = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [aiFailed, setAiFailed] = useState(false);
  const [ownTa, setOwnTa] = useState('');
  const [ownEn, setOwnEn] = useState('');

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => before?.focus?.();
  }, []);

  useEffect(() => {
    let live = true;
    getAIFollowUpQuestions({
      question: question.question_tamil,
      answer: question.transcript_text || undefined,
      narrator_name: narratorName,
    })
      .then((list) => live && setSuggestions(list))
      .catch(() => live && setAiFailed(true));
    return () => {
      live = false;
    };
  }, [question.id, question.question_tamil, question.transcript_text, narratorName]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const addOwn = async () => {
    if (!ownTa.trim()) return;
    await onAdd(ownTa.trim(), ownEn.trim());
  };

  const statusWord = (q: SessionQuestion) =>
    q.status === 'answered' ? tr('✓ பதிலளித்தது', '✓ Answered')
      : q.status === 'skipped' ? tr('தவிர்க்கப்பட்டது', 'Skipped')
        : tr('இன்னும் இல்லை', 'Not yet');

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div
        ref={panel}
        className={s.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="more-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className={s.head}>
          <h2 id="more-title" className={s.title}>{tr('குடும்பத்தினருக்கு', 'For family')}</h2>
          <Button variant="text" onClick={onClose} aria-label={tr('மூடு', 'Close')}>✕ {tr('மூடு', 'Close')}</Button>
        </div>

        <section className={s.section}>
          <Button variant="secondary" size="lg" disabled={busy} onClick={onSkip}>
            {tr('தவிர் / நினைவில்லை', "Skip / don't remember")}
          </Button>
        </section>

        <section className={s.section} aria-labelledby="ai-title">
          <h3 id="ai-title" className={s.sub}>{tr('தொடர் கேள்விப் பரிந்துரைகள்', 'Suggested follow-up questions')}</h3>
          {aiFailed && (
            <p className={s.calm}>
              {tr('பரிந்துரைகள் இப்போது கிடைக்கவில்லை. மற்ற கேள்விகளைத் தொடரலாம்.', 'Suggestions are not available right now. You can carry on with the other questions.')}
            </p>
          )}
          {!aiFailed && !suggestions && <p className={s.calm} aria-busy="true">{tr('தேடுகிறது…', 'Looking…')}</p>}
          {suggestions && (
            <ul className={s.list}>
              {suggestions.map((sg) => (
                <li key={sg.tamil} className={s.item}>
                  <Bi ta={sg.tamil} en={sg.english} />
                  <Button variant="secondary" disabled={busy} onClick={() => void onAdd(sg.tamil, sg.english)}>
                    + {tr('சேர்', 'Add')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={s.section} aria-labelledby="own-title">
          <h3 id="own-title" className={s.sub}>{tr('உங்கள் சொந்தக் கேள்வி', 'Write your own question')}</h3>
          <label className={s.field}>
            <span>{tr('கேள்வி (தமிழில்)', 'Question (in Tamil)')}</span>
            <textarea value={ownTa} onChange={(e) => setOwnTa(e.target.value)} rows={2} required />
          </label>
          <label className={s.field}>
            <span>{tr('ஆங்கிலத்தில் (விருப்பம்)', 'In English (optional)')}</span>
            <textarea value={ownEn} onChange={(e) => setOwnEn(e.target.value)} rows={2} />
          </label>
          <Button disabled={busy || !ownTa.trim()} onClick={() => void addOwn()}>
            + {tr('கேள்வியைச் சேர்', 'Add question')}
          </Button>
        </section>

        <section className={s.section} aria-labelledby="list-title">
          <h3 id="list-title" className={s.sub}>{tr('எல்லாக் கேள்விகளும்', 'All questions')}</h3>
          <ol className={s.qlist}>
            {questions.map((q, i) => (
              <li key={q.id}>
                <button
                  type="button"
                  className={`${s.qbtn} ${i + 1 === current ? s.current : ''}`}
                  aria-current={i + 1 === current ? 'step' : undefined}
                  disabled={busy}
                  onClick={() => onJump(i + 1)}
                >
                  <span className={s.qnum}>{i + 1}.</span>
                  <span className={s.qtext}>{q.question_tamil}</span>
                  <span className={s.qstatus}>{statusWord(q)}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section className={s.end}>
          <Button variant="secondary" size="lg" disabled={busy} onClick={onPause}>
            {tr('இடைநிறுத்தி வெளியேறு', 'Pause & leave')}
          </Button>
          <Button size="lg" disabled={busy} onClick={onFinish}>
            {tr('✓ அமர்வை முடி', '✓ Finish session')}
          </Button>
        </section>
      </div>
    </div>
  );
}
