import type { ElementType, HTMLAttributes } from 'react';
import s from './Card.module.css';

interface Props extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
}

export function Card({ as: Tag = 'div', className, ...rest }: Props) {
  return <Tag className={[s.card, className].filter(Boolean).join(' ')} {...rest} />;
}
