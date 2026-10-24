import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addQuestionToSession, createSession, getAllSessions, getQuestionBank, getSessionById, getTopicProgress,
} from '../../services';
import type { BankQuestion, InterviewSession, SessionQuestion } from '../../types';
import { useUi } from '../../context/UiContext';
import { Bi } from '../../ui/Bi/Bi';
import { Button } from '../../ui/Button/Button';
import { topicLabel } from './topicLabels';
import s from './TopicsPage.module.css';

interface Topic { stage: string; left: number; total: number }

const unfinishedOf = (sessions: InterviewSession[]) =>
  sessions
    .filter((x) => x.status === 'in_progress' || x.status === 'paused')
    .sort((a, b) => (b.last_activity_at ?? '').localeCompare(a.last_activity_at ?? ''))[0];

async function loadDetails(sessions: InterviewSession[]): Promise<InterviewSession[]> {
  return Promise.all(sessions.map((x) => getSessionById(x.id)));
}

const answeredIds = (details: InterviewSession[]) =>
  new Set(
    details.flatMap((d) => d.questions ?? [])
      .filter((q) => q.status === 'answered' && q.question_id)
      .map((q) => q.question_id as string),
  );

export function TopicsPage() {
  const { id } = useParams();
  return <Topics key={id} id={id ?? ''} />;
}

function Topics({ id }: { id: string }) {
  const { tr } = useUi();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pickFailed, setPickFailed] = useState(false);
  const token = useRef(0);

  const load = useCallback(() => {
    const mine = ++token.current;
    setFailed(false);
    setTopics(null);
    (async () => {
      const [bank, sessions] = await Promise.all([getQuestionBank(), getAllSessions(id)]);
      const stages = [...new Set(bank.data.map((b) => b.life_stage))];
      let list: Topic[];
      try {
        const progress = await getTopicProgress(id);
        list = stages.map((stage) => {
          const p = progress.find((x) => x.life_stage === stage);
          const total = p ? p.total : bank.data.filter((b) => b.life_stage === stage).length;
          return { stage, total, left: Math.max(0, total - (p?.answered ?? 0)) };
        });
      } catch {
        const done = answeredIds(await loadDetails(sessions));
        list = stages.map((stage) => {
          const inStage = bank.data.filter((b) => b.life_stage === stage);
          return { stage, total: inStage.length, left: inStage.filter((b) => !done.has(b.id)).length };
        });
      }
      if (mine === token.current) setTopics(list);
    })().catch(() => {
      if (mine === token.current) setFailed(true);
    });
  }, [id]);

  useEffect(() => {
    load();
    return () => {
      token.current++;
    };
  }, [load]);

  const pick = async (stage: string) => {
    if (busy) return;
    setBusy(true);
    setPickFailed(false);
    try {
      const [bank, sessions] = await Promise.all([getQuestionBank(), getAllSessions(id)]);
      const details = await loadDetails(sessions);
      const done = answeredIds(details);
      let session = unfinishedOf(details);
      if (!session) {
        session = await createSession({
          narrator_id: id, title: topicLabel(stage).ta, interview_mode: 'structured', preferred_language: 'ta',
        });
      }
      const existing: SessionQuestion[] = session.questions ?? [];
      const present = new Set(existing.map((q) => q.question_id).filter(Boolean));
      const toAdd: BankQuestion[] = bank.data
        .filter((b) => b.life_stage === stage && !done.has(b.id) && !present.has(b.id))
        .sort((a, b) => a.display_order - b.display_order);
      const added: SessionQuestion[] = [];
      for (const b of toAdd) {
        added.push(await addQuestionToSession(session.id, {
          question_tamil: b.question_tamil, question_english: b.question_english, question_id: b.id,
          question_type: 'structured',
        }));
      }
      const all = [...existing, ...added].sort((a, b) => a.display_order - b.display_order);
      const target = added[0] ?? all.find((q) => q.status === 'pending' || q.status === 'asked');
      const index = target ? all.findIndex((q) => q.id === target.id) + 1 : 1;
      const next = `/interview/${session.id}?q=${index}`;
      navigate(`/elders/${id}/consent?next=${encodeURIComponent(next)}`);
    } catch {
      setBusy(false);
      setPickFailed(true);
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
  if (!topics) return <div className={s.loading} aria-busy="true" aria-label={tr('ஏற்றுகிறது', 'Loading')} />;

  return (
    <div className={s.page}>
      <h1 className={s.title}>{tr('எதைப் பற்றிப் பேசலாம்?', 'What shall we talk about?')}</h1>
      {pickFailed && (
        <div role="alert" className={s.error}>
          <p>{tr('தொடங்க முடியவில்லை. தலைப்பை மீண்டும் தேர்ந்தெடுக்கவும்.', 'Could not start. Please pick the topic again.')}</p>
        </div>
      )}
      <ul className={s.list}>
        {topics.map((t) => {
          const l = topicLabel(t.stage);
          const finished = t.left === 0;
          return (
            <li key={t.stage}>
              <button
                type="button"
                className={`${s.topic} ${finished ? s.done : ''}`}
                disabled={busy}
                onClick={() => pick(t.stage)}
              >
                <Bi ta={`${finished ? '✓ ' : ''}${l.ta}`} en={l.en} as="question" inline />
                <span className={s.count}>
                  {finished
                    ? tr('அனைத்தும் முடிந்தது', 'All answered')
                    : tr(`${t.left} கேள்விகள் மீதம்`, `${t.left} questions left`)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
