import { useUi } from '../../context/UiContext';
import s from './Bi.module.css';

interface Props {
  ta: string;
  en?: string | null;
  as?: 'question' | 'body' | 'heading';
}

export function Bi({ ta, en, as = 'body' }: Props) {
  const { lang } = useUi();
  return (
    <div className={`${s.bi} ${s[as]}`}>
      <div className={s.ta}>{ta}</div>
      {lang === 'en' && en ? <div className={s.en}>{en}</div> : null}
    </div>
  );
}
