import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNarrators, getAllSessions } from '../services';
import type { Narrator, InterviewSession } from '../types';
import { useUi } from '../context/UiContext';
import { Button } from '../ui/Button/Button';
import { Card } from '../ui/Card/Card';
import { EmptyState } from '../ui/EmptyState/EmptyState';
import { HandNote } from '../ui/HandNote/HandNote';
import { PageHeader } from '../ui/PageHeader/PageHeader';
import { PhotoFrame } from '../ui/PhotoFrame/PhotoFrame';
import { narratorName, narratorInitials } from '../utils/narrator';
import s from './FamilyHomePage.module.css';

export function FamilyHomePage() {
  const { lang, tr } = useUi();
  const [narrators, setNarrators] = useState<Narrator[] | null>(null);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [failed, setFailed] = useState(false);

  const token = useRef(0);

  const load = useCallback(() => {
    const mine = ++token.current;
    setFailed(false);
    setNarrators(null);
    Promise.all([getNarrators(), getAllSessions()])
      .then(([n, ss]) => {
        if (mine !== token.current) return;
        setNarrators(n);
        setSessions(ss);
      })
      .catch(() => {
        if (mine === token.current) setFailed(true);
      });
  }, []);

  useEffect(() => {
    load();
    return () => {
      token.current++;
    };
  }, [load]);

  const resumable = narrators
    ? sessions
        .filter((x) => x.status === 'in_progress' || x.status === 'paused')
        .sort((a, b) => (b.last_activity_at ?? '').localeCompare(a.last_activity_at ?? ''))
        .find((x) => narrators.some((n) => n.id === x.narrator_id))
    : undefined;
  const resumeNarrator = resumable && narrators?.find((n) => n.id === resumable.narrator_id);

  return (
    <div className={s.page}>
      <PageHeader title={tr('எங்கள் குடும்பம்', 'Our family')} subtitle={lang === 'en' ? 'Whose memories shall we keep today?' : undefined} />

      {failed && (
        <div role="alert" className={s.error}>
          <p>{tr('குடும்பப் பட்டியலை ஏற்ற முடியவில்லை.', 'Could not load your family.')}</p>
          <Button variant="secondary" onClick={load}>{tr('மீண்டும் முயற்சி', 'Try again')}</Button>
        </div>
      )}

      {!failed && narrators === null && (
        <div className={s.grid} aria-busy="true" aria-label={tr('ஏற்றுகிறது', 'Loading')}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={s.skeleton} aria-hidden="true" />
          ))}
        </div>
      )}

      {narrators && (
        <>
          {resumable && resumeNarrator && (
            <Link to={`/elders/${resumeNarrator.id}/consent?next=${encodeURIComponent(`/interview/${resumable.id}`)}`} className={s.continue}>
              ▶ {tr('நேர்காணலைத் தொடர்', 'Continue interview')}: {narratorName(resumeNarrator)} — {resumable.title}
            </Link>
          )}
          {narrators.length === 0 && (
            <EmptyState
              title={tr('இன்னும் யாரும் இல்லை', 'No one here yet')}
              body={tr('முதல் பெரியவரைச் சேருங்கள்.', 'Add your first family elder to begin.')}
            />
          )}
          <ul className={s.grid}>
            {narrators.map((n) => (
              <li key={n.id}>
                <Link to={`/elders/${n.id}`} className={s.link}>
                  <Card className={s.narrator}>
                  <PhotoFrame initials={narratorInitials(n)} photoUrl={n.profile_photo_url} size="lg" />
                  <div className={s.info}>
                    <h2 className={s.name}>{narratorName(n)}</h2>
                    {n.place_of_birth && <p className={s.meta}>{n.place_of_birth}</p>}
                    <p className={s.meta}>
                      {tr(
                        `${n.session_count ?? 0} நேர்காணல்கள் · ${n.recording_count ?? 0} பதிவுகள்`,
                        `${n.session_count ?? 0} interviews · ${n.recording_count ?? 0} recordings`,
                      )}
                    </p>
                    {n.photo_frame_note && <HandNote>{n.photo_frame_note}</HandNote>}
                  </div>
                  </Card>
                </Link>
              </li>
            ))}
            <li>
              <Link to="/elders/new" className={s.link}>
                <Card className={`${s.narrator} ${s.add}`}>+ {tr('குடும்பப் பெரியவரைச் சேர்', 'Add a family elder')}</Card>
              </Link>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}
