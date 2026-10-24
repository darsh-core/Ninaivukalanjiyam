import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllSessions } from '../../services';
import type { InterviewSession } from '../../types';
import { useUi } from '../../context/UiContext';
import { Button } from '../../ui/Button/Button';
import { Card } from '../../ui/Card/Card';
import { EmptyState } from '../../ui/EmptyState/EmptyState';
import { StatusLabel, type Status } from '../../ui/StatusLabel/StatusLabel';
import s from './InterviewsSection.module.css';

const statusOf = (x: InterviewSession): Status => (x.status === 'abandoned' ? 'paused' : x.status);

export function InterviewsSection({ narratorId }: { narratorId: string }) {
  const { lang, tr } = useUi();
  const [sessions, setSessions] = useState<InterviewSession[] | null>(null);
  const [failed, setFailed] = useState(false);
  const token = useRef(0);

  const load = useCallback(() => {
    const mine = ++token.current;
    setFailed(false);
    setSessions(null);
    getAllSessions(narratorId)
      .then((ss) => {
        if (mine === token.current) setSessions(ss);
      })
      .catch(() => {
        if (mine === token.current) setFailed(true);
      });
  }, [narratorId]);

  useEffect(() => {
    load();
    return () => {
      token.current++;
    };
  }, [load]);

  if (failed) {
    return (
      <div role="alert" className={s.error}>
        <p>{tr('நேர்காணல்களை ஏற்ற முடியவில்லை.', 'Could not load interviews.')}</p>
        <Button variant="secondary" onClick={load}>{tr('மீண்டும் முயற்சி', 'Try again')}</Button>
      </div>
    );
  }
  if (!sessions) return <div className={s.loading} aria-busy="true" aria-label={tr('ஏற்றுகிறது', 'Loading')} />;

  if (sessions.length === 0) {
    return (
      <EmptyState
        title={tr('இன்னும் நேர்காணல் இல்லை', 'No interviews yet')}
        body={tr('முதல் நேர்காணலைத் தொடங்குங்கள்.', 'Start the first interview to begin collecting memories.')}
        action={
          <Link to={`/elders/${narratorId}/topics`} className={s.start}>
            {tr('நேர்காணலைத் தொடங்கு', 'Start interview')}
          </Link>
        }
      />
    );
  }

  const sorted = [...sessions].sort((a, b) => (b.last_activity_at ?? '').localeCompare(a.last_activity_at ?? ''));
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString(lang === 'en' ? 'en-IN' : 'ta-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <ul className={s.list}>
      {sorted.map((x) => {
        const open = x.status === 'in_progress' || x.status === 'paused';
        const when = x.last_activity_at ? fmt(x.last_activity_at) : '';
        return (
          <li key={x.id}>
            <Card className={s.card}>
              <div className={s.top}>
                <h2 className={s.title}>{x.title}</h2>
                <StatusLabel status={statusOf(x)} />
              </div>
              <p className={s.meta}>
                {tr(
                  `${x.answered_count ?? 0}/${x.question_count ?? 0} கேள்விகளுக்குப் பதில்`,
                  `${x.answered_count ?? 0}/${x.question_count ?? 0} questions answered`,
                )}
                {when && ` · ${tr('கடைசியாக', 'Last activity')}: ${when}`}
              </p>
              <Link to={`/interview/${x.id}`} className={open ? s.cont : s.open}>
                {open ? tr('தொடர்', 'Continue') : tr('திற', 'Open')}
              </Link>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
