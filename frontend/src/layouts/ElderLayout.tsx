import { useMemo, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import { useUi } from '../context/UiContext';
import { LangToggle } from './LangToggle';
import type { ElderOutletContext } from './elderExit';
import s from './ElderLayout.module.css';

export function ElderLayout() {
  const { id } = useParams();
  const { tr } = useUi();
  const [exitTo, setExitTo] = useState<string | null>(null);
  const outlet = useMemo<ElderOutletContext>(() => ({ setExitTo }), []);
  return (
    <div className={s.shell}>
      <header className={s.header}>
        <Link to={exitTo ?? (id ? `/elders/${id}` : '/')} className={s.exit}>
          {tr('← வெளியேறு', '← Exit')}
        </Link>
        <LangToggle />
      </header>
      <main className={s.main}>
        <Outlet context={outlet} />
      </main>
    </div>
  );
}
