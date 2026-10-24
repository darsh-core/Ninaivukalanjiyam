import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { LifeEvent } from '../../types';
import { useUi } from '../../context/UiContext';
import {
  getTimelineByNarrator,
  updateLifeEventStatus,
  deleteLifeEvent,
  createLifeEvent,
  extractMemoriesWithAI,
} from '../../services';
import { Card } from '../../ui/Card/Card';
import { Button } from '../../ui/Button/Button';
import { Bi } from '../../ui/Bi/Bi';
import { Field } from '../../ui/Field/Field';
import { EmptyState } from '../../ui/EmptyState/EmptyState';
import { StatusLabel, type Status } from '../../ui/StatusLabel/StatusLabel';
import { AudioPlayer } from '../../ui/AudioPlayer/AudioPlayer';
import s from './TimelineSection.module.css';

const statusOf = (e: LifeEvent): Status =>
  e.extraction_status === 'unreviewed' ? 'needs_review' : e.extraction_status === 'rejected' ? 'rejected' : 'confirmed';

const hasYear = (e: LifeEvent) => e.approximate_year != null && e.date_precision !== 'unknown';

function EventCard({ ev, onChanged }: { ev: LifeEvent; onChanged: () => Promise<void> }) {
  const { tr } = useUi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await onChanged();
    } catch {
      setError(tr('இதைச் செய்ய முடியவில்லை. மீண்டும் முயலுங்கள்.', 'That did not work. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (st: string) => run(() => updateLifeEventStatus(ev.id, st));
  const remove = () => {
    if (!window.confirm(tr('இந்த நினைவை நீக்கவா? இதைத் திரும்பப் பெற முடியாது.', 'Delete this memory? This cannot be undone.'))) return;
    return run(() => deleteLifeEvent(ev.id));
  };

  const year = ev.approximate_year;
  const dateText =
    hasYear(ev) && year != null
      ? ev.date_precision === 'approximate'
        ? tr(`சுமார் ${year}`, `~${year}`)
        : String(year)
      : null;
  const st = ev.extraction_status;

  return (
    <Card className={s.card}>
      <div className={s.head}>
        {dateText && <span className={s.date}>{dateText}</span>}
        <StatusLabel status={statusOf(ev)} />
      </div>
      <Bi as="heading" ta={ev.title_tamil || ev.title} en={ev.title_english} />
      {ev.description && <Bi ta={ev.description} en={ev.description_english} />}
      {ev.place_name && <p className={s.place}>{tr('இடம்: ', 'Place: ')}{ev.place_name}</p>}
      {ev.source_excerpt && (
        <blockquote className={s.excerpt}>
          <span className={s.excerptLabel}>{tr('மூல உரை', 'From the recording')}</span>
          {ev.source_excerpt}
        </blockquote>
      )}
      {ev.storage_key && <AudioPlayer storageKey={ev.storage_key} durationSeconds={ev.duration_seconds ?? undefined} />}
      <div className={s.actions}>
        {st !== 'confirmed' && st !== 'corrected' && (
          <Button variant="secondary" disabled={busy} onClick={() => setStatus('confirmed')}>{tr('உறுதி செய்', 'Confirm')}</Button>
        )}
        {st !== 'rejected' && (
          <Button variant="secondary" disabled={busy} onClick={() => setStatus('rejected')}>{tr('நிராகரி', 'Reject')}</Button>
        )}
        <Button variant="text" disabled={busy} onClick={remove}>{tr('நீக்கு', 'Delete')}</Button>
      </div>
      {error && <p role="alert" className={s.error}>{error}</p>}
    </Card>
  );
}

function AddMemory({ narratorId, onDone, onCancel }: { narratorId: string; onDone: () => Promise<void>; onCancel: () => void }) {
  const { tr } = useUi();
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [place, setPlace] = useState('');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const thisYear = new Date().getFullYear();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(tr('தலைப்பு தேவை.', 'A title is required.'));
      return;
    }
    let y: number | undefined;
    if (year.trim()) {
      y = Number(year);
      if (!Number.isInteger(y) || y < 1800 || y > thisYear) {
        setError(tr(`ஆண்டு 1800 முதல் ${thisYear} வரை இருக்க வேண்டும்.`, `The year must be between 1800 and ${thisYear}.`));
        return;
      }
    }
    setBusy(true);
    setError('');
    try {
      await createLifeEvent(narratorId, {
        title: title.trim(),
        ...(/[஀-௿]/.test(title) ? { title_tamil: title.trim() } : { title_english: title.trim() }),
        description: desc.trim() || null,
        place_name: place.trim() || null,
        approximate_year: y ?? null,
        date_precision: y != null ? 'year' : 'unknown',
        extraction_status: 'confirmed',
      });
      await onDone();
    } catch {
      setError(tr('சேர்க்க முடியவில்லை. மீண்டும் முயலுங்கள்.', 'Could not add the memory. Please try again.'));
      setBusy(false);
    }
  };

  return (
    <Card>
      <form className={s.form} onSubmit={submit} noValidate>
        <Field label={tr('தலைப்பு', 'Title')}>
          <input className={s.input} value={title} onChange={(e) => setTitle(e.target.value)} lang="ta" />
        </Field>
        <Field label={tr('ஆண்டு', 'Year')}>
          <input className={s.input} inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
        </Field>
        <Field label={tr('இடம்', 'Place')}>
          <input className={s.input} value={place} onChange={(e) => setPlace(e.target.value)} lang="ta" />
        </Field>
        <Field label={tr('விவரம்', 'Description')}>
          <textarea className={s.input} rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} lang="ta" />
        </Field>
        {error && <p role="alert" className={s.error}>{error}</p>}
        <div className={s.actions}>
          <Button type="submit" disabled={busy}>{tr('சேர்', 'Add')}</Button>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>{tr('ரத்து', 'Cancel')}</Button>
        </div>
      </form>
    </Card>
  );
}

