import type { ButtonHTMLAttributes } from 'react';
import s from './Button.module.css';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...rest }: Props) {
  const cls = [s.btn, s[variant], s[size], className].filter(Boolean).join(' ');
  return <button type={type} className={cls} {...rest} />;
}
