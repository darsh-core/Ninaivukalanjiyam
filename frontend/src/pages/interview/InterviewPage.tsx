import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  addQuestionToSession, getQuestionBank, getSessionById, synthesizeSpeech, updateQuestionStatus, updateSessionStatus,
  uploadRecordingBlob,
} from '../../services';
import type { InterviewSession, SessionQuestion } from '../../types';
import { useUi } from '../../context/UiContext';
import { useElderExit } from '../../layouts/elderExit';
import { AudioPlayer } from '../../ui/AudioPlayer/AudioPlayer';
import { Bi } from '../../ui/Bi/Bi';
import { Button } from '../../ui/Button/Button';
import { Card } from '../../ui/Card/Card';
import { StatusLabel, type Status } from '../../ui/StatusLabel/StatusLabel';
import { TapeRecorder } from '../../ui/TapeRecorder/TapeRecorder';
import { MoreSheet } from './MoreSheet';
import { topicLabel } from './topicLabels';
import s from './InterviewPage.module.css';

type Speed = 'slow' | 'normal';
const RATE: Record<Speed, number> = { slow: 0.8, normal: 1.0 };

const canSpeak = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

const sorted = (x: InterviewSession) => [...(x.questions ?? [])].sort((a, b) => a.display_order - b.display_order);

const firstOpen = (qs: SessionQuestion[]) => {
  const i = qs.findIndex((q) => q.status === 'pending' || q.status === 'asked');
  return i >= 0 ? i + 1 : 1;
};

const snippet = (t?: string | null) => {
  if (!t) return '';
  return t.length > 160 ? `${t.slice(0, 160).trimEnd()}…` : t;
};

const jobStatus = (q: SessionQuestion): Status | null => {
  const j = q.transcript_job_status;
  return j === 'queued' || j === 'processing' || j === 'needs_review' || j === 'failed' ? j : null;
};

export function InterviewPage() {
  const { sessionId } = useParams();
  return <Interview key={sessionId} sessionId={sessionId ?? ''} />;
}

