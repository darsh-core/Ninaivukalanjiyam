import { useCallback, useEffect, useState } from 'react';
import type { Recording, Transcript } from '../../types';
import { useUi } from '../../context/UiContext';
import { getAllRecordings, getTranscriptsByRecording, updateTranscript, regenerateTranscript } from '../../services';
import { Card } from '../../ui/Card/Card';
import { Button } from '../../ui/Button/Button';
import { Bi } from '../../ui/Bi/Bi';
import { EmptyState } from '../../ui/EmptyState/EmptyState';
import { StatusLabel, type Status } from '../../ui/StatusLabel/StatusLabel';
import { AudioPlayer } from '../../ui/AudioPlayer/AudioPlayer';
import s from './RecordingsSection.module.css';

const statusOf = (r: Recording): Status => {
  const j = r.transcript_job_status;
  if (j) return j === 'done' ? 'saved' : j;
  return r.transcript_reviewed_at ? 'saved' : 'needs_review';
};

const SOURCE: Record<Transcript['source'], [string, string]> = {
  speech_to_text: ['தானியங்கி எழுத்தாக்கம்', 'Automatic transcription'],
  manual: ['கைமுறை', 'Manual'],
  corrected: ['திருத்தப்பட்டது', 'Corrected'],
};

function RecordingCard({ rec, onChanged }: { rec: Recording; onChanged: () => Promise<void> }) {
  const { lang, tr } = useUi();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [empty, setEmpty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [rev, setRev] = useState(0);
  const [versions, setVersions] = useState<Transcript[] | null>(null);
  const [vError, setVError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setVError(false);
    getTranscriptsByRecording(rec.id)
      .then((v) => alive && setVersions(v))
      .catch(() => alive && setVError(true));
    return () => {
      alive = false;
    };
  }, [open, rev, rec.id]);

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString(lang === 'en' ? 'en-IN' : 'ta-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const startEdit = () => {
    setDraft(rec.transcript_text ?? '');
    setEmpty(false);
    setError('');
    setEditing(true);
  };

  const save = async () => {
    if (!draft.trim()) {
      setEmpty(true);
      return;
    }
    if (!rec.transcript_id) return;
    setBusy(true);
    setError('');
    try {
      await updateTranscript(rec.transcript_id, draft.trim(), true);
      setEditing(false);
      setRev((n) => n + 1);
      await onChanged();
    } catch {
      setError(tr('சேமிக்க முடியவில்லை. மீண்டும் முயலுங்கள்.', 'Could not save. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const retranscribe = async () => {
    const ok = window.confirm(
      tr(
        'மீண்டும் எழுத்தாக்கினால் புதிய பதிப்பு உருவாகும். முந்தைய பதிப்புகள் பாதுகாக்கப்படும். தொடரவா?',
        'Re-transcribing creates a new version. Earlier versions are kept. Continue?',
      ),
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      await regenerateTranscript(rec.id);
      setRev((n) => n + 1);
      await onChanged();
    } catch {
      setError(tr('மீண்டும் எழுத்தாக்க முடியவில்லை.', 'Could not re-transcribe.'));
    } finally {
      setBusy(false);
    }
  };

  const hasText = !!rec.transcript_text;

  return (
    <Card className={s.card}>
      <Bi as="question" ta={rec.question_tamil ?? ''} en={rec.question_english} />
      <p className={s.meta}>
        {tr(`எடுப்பு ${rec.version_number}`, `Take ${rec.version_number}`)}
        {fmt(rec.created_at) && ` · ${fmt(rec.created_at)}`}
      </p>
      <AudioPlayer storageKey={rec.storage_key} durationSeconds={rec.duration_seconds} title={rec.question_english ?? rec.question_tamil} />
      <div className={s.statusRow}>
        <span className={s.statusLabel}>{tr('எழுத்துப் பிரதி', 'Transcript')}</span>
        <StatusLabel status={statusOf(rec)} />
      </div>

      {editing ? (
        <div className={s.editor}>
          <label className={s.editLabel}>
            <span>{tr('எழுத்துப் பிரதியைத் திருத்து', 'Edit transcript')}</span>
            <textarea className={s.textarea} rows={6} value={draft} onChange={(e) => setDraft(e.target.value)} lang="ta" />
          </label>
          {empty && <p role="alert" className={s.error}>{tr('உரை காலியாக இருக்கக் கூடாது.', 'The text cannot be empty.')}</p>}
          <p className={s.note}>
            {tr('சேமித்தாலும் முந்தைய பதிப்புகள் பாதுகாக்கப்படும்.', 'Saving keeps earlier versions.')}
          </p>
          <div className={s.actions}>
            <Button onClick={save} disabled={busy}>{tr('சேமி', 'Save')}</Button>
            <Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>{tr('ரத்து', 'Cancel')}</Button>
          </div>
        </div>
      ) : (
        <>
          {hasText ? (
            <Bi ta={rec.transcript_text ?? ''} en={rec.transcript_text_english} />
          ) : (
            <p className={s.pending}>{tr('எழுத்துப் பிரதி இன்னும் தயாராகவில்லை.', 'No transcript text yet.')}</p>
          )}
          <div className={s.actions}>
            <Button variant="secondary" onClick={startEdit} disabled={busy || !rec.transcript_id}>{tr('திருத்து', 'Edit')}</Button>
            <Button variant="secondary" onClick={retranscribe} disabled={busy}>{tr('மீண்டும் எழுத்தாக்கு', 'Re-transcribe')}</Button>
            <Button variant="text" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {tr('பதிப்பு வரலாறு', 'Version history')}
            </Button>
          </div>
        </>
      )}

      {error && <p role="alert" className={s.error}>{error}</p>}

      {open && (
        <div className={s.history}>
          {vError ? (
            <p role="alert" className={s.error}>{tr('வரலாற்றை ஏற்ற முடியவில்லை.', 'Could not load history.')}</p>
          ) : versions === null ? (
            <p className={s.note}>{tr('ஏற்றுகிறது…', 'Loading…')}</p>
          ) : (
            <ul className={s.versions} aria-label={tr('பதிப்புகள்', 'Versions')}>
              {versions.map((v) => (
                <li key={v.id} className={s.version}>
                  <p className={s.vHead}>
                    {tr(`பதிப்பு ${v.version_number}`, `Version ${v.version_number}`)} · {tr(SOURCE[v.source][0], SOURCE[v.source][1])}
                    {fmt(v.created_at) && ` · ${fmt(v.created_at)}`}
                  </p>
                  <p className={s.vText}>{v.transcript_text || tr('(உரை இல்லை)', '(no text)')}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

export function RecordingsSection({ narratorId }: { narratorId: string }) {
  const { tr } = useUi();
  const [recs, setRecs] = useState<Recording[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setRecs(await getAllRecordings({ narrator_id: narratorId }));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [narratorId]);

  useEffect(() => {
    setRecs(null);
    load();
  }, [load]);

  if (failed && recs === null) {
    return (
      <div role="alert" className={s.loadError}>
        <p>{tr('பதிவுகளை ஏற்ற முடியவில்லை.', 'Could not load recordings.')}</p>
        <Button variant="secondary" onClick={() => { setFailed(false); load(); }}>{tr('மீண்டும் முயற்சி', 'Try again')}</Button>
      </div>
    );
  }
  if (recs === null) return <div aria-busy="true" aria-label={tr('ஏற்றுகிறது', 'Loading')} className={s.loading} />;
  if (recs.length === 0) {
    return (
      <EmptyState
        title={tr('இன்னும் பதிவுகள் இல்லை', 'No recordings yet')}
        body={tr('நேர்காணல் செய்தால் பதிவுகள் இங்கே தோன்றும்.', 'Recordings appear here after an interview.')}
      />
    );
  }

  const groups = new Map<string, { title: string; number: number; items: Recording[] }>();
  for (const r of recs) {
    const key = r.session_id ?? '';
    const g = groups.get(key) ?? { title: r.session_title ?? '', number: r.session_number ?? 0, items: [] };
    g.items.push(r);
    groups.set(key, g);
  }
  const ordered = [...groups.entries()].sort((a, b) => b[1].number - a[1].number);

  return (
    <div className={s.root}>
      {ordered.map(([id, g]) => (
        <section key={id} className={s.group} aria-labelledby={`rs-${id}`}>
          <h2 id={`rs-${id}`} className={s.groupTitle}>{g.title}</h2>
          <ul className={s.list}>
            {g.items.map((r) => (
              <li key={r.id}>
                <RecordingCard rec={r} onChanged={load} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
