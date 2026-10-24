import type { ReactNode } from 'react';
import s from './HandNote.module.css';

export function HandNote({ children }: { children: ReactNode }) {
  return <p className={s.note}>{children}</p>;
}