function Interview({ sessionId }: { sessionId: string }) {
  const { tr, showToast } = useUi();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [stages, setStages] = useState<Map<string, string>>(new Map());
  const [failed, setFailed] = useState(false);
  // A ref, so a click right after recording starts still sees the unsaved take.
  const dirtyRef = useRef(false);
  const setDirty = useCallback((d: boolean) => {
    dirtyRef.current = d;
  }, []);
  const [moreOpen, setMoreOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [anotherFor, setAnotherFor] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [speed, setSpeed] = useState<Speed>('normal');
  const token = useRef(0);
  const speech = useRef<{ id: number; audio?: HTMLAudioElement }>({ id: 0 });

  const load = useCallback(() => {
    const mine = ++token.current;
    setFailed(false);
    setSession(null);
    Promise.all([
      getSessionById(sessionId),
      getQuestionBank().catch(() => null), // topic names are a nicety; the interview works without them
    ])
      .then(([x, bank]) => {
        if (mine !== token.current) return;
        if (bank) setStages(new Map(bank.data.map((b) => [b.id, b.life_stage || b.category])));
        setSession(x);
      })
      .catch(() => {
        if (mine === token.current) setFailed(true);
      });
  }, [sessionId]);

  /** Reloads without blanking the screen; resolves with the fresh session. */
  const refresh = useCallback(async () => {
    const mine = ++token.current;
    const x = await getSessionById(sessionId);
    if (mine === token.current) setSession(x);
    return x;
  }, [sessionId]);

  useEffect(() => {
    load();
    return () => {
      token.current++;
    };
  }, [load]);

  useElderExit(session ? `/elders/${session.narrator_id}/interviews` : null);

  const questions = useMemo(() => (session ? sorted(session) : []), [session]);
  const raw = Number(params.get('q'));
  const valid = Number.isInteger(raw) && raw >= 1 && raw <= questions.length;
  const index = valid ? raw : 0;
  const question = index ? questions[index - 1] : undefined;

  // Without a valid q, open the first question still to answer and write it into the URL.
  useEffect(() => {
    if (!session || valid || !questions.length) return;
    setParams({ q: String(firstOpen(questions)) }, { replace: true });
  }, [session, valid, questions, setParams]);

  // Mark a pending question as asked once it is on screen.
  const qid = question?.id;
  const qstatus = question?.status;
  useEffect(() => {
    if (qid && qstatus === 'pending') updateQuestionStatus(qid, 'asked').catch(() => {});
  }, [qid, qstatus]);

  const stopSpeech = useCallback(() => {
    speech.current.id++;
    speech.current.audio?.pause();
    speech.current.audio = undefined;
    if (canSpeak()) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  // Stop speaking when the question changes or the page goes away.
  useEffect(() => stopSpeech, [qid, stopSpeech]);

  const speak = async () => {
    if (!question) return;
    stopSpeech();
    const mine = speech.current.id;
    const text = question.question_tamil; // always Tamil, whatever the toggle says
    const rate = RATE[speed];
    const done = () => {
      if (mine === speech.current.id) setSpeaking(false);
    };
    setSpeaking(true);
    try {
      const { audioBase64, contentType } = await synthesizeSpeech(text);
      if (mine !== speech.current.id) return;
      const audio = new Audio(`data:${contentType};base64,${audioBase64}`);
      audio.playbackRate = rate;
      audio.onended = done;
      audio.onerror = done;
      speech.current.audio = audio;
      await audio.play();
    } catch {
      if (mine !== speech.current.id) return;
      speech.current.audio = undefined;
      if (!canSpeak()) {
        setSpeaking(false);
        showToast(tr('இந்தச் சாதனத்தில் வாசித்துக் காட்ட முடியவில்லை', 'This device cannot read the question aloud'), 'info');
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ta-IN';
      u.rate = rate;
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  };

  const leaveOk = () =>
    !dirtyRef.current ||
    window.confirm(tr(
      'இந்தப் பதிவு இன்னும் சேமிக்கப்படவில்லை. அதை விட்டுவிட்டுச் செல்லவா?',
      'This recording is not saved yet. Leave it and go on?',
    ));

  const goTo = (n: number) => {
    if (n === index || n < 1 || n > questions.length) return;
    if (!leaveOk()) return;
    setDirty(false);
    setMoreOpen(false);
    setParams({ q: String(n) });
  };

  const save = async (blob: Blob, seconds: number) => {
    if (!question) return;
    await uploadRecordingBlob(question.id, blob, seconds);
    // The take is saved. The recorder unmounts in the refresh below before it can report "clean", so clear it here.
    setDirty(false);
    setAnotherFor(null);
    try {
      await refresh();
    } catch {
      showToast(tr('பதிவு சேமிக்கப்பட்டது. பக்கத்தைப் புதுப்பிக்க முடியவில்லை.', 'Saved. Could not refresh the page.'), 'info');
    }
  };

  const run = async (fn: () => Promise<void>, failMsg: [string, string]) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch {
      showToast(tr(...failMsg), 'error');
    } finally {
      setBusy(false);
    }
  };

  const skip = () => {
    if (!question || !leaveOk()) return;
    void run(async () => {
      await updateQuestionStatus(question.id, 'skipped');
      setDirty(false);
      setMoreOpen(false);
      const fresh = sorted(await refresh());
      if (index < fresh.length) setParams({ q: String(index + 1) });
    }, ['தவிர்க்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.', 'Could not skip. Please try again.']);
  };

  const addQuestion = (ta: string, en: string) =>
    run(async () => {
      const added = await addQuestionToSession(sessionId, {
        question_tamil: ta, question_english: en || undefined, question_type: 'follow_up',
      });
      const fresh = sorted(await refresh());
      const at = fresh.findIndex((q) => q.id === added.id) + 1;
      setMoreOpen(false);
      if (at > 0 && leaveOk()) {
        setDirty(false);
        setParams({ q: String(at) });
      }
    }, ['கேள்வியைச் சேர்க்க முடியவில்லை.', 'Could not add the question.']);

  const end = (status: 'paused' | 'completed') => {
    if (!session || !leaveOk()) return;
    void run(async () => {
      await updateSessionStatus(sessionId, status);
      setDirty(false);
      navigate(status === 'completed' ? `/interview/${sessionId}/done` : `/elders/${session.narrator_id}/interviews`);
    }, ['சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.', 'Could not save. Please try again.']);
  };

  if (failed) {
    return (
      <div role="alert" className={s.error}>
        <p>{tr('இந்த அமர்வை ஏற்ற முடியவில்லை.', 'Could not load this session.')}</p>
        <Button variant="secondary" size="lg" onClick={load}>{tr('மீண்டும் முயற்சி', 'Try again')}</Button>
      </div>
    );
  }
  if (!session) return <div className={s.loading} aria-busy="true" aria-label={tr('ஏற்றுகிறது', 'Loading')} />;
  if (!questions.length) {
    return (
      <div className={s.page}>
        <p>{tr('இந்த அமர்வில் இன்னும் கேள்விகள் இல்லை.', 'This session has no questions yet.')}</p>
        <Button size="lg" onClick={() => navigate(`/elders/${session.narrator_id}/topics`)}>
          {tr('ஒரு தலைப்பைத் தேர்ந்தெடு', 'Pick a topic')}
        </Button>
      </div>
    );
  }
  if (!question) return <div className={s.loading} aria-busy="true" aria-label={tr('ஏற்றுகிறது', 'Loading')} />;

  const stage = question.question_id ? stages.get(question.question_id) : undefined;
  const topic = stage
    ? tr(topicLabel(stage).ta, topicLabel(stage).en)
    : question.question_type === 'follow_up' ? tr('தொடர் கேள்வி', 'Follow-up') : session.title;
  const hasTake = !!question.recording_id && !!question.storage_key;
  const showRecorder = !hasTake || anotherFor === question.id;
  const last = index === questions.length;
  const job = jobStatus(question);

  return (
    <div className={s.page}>
      <p className={s.position}>
        {tr(`கேள்வி ${index} / ${questions.length}`, `Question ${index} / ${questions.length}`)} · {topic}
      </p>

      <h1 className={s.question}>
        <Bi ta={question.question_tamil} en={question.question_english} as="question" inline />
      </h1>

      <div className={s.hear}>
        {speaking ? (
          <Button variant="secondary" size="lg" onClick={stopSpeech}>■ {tr('நிறுத்து', 'Stop')}</Button>
        ) : (
          <Button variant="secondary" size="lg" onClick={() => void speak()}>
            🔊 {tr('கேள்வியைக் கேள்', 'Hear the question')}
          </Button>
        )}
        <div className={s.speed} role="group" aria-label={tr('வேகம்', 'Speed')}>
          {(['slow', 'normal'] as Speed[]).map((sp) => (
            <button
              key={sp}
              type="button"
              className={`${s.speedBtn} ${speed === sp ? s.on : ''}`}
              aria-pressed={speed === sp}
              onClick={() => setSpeed(sp)}
            >
              {sp === 'slow' ? tr('மெதுவாக', 'Slow') : tr('சாதாரணம்', 'Normal')}
            </button>
          ))}
        </div>
      </div>

      {hasTake && (
        <Card className={s.take}>
          <div className={s.takeHead}>
            <span className={s.takeTitle}>
              {tr(`சேமித்த பதில் (பதிவு ${question.recording_version ?? 1})`, `Saved answer (take ${question.recording_version ?? 1})`)}
            </span>
            <span className={s.labels}>
              <StatusLabel status="saved" />
              {job && <StatusLabel status={job} />}
            </span>
          </div>
          <AudioPlayer
            key={question.storage_key}
            storageKey={question.storage_key!}
            durationSeconds={question.duration_seconds ?? undefined}
            showDownload={false}
          />
          {question.transcript_text ? (
            <Bi ta={snippet(question.transcript_text)} en={snippet(question.transcript_text_english)} />
          ) : (
            <p className={s.muted}>{tr('எழுத்தாக மாற்றம் பின்னணியில் நடக்கும்.', 'The text will be ready in the background.')}</p>
          )}
          {!showRecorder && (
            <Button variant="secondary" size="lg" onClick={() => setAnotherFor(question.id)}>
              {tr('இன்னொரு பதிவு (பழையதும் இருக்கும்)', 'Record another take (previous kept)')}
            </Button>
          )}
        </Card>
      )}

      {showRecorder && (
        <TapeRecorder key={question.id} onSave={save} disabled={speaking} onDirtyChange={setDirty} size="lg" />
      )}

      <div className={s.nav}>
        <Button variant="secondary" size="lg" disabled={index <= 1 || busy} onClick={() => goTo(index - 1)}>
          ← {tr('முந்தையது', 'Previous')}
        </Button>
        {last ? (
          <Button size="lg" disabled={busy} onClick={() => end('completed')}>
            {tr('✓ அமர்வை முடி', '✓ Finish session')}
          </Button>
        ) : (
          <Button size="lg" disabled={busy} onClick={() => goTo(index + 1)}>
            {tr('அடுத்தது', 'Next')} →
          </Button>
        )}
      </div>

      <Button variant="text" size="lg" className={s.more} onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
        ⋯ {tr('மேலும்', 'More')}
      </Button>

      {moreOpen && (
        <MoreSheet
          question={question}
          questions={questions}
          current={index}
          narratorName={session.preferred_name || session.full_name_tamil || session.full_name_english}
          busy={busy}
          onClose={() => setMoreOpen(false)}
          onSkip={skip}
          onAdd={addQuestion}
          onJump={goTo}
          onPause={() => end('paused')}
          onFinish={() => end('completed')}
        />
      )}
    </div>
  );
}
