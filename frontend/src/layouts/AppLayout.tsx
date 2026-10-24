import { useEffect, useRef, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { IS_MOCK } from '../services';
import { LangToggle } from './LangToggle';
import s from './AppLayout.module.css';

export function AppLayout() {
  const { logout } = useAuth();
  const { tr } = useUi();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <Link to="/" className={s.brand}>நினைவுக் களஞ்சியம்</Link>
        <div className={s.right}>
          {IS_MOCK && <span className={s.badge}>{tr('மாதிரி தரவு', 'Demo data')}</span>}
          <LangToggle />
          <div className={s.menu} ref={menuRef}>
            <button
              type="button"
              className={s.menuBtn}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label={tr('பட்டி', 'Menu')}
              onClick={() => setOpen(!open)}
            >
              <span aria-hidden="true">☰</span>
            </button>
            {open && (
              <div className={s.pop} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={s.item}
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                >
                  {tr('வெளியேறு', 'Sign out')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className={s.main}>
        <Outlet />
      </main>
    </div>
  );
}
