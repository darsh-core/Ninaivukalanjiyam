import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { Button } from '../ui/Button/Button';
import { Card } from '../ui/Card/Card';
import { Field } from '../ui/Field/Field';
import { PageHeader } from '../ui/PageHeader/PageHeader';
import { Tagline } from './Tagline';
import s from './SignInPage.module.css';

export function SignInPage() {
  const { login, register, isAuthenticated } = useAuth();
  const { lang, tr } = useUi();
  const location = useLocation();
  const [params] = useSearchParams();
  const [creating, setCreating] = useState(params.get('mode') === 'register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const from = (location.state as { from?: { pathname: string; search?: string; hash?: string } } | null)?.from;
  const target = from ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : '/';

  if (isAuthenticated) return <Navigate to={target} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (creating) await register(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : tr('உள்நுழைய முடியவில்லை. மீண்டும் முயலுங்கள்.', 'Could not sign in. Please try again.'));
      setBusy(false);
    }
  };

  return (
    <div className={s.split}>
      <aside className={s.intro}>
        <Link to="/welcome" className={s.introBrand}>← நினைவுக் களஞ்சியம்</Link>
        <div className={s.introBody}>
          <p className={s.introTagline}><Tagline /></p>
          {lang === 'en' && <p className={s.introTaglineEn}>Let’s preserve the voices and memories of our family elders.</p>}
          <p className={s.introText}>
            {tr(
              'ஒவ்வொரு பெரியவரிடமும் ஒரு புத்தகம் அளவு கதைகள் இருக்கின்றன. அவர்களின் குரல், சிரிப்பு, பழமொழிகள் — பேரக்குழந்தைகள் என்றும் கேட்கும்படி பாதுகாப்போம்.',
              'Every elder carries a book of stories. Their voice, their laugh, their sayings — let’s keep them for the grandchildren to hear, always.',
            )}
          </p>
          <ul className={s.introPoints}>
            <li>{tr('🎙️ ஒரு கேள்வி, ஒரு பெரிய பொத்தான் — பதிவு எளிது', '🎙️ One question, one big button — recording is easy')}</li>
            <li>{tr('🔊 மூலக் குரல் அப்படியே பாதுகாக்கப்படும்', '🔊 The original voice is kept exactly as spoken')}</li>
            <li>{tr('🔒 உங்கள் குடும்பத்துக்கு மட்டும்', '🔒 Private to your family')}</li>
          </ul>
          <p className={s.introCall}>
            {tr('இன்றே தொடங்குங்கள் — முதல் கேள்வி காத்திருக்கிறது. →', 'Start today — the first question is waiting. →')}
          </p>
        </div>
      </aside>
      <main className={s.page}>
      <Card as="section" className={s.card}>
        <PageHeader title={creating ? tr('குடும்பக் கணக்கு உருவாக்கு', 'Create family account') : tr('உள்நுழை', 'Sign in')} />
        <form onSubmit={submit} className={s.form}>
          {creating && (
            <Field label={tr('பெயர்', 'Name')}>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </Field>
          )}
          <Field label={tr('மின்னஞ்சல்', 'Email')}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <Field label={tr('கடவுச்சொல்', 'Password')}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={creating ? 'new-password' : 'current-password'}
            />
          </Field>
          {error && <p role="alert" className={s.error}>{error}</p>}
          <Button type="submit" size="lg" disabled={busy}>
            {creating ? tr('கணக்கு உருவாக்கு', 'Create account') : tr('உள்நுழை', 'Sign in')}
          </Button>
        </form>
        <Button variant="text" onClick={() => { setCreating(!creating); setError(''); }}>
          {creating ? tr('ஏற்கனவே கணக்கு உள்ளதா? உள்நுழை', 'Have an account? Sign in') : tr('புதிய கணக்கு உருவாக்கு', 'Create a new account')}
        </Button>
      </Card>
      </main>
    </div>
  );
}
