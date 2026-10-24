import { useUi } from '../../context/UiContext';
import s from './Bi.module.css';

interface Props {
  ta: string;
  en?: string | null;
  as?: 'question' | 'body' | 'heading';
  /** Render spans instead of divs, for use inside buttons and other phrasing content. */
  inline?: boolean;
}

export function Bi({ ta, en, as = 'body', inline = false }: Props) {
  const { lang } = useUi();
  const Tag = inline ? 'span' : 'div';
  return (
    <Tag className={`${s.bi} ${s[as]}`}>
      <Tag className={s.ta}>{ta}</Tag>
      {lang === 'en' && en ? <Tag className={s.en}>{en}</Tag> : null}
    </Tag>
  );
}
