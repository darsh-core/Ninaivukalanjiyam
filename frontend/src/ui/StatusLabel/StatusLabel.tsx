import { useUi } from '../../context/UiContext';
import s from './StatusLabel.module.css';

export type Status =
  | 'saved' | 'needs_review' | 'failed' | 'queued' | 'processing'
  | 'in_progress' | 'completed' | 'paused' | 'confirmed' | 'rejected';

const LABELS: Record<Status, { ta: string; en: string; tone: 'ok' | 'warn' | 'bad' | 'neutral' }> = {
  saved: { ta: 'சேமிக்கப்பட்டது', en: 'Saved', tone: 'ok' },
  needs_review: { ta: 'சரிபார்க்க வேண்டும்', en: 'Needs review', tone: 'warn' },
  failed: { ta: 'தோல்வி', en: 'Failed', tone: 'bad' },
  queued: { ta: 'வரிசையில்', en: 'Queued', tone: 'neutral' },
  processing: { ta: 'செயலாக்கத்தில்', en: 'Processing', tone: 'neutral' },
  in_progress: { ta: 'நடைபெறுகிறது', en: 'In progress', tone: 'warn' },
  completed: { ta: 'முடிந்தது', en: 'Completed', tone: 'ok' },
  paused: { ta: 'இடைநிறுத்தம்', en: 'Paused', tone: 'neutral' },
  confirmed: { ta: 'உறுதி செய்யப்பட்டது', en: 'Confirmed', tone: 'ok' },
  rejected: { ta: 'நிராகரிக்கப்பட்டது', en: 'Rejected', tone: 'bad' },
};

export function StatusLabel({ status }: { status: Status }) {
  const { tr } = useUi();
  const l = LABELS[status];
  return <span className={`${s.label} ${s[l.tone]}`}>{tr(l.ta, l.en)}</span>;
}
