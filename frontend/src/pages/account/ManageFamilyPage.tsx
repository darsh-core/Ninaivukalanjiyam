import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { archiveNarrator, getNarrators } from '../../services';
import type { Narrator } from '../../types';
import { useUi } from '../../context/UiContext';
import { Button } from '../../ui/Button/Button';
import { Card } from '../../ui/Card/Card';
import { EmptyState } from '../../ui/EmptyState/EmptyState';
import { PageHeader } from '../../ui/PageHeader/PageHeader';
import { PhotoFrame } from '../../ui/PhotoFrame/PhotoFrame';
import { applyElderOrder, saveElderOrder } from '../../utils/elderOrder';
import { narratorInitials, narratorName } from '../../utils/narrator';
import s from './account.module.css';

export function ManageFamilyPage() {
  const { tr } = useUi();
  const [elders, setElders] = useState<Narrator[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const token = useRef(0);

  const load = useCallback(() => {
    const mine = ++token.current;
    setFailed(false);
    getNarrators()
      .then((list) => mine === token.current && setElders(applyElderOrder(list)))
      .catch(() => mine === token.current && setFailed(true));
  }, []);

  useEffect(() => {
    load();
    const t = token;
    return () => {
      t.current++;
    };
  }, [load]);

  const move = (index: number, by: -1 | 1) => {
    if (!elders) return;
    const next = [...elders];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    setElders(next);
    saveElderOrder(next.map((e) => e.id));
  };

  const archive = async (n: Narrator) => {
    const ok = window.confirm(tr(
      `${narratorName(n)} அவர்களைக் காப்பகப்படுத்தவா? அவர்களின் பதிவுகள் நீக்கப்படாது, ஆனால் பட்டியலில் தெரியாது.`,
      `Archive ${narratorName(n)}? Their recordings are kept, but they will no longer appear in your family list.`,
    ));
    if (!ok) return;
    setRowError(null);
    try {
      await archiveNarrator(n.id);
      setElders((list) => list?.filter((x) => x.id !== n.id) ?? null);
    } catch {
      setRowError(n.id);
    }
  };

  return (
    <div className={s.page}>
      <PageHeader
        title={tr('குடும்பத்தை நிர்வகி', 'Manage family')}
        subtitle={tr('பெரியவர்களின் வரிசையை மாற்றலாம், விவரங்களைத் திருத்தலாம் அல்லது காப்பகப்படுத்தலாம்.', 'Reorder, edit or archive the elders in your family.')}
        actions={<Link className={s.addLink} to="/elders/new">+ {tr('பெரியவரைச் சேர்', 'Add elder')}</Link>}
      />

      {failed && (
        <div role="alert" className={s.error}>
          <p>{tr('பட்டியலை ஏற்ற முடியவில்லை.', 'Could not load your family.')}</p>
          <Button variant="secondary" onClick={load}>{tr('மீண்டும் முயற்சி', 'Try again')}</Button>
        </div>
      )}
      {!failed && elders === null && <div className={s.skeleton} aria-label={tr('ஏற்றுகிறது', 'Loading')} />}
      {elders && elders.length === 0 && (
        <EmptyState title={tr('இன்னும் யாரும் இல்லை', 'No one here yet')} body={tr('முதல் பெரியவரைச் சேருங்கள்.', 'Add your first family elder to begin.')} />
      )}

      {elders && elders.length > 0 && (
        <ol className={s.rows}>
          {elders.map((n, i) => {
            const name = narratorName(n);
            return (
              <li key={n.id}>
                <Card className={s.row}>
                  <PhotoFrame initials={narratorInitials(n)} photoUrl={n.profile_photo_url} />
                  <div className={s.rowInfo}>
                    <h2 className={s.rowName}>{name}</h2>
                    <p className={s.meta}>
                      {[n.place_of_birth, tr(`${n.session_count ?? 0} நேர்காணல்கள்`, `${n.session_count ?? 0} interviews`)].filter(Boolean).join(' · ')}
                    </p>
                    {rowError === n.id && (
                      <p role="alert" className={s.fieldError}>{tr('காப்பகப்படுத்த முடியவில்லை.', 'Could not archive.')}</p>
                    )}
                  </div>
                  <div className={s.rowActions}>
                    <Button variant="secondary" aria-label={tr(`${name} — மேலே நகர்த்து`, `Move ${name} up`)} disabled={i === 0} onClick={() => move(i, -1)}>↑</Button>
                    <Button variant="secondary" aria-label={tr(`${name} — கீழே நகர்த்து`, `Move ${name} down`)} disabled={i === elders.length - 1} onClick={() => move(i, 1)}>↓</Button>
                    <Link className={s.rowLink} to={`/elders/${n.id}/edit`} aria-label={tr(`${name} — திருத்து`, `Edit ${name}`)}>{tr('திருத்து', 'Edit')}</Link>
                    <Button variant="text" className={s.danger} aria-label={tr(`${name} — காப்பகப்படுத்து`, `Archive ${name}`)} onClick={() => void archive(n)}>
                      {tr('காப்பகப்படுத்து', 'Archive')}
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
      <p className={s.note}>
        {tr(
          'காப்பகப்படுத்தப்பட்டவர்களின் பதிவுகள் பாதுகாப்பாக இருக்கும். அவர்களை மீண்டும் கொண்டுவரும் வசதி விரைவில்.',
          'Archived elders keep all their recordings. Bringing them back is coming soon.',
        )}
      </p>
    </div>
  );
}
