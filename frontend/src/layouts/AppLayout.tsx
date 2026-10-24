import { useEffect, useRef, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { IS_MOCK } from '../services';
import { LangToggle } from './LangToggle';
import s from './AppLayout.module.css';

function initialOf(name: string | undefined) {
  return Array.from(name?.trim() ?? '')[0] ?? '?';
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const { lang, setLang, tr } = useUi();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

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
              <span className={s.avatar} aria-hidden="true">
                {user?.photo_url ? <img src={user.photo_url} alt="" /> : initialOf(user?.fullName)}
              </span>
              <span className={s.burger} aria-hidden="true">☰</span>
            </button>
            {open && (
              <div className={s.pop} role="menu">
                <div className={s.who}>
                  <span className={s.whoName}>{user?.fullName}</span>
                  <span className={s.whoEmail}>{user?.email}</span>
                </div>
                <div className={s.sep} role="separator" />
                <Link to="/profile" role="menuitem" className={s.item} onClick={close}>
                  <span aria-hidden="true">👤</span> {tr('சுயவிவரம்', 'Profile')}
                </Link>
                <Link to="/family" role="menuitem" className={s.item} onClick={close}>
                  <span aria-hidden="true">👪</span> {tr('குடும்பத்தை நிர்வகி', 'Manage family')}
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  className={s.item}
                  onClick={() => {
                    setLang(lang === 'ta' ? 'en' : 'ta');
                    close();
                  }}
                >
                  <span aria-hidden="true">🌐</span> {lang === 'ta' ? 'English' : 'தமிழ்'}
                </button>
                <Link to="/help" role="menuitem" className={s.item} onClick={close}>
                  <span aria-hidden="true">❓</span> {tr('உதவி & வழிகாட்டி', 'Help & guide')}
                </Link>
                <Link to="/privacy" role="menuitem" className={s.item} onClick={close}>
                  <span aria-hidden="true">🔒</span> {tr('தனியுரிமை & ஒப்புதல்', 'Privacy & consent')}
                </Link>
                <div className={s.sep} role="separator" />
                <button
                  type="button"
                  role="menuitem"
                  className={`${s.item} ${s.signOut}`}
                  onClick={() => {
                    close();
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