export function TimelineSection({ narratorId }: { narratorId: string }) {
  const { tr } = useUi();
  const [events, setEvents] = useState<LifeEvent[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [adding, setAdding] = useState(false);
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState('');

  const token = useRef(0);
  const load = useCallback(async () => {
    const mine = ++token.current;
    try {
      const ev = await getTimelineByNarrator(narratorId);
      if (mine !== token.current) return;
      setEvents(ev);
      setFailed(false);
    } catch {
      if (mine !== token.current) return;
      setFailed(true);
    }
  }, [narratorId]);

  useEffect(() => {
    setEvents(null);
    load();
  }, [load]);

  const find = async () => {
    setFinding(true);
    setFindError('');
    try {
      await extractMemoriesWithAI(narratorId);
      await load();
    } catch {
      setFindError(tr('நினைவுகளைக் கண்டறிய முடியவில்லை.', 'Could not find memories.'));
    } finally {
      setFinding(false);
    }
  };

  if (failed && events === null) {
    return (
      <div role="alert" className={s.loadError}>
        <p>{tr('காலவரிசையை ஏற்ற முடியவில்லை.', 'Could not load the timeline.')}</p>
        <Button variant="secondary" onClick={() => { setFailed(false); load(); }}>{tr('மீண்டும் முயற்சி', 'Try again')}</Button>
      </div>
    );
  }
  if (events === null) return <div aria-busy="true" aria-label={tr('ஏற்றுகிறது', 'Loading')} className={s.loading} />;

  const rejectedCount = events.filter((e) => e.extraction_status === 'rejected').length;
  const visible = events.filter((e) => showRejected || e.extraction_status !== 'rejected');
  const dated = visible.filter(hasYear).sort((a, b) => (a.approximate_year ?? 0) - (b.approximate_year ?? 0));
  const undated = visible.filter((e) => !hasYear(e));

  return (
    <div className={s.root}>
      <p className={s.note}>
        {tr(
          'இவை உரையாடல்களிலிருந்து கண்டறியப்பட்டவை. உறுதி செய்யும் வரை சரிபார்க்கப்படாதவை.',
          'These are drawn from the interviews. Until you confirm them, they are not verified.',
        )}
      </p>
      <div className={s.toolbar}>
        <Button onClick={() => setAdding(true)} disabled={adding}>{tr('+ நினைவைச் சேர்', '+ Add memory')}</Button>
        <Button variant="secondary" onClick={find} disabled={finding}>
          {tr('எழுத்துப்படிகளிலிருந்து கண்டறி (AI)', 'Find memories in transcripts (AI)')}
        </Button>
        {rejectedCount > 0 && (
          <label className={s.toggle}>
            <input type="checkbox" checked={showRejected} onChange={(e) => setShowRejected(e.target.checked)} />
            <span>{tr('நிராகரிக்கப்பட்டவற்றைக் காட்டு', 'Show rejected')}</span>
          </label>
        )}
      </div>
      {failed && (
        <div role="alert" className={s.error}>
          {tr('காலவரிசையைப் புதுப்பிக்க முடியவில்லை. காட்டப்படுவது பழையதாக இருக்கலாம்.', 'Could not refresh the timeline. What you see may be out of date.')}{' '}
          <Button variant="text" onClick={load}>{tr('மீண்டும் முயற்சி', 'Try again')}</Button>
        </div>
      )}
      {finding && <p role="status" className={s.note}>{tr('எழுத்துப்படிகளில் நினைவுகளைத் தேடுகிறது…', 'Looking through the transcripts…')}</p>}
      {findError && <p role="alert" className={s.error}>{findError}</p>}

      {adding && (
        <AddMemory
          narratorId={narratorId}
          onCancel={() => setAdding(false)}
          onDone={async () => {
            setAdding(false);
            await load();
          }}
        />
      )}

      {visible.length === 0 ? (
        <EmptyState
          title={tr('இன்னும் நினைவுகள் இல்லை', 'No memories yet')}
          body={tr('நினைவைச் சேர்க்கவும் அல்லது எழுத்துப்படிகளிலிருந்து கண்டறியவும்.', 'Add a memory or find them in the transcripts.')}
        />
      ) : (
        <>
          {dated.length > 0 && (
            <ul className={s.timeline}>
              {dated.map((e) => (
                <li key={e.id}><EventCard ev={e} onChanged={load} /></li>
              ))}
            </ul>
          )}
          {undated.length > 0 && (
            <section className={s.group}>
              <h3 className={s.groupTitle}>{tr('தேதி தெரியாதவை', 'Date unknown')}</h3>
              <ul className={s.timeline}>
                {undated.map((e) => (
                  <li key={e.id}><EventCard ev={e} onChanged={load} /></li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
