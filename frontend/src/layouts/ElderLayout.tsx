import { Link, Outlet, useParams } from 'react-router-dom';
import { useUi } from '../context/UiContext';
import { LangToggle } from './LangToggle';
import s from './ElderLayout.module.css';

export function ElderLayout() {
  const { id } = useParams();
  const { tr } = useUi();
  return (
    <div className={s.shell}>
      <header className={s.header}>
        <Link to={id ? `/elders/${id}` : '/'} className={s.exit}>
          {tr('← வெளியேறு', '← Exit')}
        </Link>
        <LangToggle />
      </header>
      <main className={s.main}>
        <Outlet />
      </main>
    </div>
  );
}
