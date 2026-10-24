import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { Button } from '../ui/Button/Button';
import { Card } from '../ui/Card/Card';
import { Field } from '../ui/Field/Field';
import { PageHeader } from '../ui/PageHeader/PageHeader';
import s from './SignInPage.module.css';

export function SignInPage() {
  const { login, register, isAuthenticated } = useAuth();
  const { tr } = useUi();
  const navigate = useNavigate();
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
  );
}
