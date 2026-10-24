import { useCallback, useEffect, useState } from 'react';
import type { LifeEvent, Recording, StoryChapter, StoryDraft } from '../../types';
import { useUi } from '../../context/UiContext';
import {
  getTimelineByNarrator,
  getStoryDrafts,
  updateStoryDraft,
  generateStoryDraftFromSources,
  getAllRecordings,
} from '../../services';
import { NotAvailableError } from '../../services/errors';
import { Card } from '../../ui/Card/Card';
import { Button } from '../../ui/Button/Button';
import { Bi } from '../../ui/Bi/Bi';
import { EmptyState } from '../../ui/EmptyState/EmptyState';
import { NotAvailable } from '../../ui/NotAvailable/NotAvailable';
import s from './StorySection.module.css';

function Chapter({ draft, chapter, onSaved }: { draft: StoryDraft; chapter: StoryChapter; onSaved: (d: StoryDraft) => void }) {
  const { tr } = useUi();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const chapters = draft.chapters.map((c) => (c.id === chapter.id ? { ...c, content: text } : c));
      onSaved(await updateStoryDraft(draft.id, { chapters }));
      setEditing(false);
    } catch {
      setError(tr('சேமிக்க முடியவில்லை. மீண்டும் முயலுங்கள்.', 'Could not save. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={s.chapter} aria-labelledby={`ch-${chapter.id}`}>
      <h3 id={`ch-${chapter.id}`} className={s.chapterTitle}>{chapter.title}</h3>
      {chapter.title_english && <p className={s.sub} lang="en">{chapter.title_english}</p>}
      {editing ? (
        <>
          <textarea
            className={s.textarea}
            rows={8}
            value={text}
            lang="ta"
            aria-label={tr('அத்தியாய உரை', 'Chapter text')}
            onChange={(e) => setText(e.target.value)}
          />
          <div className={s.actions}>
            <Button onClick={save} disabled={busy}>{tr('சேமி', 'Save')}</Button>
            <Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>{tr('ரத்து', 'Cancel')}</Button>
          </div>
        </>
      ) : (
        <>
          <p className={s.content}>{chapter.content}</p>
          <div className={s.actions}>
            <Button variant="secondary" onClick={() => { setText(chapter.content); setError(''); setEditing(true); }}>
              {tr('திருத்து', 'Edit')}
            </Button>
          </div>
        </>
      )}
      {error && <p role="alert" className={s.error}>{error}</p>}
    </section>
  );
}

function Chooser({ narratorId, onCreated, onCancel, onUnavailable }: {
  narratorId: string;
  onCreated: (d: StoryDraft) => void;
  onCancel: () => void;
  onUnavailable: (feature: string) => void;
}) {
  const { tr } = useUi();
  const [events, setEvents] = useState<LifeEvent[] | null>(null);
  const [recs, setRecs] = useState<Recording[]>([]);
  const [evSel, setEvSel] = useState<Set<string>>(new Set());
  const [recSel, setRecSel] = useState<Set<string>>(new Set());
  const [language, setLanguage] = useState<'ta' | 'en'>('ta');
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoadFailed(false);
    Promise.all([getTimelineByNarrator(narratorId), getAllRecordings({ narrator_id: narratorId })])
      .then(([ev, rc]) => {
        if (!alive) return;
        const good = ev.filter((e) => e.extraction_status === 'confirmed' || e.extraction_status === 'corrected');
        setEvents(good);
        setRecs(rc);
        setEvSel(new Set(good.map((e) => e.id)));
        setRecSel(new Set(rc.map((r) => r.id)));
      })
      .catch(() => alive && setLoadFailed(true));
    return () => {
      alive = false;
    };
  }, [narratorId, attempt]);

  const toggle = (set: Set<string>, id: string, put: (n: Set<string>) => void) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    put(n);
  };

  const generate = async () => {
    setBusy(true);
    setError('');
    try {
      onCreated(await generateStoryDraftFromSources(narratorId, language, { eventIds: [...evSel], recordingIds: [...recSel] }));
    } catch (e) {
      if (e instanceof NotAvailableError) onUnavailable(e.feature);
      else {
        setError(tr('வரைவை உருவாக்க முடியவில்லை. மீண்டும் முயலுங்கள்.', 'Could not create the draft. Please try again.'));
        setBusy(false);
      }
    }
  };

  if (loadFailed) {
    return (
      <Card>
        <div role="alert" className={s.loadError}>
          <p>{tr('ஆதாரங்களை ஏற்ற முடியவில்லை.', 'Could not load the sources.')}</p>
          <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>{tr('மீண்டும் முயற்சி', 'Try again')}</Button>
          <Button variant="text" onClick={onCancel}>{tr('ரத்து', 'Cancel')}</Button>
        </div>
      </Card>
    );
  }
  if (events === null) return <div aria-busy="true" aria-label={tr('ஏற்றுகிறது', 'Loading')} className={s.loading} />;

  const nothing = evSel.size + recSel.size === 0;

  return (
    <Card className={s.chooser}>
      <h3 className={s.chooserTitle}>{tr('வரைவுக்கான ஆதாரங்களைத் தேர்ந்தெடுக்கவும்', 'Choose what the draft is built from')}</h3>
      <fieldset className={s.fieldset}>
        <legend>{tr('உறுதி செய்யப்பட்ட நினைவுகள்', 'Confirmed memories')}</legend>
        {events.length === 0 && <p className={s.note}>{tr('உறுதி செய்யப்பட்ட நினைவுகள் இல்லை.', 'No confirmed memories yet.')}</p>}
        {events.map((e) => (
          <label key={e.id} className={s.check}>
            <input type="checkbox" checked={evSel.has(e.id)} onChange={() => toggle(evSel, e.id, setEvSel)} />
            <span>{e.title_tamil || e.title}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className={s.fieldset}>
        <legend>{tr('பதிவுகள்', 'Recordings')}</legend>
        {recs.length === 0 && <p className={s.note}>{tr('பதிவுகள் இல்லை.', 'No recordings yet.')}</p>}
        {recs.map((r) => (
          <label key={r.id} className={s.check}>
            <input type="checkbox" checked={recSel.has(r.id)} onChange={() => toggle(recSel, r.id, setRecSel)} />
            <span>
              {r.question_tamil || r.question_english}
              <span className={s.note}> · {tr(`எடுப்பு ${r.version_number}`, `Take ${r.version_number}`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset className={s.fieldset}>
        <legend>{tr('மொழி', 'Language')}</legend>
        <label className={s.check}>
          <input type="radio" name="story-lang" checked={language === 'ta'} onChange={() => setLanguage('ta')} />
          <span>தமிழ்</span>
        </label>
        <label className={s.check}>
          <input type="radio" name="story-lang" checked={language === 'en'} onChange={() => setLanguage('en')} />
          <span>English</span>
        </label>
      </fieldset>
      {error && <p role="alert" className={s.error}>{error}</p>}
      <div className={s.actions}>
        <Button onClick={generate} disabled={nothing || busy}>{tr('வரைவை உருவாக்கு', 'Generate draft')}</Button>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>{tr('ரத்து', 'Cancel')}</Button>
      </div>
      {busy && <p role="status" className={s.note}>{tr('வரைவை உருவாக்குகிறது…', 'Creating the draft…')}</p>}
    </Card>
  );
}

export function StorySection({ narratorId }: { narratorId: string }) {
  const { tr } = useUi();
  const [drafts, setDrafts] = useState<StoryDraft[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [unavailable, setUnavailable] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await getStoryDrafts(narratorId);
      setDrafts(d);
      setSelectedId((cur) => (cur && d.some((x) => x.id === cur) ? cur : d[d.length - 1]?.id ?? null));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [narratorId]);

  useEffect(() => {
    setDrafts(null);
    load();
  }, [load]);

  if (failed && drafts === null) {
    return (
      <div role="alert" className={s.loadError}>
        <p>{tr('வாழ்க்கைக் கதையை ஏற்ற முடியவில்லை.', 'Could not load the life story.')}</p>
        <Button variant="secondary" onClick={() => { setFailed(false); load(); }}>{tr('மீண்டும் முயற்சி', 'Try again')}</Button>
      </div>
    );
  }
  if (drafts === null) return <div aria-busy="true" aria-label={tr('ஏற்றுகிறது', 'Loading')} className={s.loading} />;

  const draft = drafts.find((d) => d.id === selectedId) ?? null;
  const replace = (d: StoryDraft) => setDrafts((all) => (all ?? []).map((x) => (x.id === d.id ? d : x)));

  return (
    <div className={s.root}>
      <div className={s.banner} role="note">
        <Bi inline ta="இது AI உருவாக்கிய வரைவு" en="AI-generated draft, not verified history" />
        <span className={s.bannerNote}>
          {tr('குடும்பம் சரிபார்க்கும் வரை இதை உண்மையான வரலாறாகக் கொள்ள வேண்டாம்.', 'Please check it with the family before treating it as fact.')}
        </span>
      </div>

      <div className={s.toolbar}>
        <Button onClick={() => { setChoosing(true); setUnavailable(null); }} disabled={choosing}>
          {tr('புதிய வரைவை உருவாக்கு', 'Create a new draft')}
        </Button>
        {drafts.length > 1 && (
          <label className={s.picker}>
            <span>{tr('வரைவு', 'Draft')}</span>
            <select value={selectedId ?? ''} onChange={(e) => setSelectedId(e.target.value)}>
              {drafts.map((d) => (
                <option key={d.id} value={d.id}>
                  {tr(`பதிப்பு ${d.version}`, `Version ${d.version}`)} · {d.title}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {choosing && (
        <Chooser
          narratorId={narratorId}
          onCancel={() => setChoosing(false)}
          onUnavailable={(f) => { setUnavailable(f); setChoosing(false); }}
          onCreated={async (d) => {
            setChoosing(false);
            setSelectedId(d.id);
            await load();
            setSelectedId(d.id);
          }}
        />
      )}
      {unavailable && <NotAvailable feature={unavailable} />}

      {draft ? (
        <article className={s.draft}>
          <h2 className={s.draftTitle}>{draft.title}</h2>
          {draft.chapters.map((c) => (
            <Chapter key={`${draft.id}-${c.id}`} draft={draft} chapter={c} onSaved={replace} />
          ))}
        </article>
      ) : (
        <EmptyState
          title={tr('இன்னும் வரைவுகள் இல்லை', 'No drafts yet')}
          body={tr('உறுதி செய்யப்பட்ட நினைவுகளிலிருந்து ஒரு வரைவை உருவாக்கலாம்.', 'Create a draft from confirmed memories.')}
        />
      )}
    </div>
  );
}
