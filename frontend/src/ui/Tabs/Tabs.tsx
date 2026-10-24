import { NavLink } from 'react-router-dom';
import s from './Tabs.module.css';

export function Tabs({ items }: { items: { to: string; label: string }[] }) {
  return (
    <nav className={s.tabs}>
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} className={({ isActive }) => `${s.tab} ${isActive ? s.active : ''}`}>
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}
