import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAllSessions, getQuestionBank, getTopicProgress } from '../../services';
import { useUi } from '../../context/UiContext';
import { Bi } from '../../ui/Bi/Bi';
import { Button } from '../../ui/Button/Button';
import { topicLabel } from './topicLabels';
import { answeredIds, loadDetails, startLifeStage } from './nextQuestion';
import s from './TopicsPage.module.css';

interface Topic { stage: string; left: number; total: number }

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
      navigate(await startLifeStage(id, stage));
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
