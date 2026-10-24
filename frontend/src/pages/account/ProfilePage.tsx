import { useState, type ChangeEvent, type FormEvent } from 'react';
import { updateProfile } from '../../services';
import { NotAvailableError } from '../../services/errors';
import { useAuth } from '../../context/AuthContext';
import { useUi } from '../../context/UiContext';
import { Button } from '../../ui/Button/Button';
import { Card } from '../../ui/Card/Card';
import { Field } from '../../ui/Field/Field';
import { PageHeader } from '../../ui/PageHeader/PageHeader';
import s from './account.module.css';

const MAX_PHOTO = 2 * 1024 * 1024;

interface Errors { name?: string; email?: string; photo?: string; save?: string }

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { lang, setLang, tr } = useUi();
  const [name, setName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [photo, setPhoto] = useState<string | null>(user?.photo_url ?? null);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'local'>('idle');

  if (!user) return null;

  const onPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((x) => ({ ...x, photo: tr('படக் கோப்பை மட்டும் தேர்ந்தெடுக்கவும்.', 'Please choose an image file.') }));
      return;
    }
    if (file.size > MAX_PHOTO) {
      setErrors((x) => ({ ...x, photo: tr('படம் 2 MB-க்குள் இருக்க வேண்டும்.', 'The photo must be under 2 MB.') }));
      return;
    }
    setErrors((x) => ({ ...x, photo: undefined }));
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = tr('பெயர் தேவை.', 'Name is required.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = tr('சரியான மின்னஞ்சலை உள்ளிடவும்.', 'Enter a valid email.');
    setErrors(next);
    if (next.name || next.email) return;
    const input = { fullName: name.trim(), email: email.trim(), photo_url: photo };
    setStatus('saving');
    try {
      updateUser(await updateProfile(input));
      setStatus('saved');
    } catch (err) {
      if (err instanceof NotAvailableError) {
        updateUser({ ...user, ...input });
        setStatus('local');
      } else {
        setErrors({ save: tr('சேமிக்க முடியவில்லை. மீண்டும் முயலுங்கள்.', 'Could not save. Please try again.') });
        setStatus('idle');
      }
    }
  };

  const initial = Array.from(name.trim())[0] ?? '?';

  return (
    <div className={s.page}>
      <PageHeader title={tr('சுயவிவரம்', 'Profile')} />
      <Card>
        <form className={s.form} onSubmit={onSubmit} noValidate>
          <div className={s.photoRow}>
            <span className={s.bigAvatar} aria-hidden="true">
              {photo ? <img src={photo} alt="" /> : initial}
            </span>
            <div className={s.photoActions}>
              <label className={s.fileBtn}>
                {tr('படத்தை மாற்று', 'Change photo')}
                <input type="file" accept="image/*" onChange={onPhoto} />
              </label>
              {photo && (
                <Button variant="text" onClick={() => setPhoto(null)}>{tr('படத்தை நீக்கு', 'Remove photo')}</Button>
              )}
            </div>
          </div>
          {errors.photo && <p role="alert" className={s.fieldError}>{errors.photo}</p>}

          <Field label={tr('பெயர்', 'Name')}>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
          {errors.name && <p role="alert" className={s.fieldError}>{errors.name}</p>}

          <Field label={tr('மின்னஞ்சல்', 'Email')}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          {errors.email && <p role="alert" className={s.fieldError}>{errors.email}</p>}

          <fieldset className={s.langSet}>
            <legend>{tr('இயல்பு மொழி', 'Default language')}</legend>
            <label className={s.radio}>
              <input type="radio" name="lang" checked={lang === 'ta'} onChange={() => setLang('ta')} /> தமிழ்
            </label>
            <label className={s.radio}>
              <input type="radio" name="lang" checked={lang === 'en'} onChange={() => setLang('en')} /> English
            </label>
          </fieldset>

          {errors.save && <p role="alert" className={s.fieldError}>{errors.save}</p>}
          <div className={s.actions}>
            <Button type="submit" size="lg" disabled={status === 'saving'}>{tr('சேமி', 'Save')}</Button>
            <span role="status" className={s.status}>
              {status === 'saved' && tr('சேமிக்கப்பட்டது ✓', 'Saved ✓')}
              {status === 'local' && tr(
                'இந்தச் சாதனத்தில் மட்டும் சேமிக்கப்பட்டது — சேவையக ஆதரவு விரைவில்.',
                'Saved on this device only — server support is coming.',
              )}
            </span>
          </div>
        </form>
      </Card>
    </div>
  );
}
