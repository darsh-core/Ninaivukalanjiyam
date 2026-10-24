import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createNarrator, getNarratorById, updateNarrator } from '../services';
import type { NarratorInput } from '../types';
import { Button } from '../ui/Button/Button';
import { Card } from '../ui/Card/Card';
import { Field } from '../ui/Field/Field';
import { PageHeader } from '../ui/PageHeader/PageHeader';
import { PhotoFrame } from '../ui/PhotoFrame/PhotoFrame';
import { useUi } from '../context/UiContext';
import s from './ElderFormPage.module.css';

const MAX_PHOTO = 2 * 1024 * 1024;

const EMPTY: NarratorInput = {
  full_name_tamil: '', full_name_english: '', preferred_name: '', birth_year: '',
  place_of_birth: '', preferred_language: 'ta', tamil_dialect: '', profile_photo_url: '',
};

interface Errors { name?: string; year?: string; photo?: string; save?: string }

export function ElderFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tr } = useUi();
  const editing = Boolean(id);
  const [form, setForm] = useState<NarratorInput>(EMPTY);
  const [loading, setLoading] = useState(editing);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const [reload, setReload] = useState(0);
  const retry = useCallback(() => {
    setLoadFailed(false);
    setReload((r) => r + 1);
  }, []);

  useEffect(() => {
    if (!id) return;
    let live = true;
    getNarratorById(id)
      .then((n) => {
        if (!live) return;
        setForm({
          full_name_tamil: n.full_name_tamil ?? '', full_name_english: n.full_name_english ?? '',
          preferred_name: n.preferred_name ?? '', birth_year: n.birth_year ? String(n.birth_year) : '',
          place_of_birth: n.place_of_birth ?? '', preferred_language: n.preferred_language || 'ta',
          tamil_dialect: n.tamil_dialect ?? '', profile_photo_url: n.profile_photo_url ?? '',
        });
        setLoading(false);
      })
      .catch(() => {
        if (live) setLoadFailed(true);
      });
    return () => {
      live = false;
    };
  }, [id, reload]);

  const set = (k: keyof NarratorInput) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setErrors((x) => ({ ...x, photo: undefined }));
      return;
    }
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
    reader.onload = () => {
      setForm((f) => ({ ...f, profile_photo_url: String(reader.result) }));
      setErrors((x) => ({ ...x, photo: undefined }));
    };
    reader.onerror = () => setErrors((x) => ({ ...x, photo: tr('படத்தைப் படிக்க முடியவில்லை.', 'Could not read the photo.') }));
    reader.readAsDataURL(file);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const thisYear = new Date().getFullYear();
    const next: Errors = {};
    if (!form.full_name_tamil.trim() && !form.full_name_english.trim()) {
      next.name = tr('ஒரு பெயராவது தேவை.', 'At least one name is required.');
    }
    const year = form.birth_year.trim();
    if (year && !(/^\d{4}$/.test(year) && Number(year) >= 1900 && Number(year) <= thisYear)) {
      next.year = tr(`4 இலக்க ஆண்டு (1900–${thisYear}) தேவை.`, `Enter a 4-digit year between 1900 and ${thisYear}.`);
    }
    setErrors(next);
    if (next.name || next.year) return;
    setSaving(true);
    try {
      const input = { ...form, birth_year: year };
      const saved = id ? await updateNarrator(id, input) : await createNarrator(input);
      navigate(`/elders/${saved.id}/interviews`);
    } catch {
      setErrors({ save: tr('சேமிக்க முடியவில்லை. மீண்டும் முயலவும்.', 'Could not save. Please try again.') });
      setSaving(false);
    }
  };

  const initials = Array.from(form.full_name_tamil || form.full_name_english)[0] ?? '?';

  if (loadFailed) {
    return (
      <div role="alert" className={s.error}>
        <p>{tr('பெரியவரின் விவரம் கிடைக்கவில்லை.', 'Could not load this elder.')}</p>
        <Button variant="secondary" onClick={retry}>{tr('மீண்டும் முயற்சி', 'Try again')}</Button>{' '}
        <Link to="/">{tr('எங்கள் குடும்பம்', 'Our family')}</Link>
      </div>
    );
  }
  if (loading) return <div className={s.skeleton} aria-busy="true" aria-label={tr('ஏற்றுகிறது', 'Loading')} />;

  return (
    <div className={s.page}>
      <PageHeader title={editing ? tr('விவரங்களைத் திருத்து', 'Edit elder') : tr('குடும்பப் பெரியவரைச் சேர்', 'Add a family elder')} />
      <Card>
        <form className={s.form} onSubmit={onSubmit} noValidate>
          <div className={s.photoRow}>
            <PhotoFrame initials={initials} photoUrl={form.profile_photo_url} size="lg" />
            <div className={s.photoField}>
              <Field label={tr('புகைப்படம் (விருப்பம்)', 'Photo (optional)')}>
                <input type="file" accept="image/*" onChange={onPhoto} />
              </Field>
              {errors.photo && <p className={s.fieldError} role="alert">{errors.photo}</p>}
            </div>
          </div>
          <Field label={tr('தமிழ் பெயர்', 'Tamil name')}>
            <input value={form.full_name_tamil} onChange={set('full_name_tamil')} />
          </Field>
          <Field label={tr('ஆங்கிலப் பெயர்', 'English name')}>
            <input value={form.full_name_english} onChange={set('full_name_english')} />
          </Field>
          {errors.name && <p className={s.fieldError} role="alert">{errors.name}</p>}
          <Field label={tr('அழைக்கும் முறை', 'Form of address')}>
            <input value={form.preferred_name} onChange={set('preferred_name')} />
          </Field>
          <Field label={tr('பிறந்த ஆண்டு (தோராயமாக)', 'Approximate birth year')}>
            <input inputMode="numeric" value={form.birth_year} onChange={set('birth_year')} />
          </Field>
          {errors.year && <p className={s.fieldError} role="alert">{errors.year}</p>}
          <Field label={tr('சொந்த ஊர்', 'Hometown')}>
            <input value={form.place_of_birth} onChange={set('place_of_birth')} />
          </Field>
          <Field label={tr('பேசும் மொழி', 'Spoken language')}>
            <select value={form.preferred_language} onChange={set('preferred_language')}>
              <option value="ta">{tr('தமிழ்', 'Tamil')}</option>
              <option value="ta-en">{tr('தமிழ் + ஆங்கிலம்', 'Tamil + English')}</option>
              <option value="en">{tr('ஆங்கிலம்', 'English')}</option>
            </select>
          </Field>
          <Field label={tr('வட்டார வழக்கு', 'Dialect')}>
            <input value={form.tamil_dialect} onChange={set('tamil_dialect')} />
          </Field>
          {errors.save && <p className={s.fieldError} role="alert">{errors.save}</p>}
          <div className={s.actions}>
            <Button type="submit" size="lg" disabled={saving}>{tr('சேமி', 'Save')}</Button>
            <Link to={id ? `/elders/${id}` : '/'} className={s.cancel}>{tr('ரத்து', 'Cancel')}</Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
