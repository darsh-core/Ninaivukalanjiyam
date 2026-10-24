import type { ReactNode } from 'react';
import s from './EmptyState.module.css';

interface Props {
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ title, body, action }: Props) {
  return (
    <div className={s.box}>
      <h2 className={s.title}>{title}</h2>
      {body && <p className={s.body}>{body}</p>}
      {action}
    </div>
  );
}
