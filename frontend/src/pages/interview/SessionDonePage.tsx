import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getNarratorById, getSessionById } from '../../services';
import type { InterviewSession, NarratorDetail } from '../../types';
import { useUi } from '../../context/UiContext';
import { useElderExit } from '../../layouts/elderExit';
import { Button } from '../../ui/Button/Button';
import { Card } from '../../ui/Card/Card';
import { narratorName } from '../../utils/narrator';
import s from './SessionDonePage.module.css';

export function SessionDonePage() {
  const { sessionId } = useParams();
  return <Done key={sessionId} sessionId={sessionId ?? ''} />;
}

function Done({ sessionId }: { sessionId: string }) {
  const { tr } = useUi();
  const navigate = useNavigate();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [narrator, setNarrator] = useState<NarratorDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const token = useRef(0);
  useElderExit(session ? `/elders/${session.narrator_id}/interviews` : null);

  const load = useCallback(() => {
    const mine = ++token.current;
    setFailed(false);
    setSession(null);
    (async () => {
      const x = await getSessionById(sessionId);
      const n = await getNarratorById(x.narrator_id).catch(() => null); // the name is a nicety
      if (mine !== token.current) return;
      setNarrator(n);
      setSession(x);
    })().catch(() => {
      if (mine === token.current) setFailed(true);
    });
  }, [sessionId]);

  useEffect(() => {
    load();
    return () => {
      token.current++;
    };
  }, [load]);

  if (failed) {
    return (
      <div role="alert" className={s.error}>
        <p>{tr('இந்தப் பக்கத்தை ஏற்ற முடியவில்லை.', 'Could not load this page.')}</p>
        <Button variant="secondary" size="lg" onClick={load}>{tr('மீண்டும் முயற்சி', 'Try again')}</Button>
      </div>
    );
  }
  if (!session) return <div className={s.loading} aria-busy="true" aria-label={tr('ஏற்றுகிறது', 'Loading')} />;

  const address =
    narrator?.preferred_name || session.preferred_name || (narrator ? narratorName(narrator) : '') ||
    session.full_name_tamil || session.full_name_english || '';
  const answered = (session.questions ?? []).filter((q) => q.status === 'answered').length;
  const elder = session.narrator_id;

  return (
    <div className={s.page}>
      <Card className={s.card}>
        <h1 className={s.thanks}>
          {address ? tr(`நன்றி, ${address}!`, `Thank you, ${address}!`) : tr('நன்றி!', 'Thank you!')}
        </h1>
        <p className={s.count}>
          {tr(`இன்று ${answered} நினைவுகளைப் பகிர்ந்தீர்கள்`, `You shared ${answered} memories today`)}
        </p>
        <p className={s.note}>
          {tr(
            'உங்கள் பதிவுகள் பின்னணியில் எழுத்தாக மாற்றப்படும். இன்னொரு நாள் தொடரலாம்.',
            'Your recordings are turned into text in the background. You can carry on another day.',
          )}
        </p>
      </Card>
      <div className={s.actions}>
        <Button size="lg" onClick={() => navigate(`/elders/${elder}/interviews`)}>
          {tr('மூத்தவர் பக்கத்துக்குத் திரும்பு', 'Back to the elder page')}
        </Button>
        <Button variant="secondary" size="lg" onClick={() => navigate(`/elders/${elder}/topics`)}>
          {tr('இன்னொரு தலைப்பைத் தொடரு', 'Continue another topic')}
        </Button>
      </div>
    </div>
  );
}
