import { useEffect, useState } from 'react';
import { getConsent, getNarrators } from '../../services';
import type { ConsentRecord, Narrator } from '../../types';
import { useUi } from '../../context/UiContext';
import { Card } from '../../ui/Card/Card';
import { PageHeader } from '../../ui/PageHeader/PageHeader';
import { StatusLabel } from '../../ui/StatusLabel/StatusLabel';
import { applyElderOrder } from '../../utils/elderOrder';
import { narratorName } from '../../utils/narrator';
import s from './account.module.css';

// 'unknown' = the consent state could not be read (e.g. no backend endpoint yet)
type ConsentState = ConsentRecord | null | 'unknown';

export function PrivacyPage() {
  const { lang, tr } = useUi();
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(lang === 'en' ? 'en-IN' : 'ta-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const [rows, setRows] = useState<{ n: Narrator; consent: ConsentState }[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const elders = applyElderOrder(await getNarrators());
      const consents = await Promise.all(
        elders.map((n) => getConsent(n.id).catch((): ConsentState => 'unknown')),
      );
      if (alive) setRows(elders.map((n, i) => ({ n, consent: consents[i] })));
    })().catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={s.page}>
      <PageHeader title={tr('தனியுரிமை & ஒப்புதல்', 'Privacy & consent')} />
      <Card className={s.prose}>
        <h2>{tr('எதைச் சேமிக்கிறோம்', 'What we keep')}</h2>
        <p>{tr(
          'பெரியவர்களின் குரல் பதிவுகள், அவற்றின் எழுத்துப்படிகள், நீங்கள் உறுதிசெய்த நினைவுகள். மூல ஒலிப்பதிவு எப்போதும் அப்படியே வைக்கப்படும்.',
          "Elders' voice recordings, their transcripts and the memories you confirm. The original recording is always kept as it is.",
        )}</p>
        <h2>{tr('யார் பார்க்கலாம்', 'Who can see it')}</h2>
        <p>{tr('உங்கள் குடும்பக் கணக்கில் உள்நுழைந்தவர்கள் மட்டும். எதுவும் பொதுவில் பகிரப்படாது.', 'Only people signed in to your family account. Nothing is shared publicly.')}</p>
        <h2>{tr('கணினிச் சேவைகள்', 'Computer services')}</h2>
        <p>{tr(
          'பேச்சை எழுத்தாக மாற்றவும் நினைவுகளைக் கண்டறியவும் வெளிச் சேவைகள் பயன்படுத்தப்படுகின்றன. ஒவ்வொரு பெரியவரின் ஒப்புதலுக்குப் பிறகே பதிவு தொடங்கும்.',
          'Outside services turn speech into text and help find memories. Recording starts only after each elder has agreed.',
        )}</p>
      </Card>

      <h2 className={s.sectionTitle}>{tr('ஒவ்வொரு பெரியவரின் ஒப்புதல்', "Each elder's consent")}</h2>
      {failed && <p role="alert" className={s.fieldError}>{tr('பட்டியலை ஏற்ற முடியவில்லை.', 'Could not load your family.')}</p>}
      {!failed && rows === null && <div className={s.skeleton} aria-label={tr('ஏற்றுகிறது', 'Loading')} />}
      {rows && (
        <ul className={s.rows}>
          {rows.map(({ n, consent }) => (
            <li key={n.id}>
              <Card className={s.consentRow}>
                <span className={s.rowName}>{narratorName(n)}</span>
                {consent === 'unknown' ? (
                  <span className={s.meta}>{tr('நிலை தெரியவில்லை', 'Status unknown')}</span>
                ) : consent ? (
                  <span className={s.consentOk}>
                    <StatusLabel status="confirmed" />
                    <span className={s.meta}>{tr('ஒப்புதல் பெறப்பட்டது', 'Consent given')} · {formatDate(consent.consented_at)}</span>
                  </span>
                ) : (
                  <span className={s.meta}>{tr('இன்னும் ஒப்புதல் இல்லை — முதல் பதிவுக்கு முன் கேட்கப்படும்', 'No consent yet — asked before the first recording')}</span>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
