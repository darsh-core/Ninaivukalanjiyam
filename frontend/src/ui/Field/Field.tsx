import type { ReactNode } from 'react';
import s from './Field.module.css';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      <span className={s.control}>{children}</span>
    </label>
  );
}
