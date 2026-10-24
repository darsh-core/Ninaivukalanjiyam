import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getConsent, getNarratorById, recordConsent } from '../../services';
import { NotAvailableError } from '../../services/errors';
import type { NarratorDetail } from '../../types';
import { useUi } from '../../context/UiContext';
import { Button } from '../../ui/Button/Button';
import { Card } from '../../ui/Card/Card';
import { narratorName } from '../../utils/narrator';
import s from './ConsentPage.module.css';

export const CONSENT_TEXT_VERSION = 'v1';

const TEXT_TA =
  'உங்கள் குரல் பதிவு செய்யப்படும். அது உங்கள் குடும்பத்திற்காக மட்டும் பாதுகாப்பாக வைக்கப்படும். ' +
  'ஒரு கணினி சேவை உங்கள் பேச்சை எழுத்தாக மாற்றும்.';
const TEXT_EN =
  'Your voice will be recorded and kept privately for your family. A computer service will turn your speech into text.';

const canSpeak = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

export function ConsentPage() {
  const { id } = useParams();
  return <Consent key={id} id={id ?? ''} />;
}

function Consent({ id }: { id: string }) {
  const { lang, tr, showToast } = useUi();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requested = params.get('next') ?? '';
  const next = requested.startsWith('/interview/') ? requested : `/elders/${id}/interviews`;

  const [narrator, setNarrator] = useState<NarratorDetail | null>(null);
  const [already, setAlready] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const token = useRef(0);

  const load = useCallback(() => {
    const mine = ++token.current;
    setFailed(false);
    setReady(false);
    Promise.all([
      getNarratorById(id),
      getConsent(id).catch((e) => {
        if (e instanceof NotAvailableError) return null; // cannot know, so ask
        throw e;
      }),
    ])
      .then(([n, c]) => {
        if (mine !== token.current) return;
        setNarrator(n);
        setAlready(!!c);
        setReady(true);
      })
      .catch(() => {
        if (mine === token.current) setFailed(true);
      });
  }, [id]);

  useEffect(() => {
    load();
    return () => {
      token.current++;
    };
  }, [load]);

  useEffect(
    () => () => {
      if (canSpeak()) window.speechSynthesis.cancel();
    },
    [],
  );

  const speak = () => {
    if (!canSpeak()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(TEXT_TA);
    u.lang = 'ta-IN';
    window.speechSynthesis.speak(u);
  };

  const agree = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await recordConsent(id, CONSENT_TEXT_VERSION);
      navigate(next);
    } catch (e) {
      if (e instanceof NotAvailableError) {
        showToast(tr('ஒப்புதல் பதிவு இன்னும் இல்லை', 'Consent saving not available yet'), 'info');
        navigate(next);
      } else {
        setBusy(false);
        showToast(tr('சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.', 'Could not save. Please try again.'), 'error');
      }
    }
  };

  if (failed) {
    return (
      <div role="alert" className={s.error}>
        <p>{tr('இந்தப் பக்கத்தை ஏற்ற முடியவில்லை.', 'Could not load this page.')}</p>
        <Button variant="secondary" size="lg" onClick={load}>{tr('மீண்டும் முயற்சி', 'Try again')}</Button>
      </div>
    );
  }
  if (!ready || !narrator) return <div className={s.loading} aria-busy="true" aria-label={tr('ஏற்றுகிறது', 'Loading')} />;
  if (already) return <Navigate to={next} replace />;

  return (
    <div className={s.page}>
      <Card className={s.card}>
        <h1 className={s.hello}>{tr(`வணக்கம் ${narratorName(narrator)}`, `Hello ${narratorName(narrator)}`)}</h1>
        <p className={s.text}>{TEXT_TA}</p>
        {lang === 'en' && <p className={s.help}>{TEXT_EN}</p>}
        <Button variant="secondary" size="lg" onClick={speak}>🔊 {tr('கேள்', 'Listen')}</Button>
      </Card>
      <div className={s.actions}>
        <Button size="lg" onClick={agree} disabled={busy}>{tr('நான் ஒப்புக்கொள்கிறேன்', 'I agree')}</Button>
        <Button variant="text" size="lg" onClick={() => navigate(`/elders/${id}`)} disabled={busy}>
          {tr('இப்போது வேண்டாம்', 'Not now')}
        </Button>
      </div>
    </div>
  );
}
