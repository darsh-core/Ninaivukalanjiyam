import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Narrator } from '../types';
import { useUi } from '../context/UiContext';
import { Bi } from '../ui/Bi/Bi';
import { Button } from '../ui/Button/Button';
import { PhotoFrame } from '../ui/PhotoFrame/PhotoFrame';
import { narratorInitials, narratorName } from '../utils/narrator';
import { consentUrl, findNextQuestion, startLifeStage, type NextQuestion } from './interview/nextQuestion';
import { topicLabel } from './interview/topicLabels';
import s from './TodayCard.module.css';

/** One elder's next question, with a single obvious action to ask it. */
export function TodayCard({ narrator }: { narrator: Narrator }) {
  const { tr } = useUi();
  const navigate = useNavigate();
  // undefined = loading, null = nothing left to ask
  const [next, setNext] = useState<NextQuestion | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [startFailed, setStartFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    findNextQuestion(narrator.id)
      .then((q) => alive && setNext(q))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [narrator.id]);

  // A broken or finished card just stays out of the way; the elder grid below still works.
  if (failed || next === null) return null;

  const address = narrator.preferred_name || narratorName(narrator);
  const askLabel = tr(`${address} — இப்போது கேளுங்கள்`, `Ask ${address} now`);

  const start = async (stage: string) => {
    if (busy) return;
    setBusy(true);
    setStartFailed(false);
    try {
      navigate(await startLifeStage(narrator.id, stage));
    } catch {
      setBusy(false);
      setStartFailed(true);
    }
  };

  return (
    <article className={s.card} aria-busy={next === undefined}>
      <PhotoFrame initials={narratorInitials(narrator)} photoUrl={narrator.profile_photo_url} />
      <div className={s.body}>
        <p className={s.who}>
          {narratorName(narrator)}
          {next?.kind === 'start' && <span className={s.topic}> · {tr(topicLabel(next.lifeStage).ta, topicLabel(next.lifeStage).en)}</span>}
          {next?.kind === 'resume' && <span className={s.topic}> · {tr('தொடர்கிறது', 'Continuing')}</span>}
        </p>
        {next === undefined ? (
          <div className={s.skeleton} aria-label={tr('ஏற்றுகிறது', 'Loading')} />
        ) : (
          <>
            <Bi as="heading" ta={next.question.question_tamil} en={next.question.question_english} />
            {startFailed && (
              <p role="alert" className={s.error}>{tr('தொடங்க முடியவில்லை. மீண்டும் முயலுங்கள்.', 'Could not start. Please try again.')}</p>
            )}
          </>
        )}
      </div>
      {next?.kind === 'resume' && (
        <Link className={s.ask} to={consentUrl(narrator.id, next.sessionId, next.q)}>
          ▶ {askLabel}
        </Link>
      )}
      {next?.kind === 'start' && (
        <Button size="lg" className={s.askBtn} disabled={busy} onClick={() => void start(next.lifeStage)}>
          ▶ {askLabel}
        </Button>
      )}
    </article>
  );
}
