import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getNarratorById, getAllSessions, getTopicProgress } from '../../services';
import type { NarratorDetail, InterviewSession, TopicProgress } from '../../types';
import { useUi } from '../../context/UiContext';
import { Button } from '../../ui/Button/Button';
import { PhotoFrame } from '../../ui/PhotoFrame/PhotoFrame';
import { Tabs } from '../../ui/Tabs/Tabs';
import { narratorName, narratorInitials } from '../../utils/narrator';
import { topicLabel } from '../interview/topicLabels';
import { InterviewsSection } from './InterviewsSection';
import { RecordingsSection } from './RecordingsSection';
import { TimelineSection } from './TimelineSection';
import { StorySection } from './StorySection';
import { ExportSection } from './ExportSection';
import s from './ElderPage.module.css';

export const ELDER_SECTIONS = ['interviews', 'recordings', 'timeline', 'story', 'export'] as const;
type Section = (typeof ELDER_SECTIONS)[number];

export function ElderPage() {
  const { id, section } = useParams();
  if (!id || !ELDER_SECTIONS.includes(section as Section)) {
    return <Navigate to="../interviews" relative="path" replace />;
  }
  return <ElderHub key={id} id={id} section={section as Section} />;
}

function ElderHub({ id, section }: { id: string; section: Section }) {
  const { lang, tr } = useUi();
  const [narrator, setNarrator] = useState<NarratorDetail | null>(null);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [progress, setProgress] = useState<TopicProgress[] | null>(null);
  const [failed, setFailed] = useState(false);
  const token = useRef(0);

  const load = useCallback(() => {
    const mine = ++token.current;
    setFailed(false);
    setNarrator(null);
    Promise.all([getNarratorById(id), getAllSessions(id)])
      .then(([n, ss]) => {
        if (mine !== token.current) return;
        setNarrator(n);
        setSessions(ss);
      })
      .catch(() => {
        if (mine === token.current) setFailed(true);
      });
    // Progress is optional: any failure (incl. NotAvailableError) hides the strip.
    getTopicProgress(id)
      .then((p) => {
        if (mine === token.current) setProgress(p);
      })
      .catch(() => {
        if (mine === token.current) setProgress(null);
      });
  }, [id]);

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
        <Button variant="secondary" onClick={load}>{tr('மீண்டும் முயற்சி', 'Try again')}</Button>
      </div>
    );
  }
  if (!narrator) {
    return <div className={s.loading} aria-busy="true" aria-label={tr('ஏற்றுகிறது', 'Loading')} />;
  }

  const unfinished = sessions
    .filter((x) => x.status === 'in_progress' || x.status === 'paused')
    .sort((a, b) => (b.last_activity_at ?? '').localeCompare(a.last_activity_at ?? ''))[0];

  const base = `/elders/${id}`;
  const tabs = [
    { to: `${base}/interviews`, label: tr('நேர்காணல்கள்', 'Interviews') },
    { to: `${base}/recordings`, label: tr('நினைவுகள்', 'Recordings') },
    { to: `${base}/timeline`, label: tr('காலவரிசை', 'Timeline') },
    { to: `${base}/story`, label: tr('வாழ்க்கைக் கதை', 'Life story') },
    { to: `${base}/export`, label: tr('பகிர்', 'Export') },
  ];
  const born = narrator.birth_year ? tr(`${narrator.birth_year} இல் பிறந்தவர்`, `Born ${narrator.birth_year}`) : null;
  const meta = [narrator.place_of_birth, born].filter(Boolean).join(' · ');

  return (
    <div className={s.page}>
      <header className={s.hero}>
        <PhotoFrame initials={narratorInitials(narrator)} photoUrl={narrator.profile_photo_url} size="lg" />
        <div className={s.info}>
          <h1 className={s.name}>{narratorName(narrator)}</h1>
          {lang === 'en' && narrator.full_name_english && narrator.full_name_tamil && (
            <p className={s.meta}>{narrator.full_name_english}</p>
          )}
          {meta && <p className={s.meta}>{meta}</p>}
          {progress && progress.length > 0 && (
            <ul className={s.strip} aria-label={tr('தலைப்பு முன்னேற்றம்', 'Topic progress')}>
              {progress.map((p) => {
                const l = topicLabel(p.life_stage);
                const pct = p.total ? Math.round((p.answered / p.total) * 100) : 0;
                return (
                  <li key={p.life_stage} className={s.stage}>
                    <span className={s.stageName}>{lang === 'en' ? l.en : l.ta}</span>
                    <span className={s.bar} aria-hidden="true"><span className={s.fill} style={{ width: `${pct}%` }} /></span>
                    <span className={s.count}>{p.answered}/{p.total}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </header>

      <div className={s.actions}>
        <Link to={unfinished ? `/interview/${unfinished.id}` : `${base}/topics`} className={s.primary}>
          {unfinished ? tr('நேர்காணலைத் தொடர்', 'Continue interview') : tr('நேர்காணலைத் தொடங்கு', 'Start interview')}
        </Link>
        <Link to={`${base}/export#podcast`} className={s.secondary}>🎧 {tr('கேள்', 'Listen')}</Link>
        <Link to={`${base}/edit`} className={s.secondary}>{tr('விவரங்களைத் திருத்து', 'Edit details')}</Link>
      </div>

      <Tabs items={tabs} />

      <div>
        {section === 'interviews' && <InterviewsSection narratorId={id} sessions={sessions} />}
        {section === 'recordings' && <RecordingsSection narratorId={id} />}
        {section === 'timeline' && <TimelineSection narratorId={id} />}
        {section === 'story' && <StorySection narratorId={id} />}
        {section === 'export' && <ExportSection narratorId={id} />}
      </div>
    </div>
  );
}
