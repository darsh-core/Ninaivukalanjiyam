import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { Button } from '../ui/Button/Button';
import { Bi } from '../ui/Bi/Bi';
import s from './WelcomePage.module.css';

export function WelcomePage() {
  const { isAuthenticated } = useAuth();
  const { lang, setLang } = useUi();
  const location = useLocation();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return (
    <main className={s.page}>
      <div className={s.top}>
        <Button variant="text" onClick={() => setLang(lang === 'ta' ? 'en' : 'ta')}>
          {lang === 'ta' ? 'English' : 'தமிழ்'}
        </Button>
      </div>
      <div className={s.hero}>
        <h1 className={s.name}>நினைவுக் களஞ்சியம்</h1>
        <div className={s.line}>
          <Bi
            ta="உங்கள் வீட்டுப் பெரியவர்களின் குரலையும் கதைகளையும் குடும்பத்துக்காகப் பாதுகாக்கும் இடம்."
            en="A place to keep your elders' voices and stories safe for the family."
          />
        </div>
        <div className={s.actions}>
          <Link to="/signin" state={location.state} className={s.primary}>
            <Bi ta="உள்நுழை" en="Sign in" />
          </Link>
          <Link to="/signin?mode=register" state={location.state} className={s.secondary}>
            <Bi ta="குடும்பக் கணக்கு உருவாக்கு" en="Create family account" />
          </Link>
        </div>
      </div>
    </main>
  );
}
