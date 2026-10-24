import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useUi } from '../../context/UiContext';
import { createArchiveExport, getAllRecordings, getNarratorById } from '../../services';
import { NotAvailableError } from '../../services/errors';
import type { ArchiveExport, ArchiveKind, Recording } from '../../types';
import { narratorName } from '../../utils/narrator';
import { Button } from '../../ui/Button/Button';
import { Card } from '../../ui/Card/Card';
import { EmptyState } from '../../ui/EmptyState/EmptyState';
import { NotAvailable } from '../../ui/NotAvailable/NotAvailable';
import { PodcastPlayer, type Track } from '../export/PodcastPlayer';
import s from './ExportSection.module.css';

function formatSize(bytes: number) {
  const trim = (n: number) => String(Math.round(n * 10) / 10);
  return bytes >= 1_000_000 ? `${trim(bytes / 1_000_000)} MB` : `${trim(Math.max(bytes, 1) / 1000)} KB`;
}

type CardState =
  | { phase: 'idle' }
  | { phase: 'busy' }
  | { phase: 'ready'; result: ArchiveExport }
  | { phase: 'error' }
  | { phase: 'na' };

function ArchiveCard({ narratorId, kind, titleTa, titleEn, bodyTa, bodyEn }: {
  narratorId: string;
  kind: ArchiveKind;
  titleTa: string;
  titleEn: string;
  bodyTa: string;
  bodyEn: string;
}) {
  const { tr } = useUi();
  const [state, setState] = useState<CardState>({ phase: 'idle' });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const create = async () => {
    setState({ phase: 'busy' });
    try {
      const result = await createArchiveExport(narratorId, kind);
      if (alive.current) setState({ phase: 'ready', result });
    } catch (e) {
      if (alive.current) setState({ phase: e instanceof NotAvailableError ? 'na' : 'error' });
    }
  };

  const title = tr(titleTa, titleEn);
  return (
    <Card as="li" className={s.archive}>
      <h3 className={s.cardTitle}>{title}</h3>
      <p className={s.cardBody}>{tr(bodyTa, bodyEn)}</p>
      {state.phase === 'na' ? (
        <NotAvailable feature={tr('காப்பகப் பதிவிறக்கம்', 'Archive download')} />
      ) : state.phase === 'ready' ? (
        <div className={s.ready}>
          <p className={s.readyText}>
            {tr('தயார்', 'Ready')} · {formatSize(state.result.size_bytes)}
          </p>
          <a className={s.download} href={state.result.download_url} download>
            {tr('பதிவிறக்கு', 'Download')}
          </a>
        </div>
      ) : (
        <>
          <Button variant="secondary" onClick={create} disabled={state.phase === 'busy'} aria-busy={state.phase === 'busy'}>
            {state.phase === 'busy' ? tr('தயாராகிறது…', 'Preparing…') : tr('காப்பகம் உருவாக்கு', 'Create archive')}
          </Button>
          {state.phase === 'error' && (
            <p role="alert" className={s.error}>
              {tr('காப்பகத்தை உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.', 'Could not create the archive. Please try again.')}
            </p>
          )}
        </>
      )}
    </Card>
  );
}

export function ExportSection({ narratorId }: { narratorId: string }) {
  const { tr } = useUi();
  const { hash } = useLocation();
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [name, setName] = useState('');
  const [failed, setFailed] = useState(false);
  const podcastRef = useRef<HTMLElement>(null);
  const token = useRef(0);

  const load = useCallback(() => {
    const mine = ++token.current;
    setFailed(false);
    setTracks(null);
    // TODO(api): recordings carry no question display order; created_at ascending stands in for it.
    Promise.all([getAllRecordings({ narrator_id: narratorId, sort: 'asc' }), getNarratorById(narratorId)])
      .then(([recs, n]) => {
        if (mine !== token.current) return;
        const ordered = recs
          .filter((r: Recording) => !!r.storage_key)
          .map((r, i) => ({ r, i }))
          .sort((a, b) => (a.r.session_number ?? 0) - (b.r.session_number ?? 0) || a.i - b.i)
          .map(({ r }) => ({
            id: r.id,
            storageKey: r.storage_key,
            questionTamil: r.question_tamil ?? '',
            questionEnglish: r.question_english,
            durationSeconds: r.duration_seconds,
          }));
        setName(narratorName(n));
        setTracks(ordered);
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

  const ready = tracks !== null;
  useEffect(() => {
    if (ready && hash === '#podcast') podcastRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [ready, hash]);

  if (failed) {
    return (
      <div role="alert" className={s.loadError}>
        <p>{tr('இந்தப் பகுதியை ஏற்ற முடியவில்லை.', 'Could not load this section.')}</p>
        <Button variant="secondary" onClick={load}>{tr('மீண்டும் முயற்சி', 'Try again')}</Button>
      </div>
    );
  }
  if (tracks === null) return <div aria-busy="true" aria-label={tr('ஏற்றுகிறது', 'Loading')} className={s.loading} />;

  return (
    <div className={s.root}>
      <section id="podcast" ref={podcastRef} className={s.block} aria-labelledby="podcast-h">
        <h2 id="podcast-h" className={s.heading}>{tr(`${name} குரல்`, `${name}'s voice`)}</h2>
        {tracks.length === 0 ? (
          <EmptyState
            title={tr('இன்னும் பதிவுகள் இல்லை', 'No recordings yet')}
            body={tr('நேர்காணல் செய்தால் குரல் தொகுப்பு இங்கே தோன்றும்.', 'The voice collection appears here after an interview.')}
          />
        ) : (
          <Card>
            <PodcastPlayer tracks={tracks} />
          </Card>
        )}
      </section>

      <section className={s.block} aria-labelledby="archive-h">
        <h2 id="archive-h" className={s.heading}>{tr('காப்பகத்தைப் பதிவிறக்கு', 'Download archive')}</h2>
        <ul className={s.grid}>
          <ArchiveCard
            narratorId={narratorId}
            kind="audio"
            titleTa="ஒலிப்பதிவுகள் மட்டும்"
            titleEn="Audio only"
            bodyTa="எல்லா குரல் பதிவுகளும்."
            bodyEn="All the voice recordings."
          />
          <ArchiveCard
            narratorId={narratorId}
            kind="transcripts"
            titleTa="எழுத்துப்படிகள் மட்டும்"
            titleEn="Transcripts only"
            bodyTa="எல்லா எழுத்துப்படிகளும்."
            bodyEn="All the written transcripts."
          />
          <ArchiveCard
            narratorId={narratorId}
            kind="full"
            titleTa="முழு காப்பகம்"
            titleEn="Everything"
            bodyTa="ஒலிப்பதிவுகள், எழுத்துப்படிகள், கதை."
            bodyEn="Recordings, transcripts and the story."
          />
        </ul>
      </section>

      <section className={s.block} aria-labelledby="pdf-h">
        <Card className={s.pdf}>
          <h2 id="pdf-h" className={s.heading}>{tr('PDF புத்தகம்', 'PDF book')}</h2>
          <p className={s.cardBody}>{tr('விரைவில்', 'Coming soon')}</p>
          <Button variant="secondary" disabled>{tr('புத்தகம் உருவாக்கு', 'Create book')}</Button>
        </Card>
      </section>
    </div>
  );
}
