import React, { useState, useEffect, useRef } from 'react';
import { X, User, Save, MapPin, Calendar, Languages, Image, Camera, Upload, Trash2, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { createNarrator, updateNarrator } from '../services/api';
import type { NarratorInput } from '../types';

export const Screen5_AddEditNarratorModal: React.FC<{ onSaved?: () => void }> = ({ onSaved }) => {
  const { user } = useAuth();
  const {
    isAddNarratorOpen,
    setIsAddNarratorOpen,
    editingNarrator,
    setEditingNarrator,
    setActiveNarrator,
    showToast,
    uiLanguage,
  } = useApp();

  const [form, setForm] = useState<NarratorInput>({
    full_name_tamil: '',
    full_name_english: '',
    preferred_name: '',
    birth_year: '',
    place_of_birth: '',
    preferred_language: 'ta',
    tamil_dialect: '',
    profile_photo_url: '',
  });

  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const validExts = /\.(jpe?g|png)$/i;
    if (!validTypes.includes(file.type.toLowerCase()) && !validExts.test(file.name)) {
      setError(uiLanguage === 'ta' ? 'தயவுசெய்து JPG அல்லது JPEG வடிவ புகைப்படத்தை தேர்வு செய்யவும்.' : 'Please select a JPG or JPEG photo.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError(uiLanguage === 'ta' ? 'புகைப்படம் 15MB-க்கும் குறைவாக இருக்க வேண்டும்.' : 'Photo size must be under 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        // Optimize resolution to max 1000x1000
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setForm((prev) => ({ ...prev, profile_photo_url: dataUrl }));
          setError('');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  useEffect(() => {
    if (editingNarrator) {
      setForm({
        full_name_tamil: editingNarrator.full_name_tamil || '',
        full_name_english: editingNarrator.full_name_english || '',
        preferred_name: editingNarrator.preferred_name || '',
        birth_year: editingNarrator.birth_year ? editingNarrator.birth_year.toString() : '',
        place_of_birth: editingNarrator.place_of_birth || '',
        preferred_language: editingNarrator.preferred_language || 'ta',
        tamil_dialect: editingNarrator.tamil_dialect || '',
        profile_photo_url: editingNarrator.profile_photo_url || '',
      });
    } else {
      setForm({
        full_name_tamil: '',
        full_name_english: '',
        preferred_name: '',
        birth_year: '',
        place_of_birth: '',
        preferred_language: 'ta',
        tamil_dialect: 'Erode Tamil',
        profile_photo_url: '',
      });
    }
  }, [editingNarrator, isAddNarratorOpen]);

  if (!isAddNarratorOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name_tamil.trim() && !form.full_name_english.trim()) {
      setError(uiLanguage === 'ta' ? 'தமிழ் அல்லது ஆங்கிலத்தில் பெயர் உள்ளிடவும்.' : 'Please provide name in Tamil or English.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingNarrator) {
        await updateNarrator(editingNarrator.id, form);
        showToast(uiLanguage === 'ta' ? 'நினைவாளர் விவரங்கள் புதுப்பிக்கப்பட்டன.' : 'Narrator details updated.');
      } else {
        const created = await createNarrator({
          ...form,
          created_by: user?.id,
        });
        setActiveNarrator(created);
        showToast(uiLanguage === 'ta' ? 'புதிய நினைவாளர் வெற்றிகரமாக சேர்க்கப்பட்டார்.' : 'New narrator added successfully.');
      }

      setIsAddNarratorOpen(false);
      setEditingNarrator(null);
      if (onSaved) onSaved();
      // Reload page state or list if on narrators list
      window.dispatchEvent(new CustomEvent('narrator_list_updated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save narrator');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{
          borderRadius: '32px',
          padding: '36px 40px',
          maxWidth: '720px',
          boxShadow: '0 24px 60px rgba(94, 86, 83, 0.15)',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <span className="badge-pill" style={{ marginBottom: '8px' }}>
              {editingNarrator ? (uiLanguage === 'ta' ? 'விவரங்களை மாற்று' : 'Edit Profile') : (uiLanguage === 'ta' ? 'புதிய பதிவு' : 'New Entry')}
            </span>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>
              {editingNarrator
                ? uiLanguage === 'ta'
                  ? 'நினைவாளர் விவரங்களைத் திருத்துக'
                  : 'Edit Narrator Details'
                : uiLanguage === 'ta'
                ? 'புதிய நினைவாளரைச் சேர்க்க'
                : 'Add a New Narrator'}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {uiLanguage === 'ta'
                ? 'யாருடைய வாழ்க்கை அனுபவங்களைப் பாதுகாக்க விரும்புகிறீர்களோ அவர்களின் அடிப்படை விவரங்கள்'
                : 'Basic profile information of the family member whose life story you are preserving'}
            </p>
          </div>

          <button
            onClick={() => {
              setIsAddNarratorOpen(false);
              setEditingNarrator(null);
            }}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#FAF9F8',
              border: '1px solid var(--border-subtle)',
              color: 'var(--slate-taupe-dark)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '12px 18px', background: 'var(--status-red-bg)', color: 'var(--status-red)', borderRadius: '16px', fontSize: '13px', marginBottom: '22px', fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '24px' }}>
            {/* Portrait Photo Upload (JPEG/JPG) */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
                {uiLanguage === 'ta' ? 'நினைவாளரின் புகைப்படம் (JPEG / JPG)' : 'Narrator Photo (JPEG / JPG)'}
                <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--slate-gray)', marginLeft: '6px' }}>
                  ({uiLanguage === 'ta' ? 'நேர்காணலுக்குப் பின் முகப்புப் பக்கத்தின் சிறப்புக் கதைகளில் காண்பிக்கப்படும்' : 'Appears on the homepage showcase with name'})
                </span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />

              {form.profile_photo_url ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '18px',
                    padding: '16px 20px',
                    background: '#FAF9F8',
                    border: '1.5px solid var(--border-subtle)',
                    borderRadius: '24px',
                  }}
                >
                  <img
                    src={form.profile_photo_url}
                    alt="Narrator preview"
                    style={{
                      width: '76px',
                      height: '76px',
                      borderRadius: '20px',
                      objectFit: 'cover',
                      boxShadow: '0 4px 14px rgba(47, 42, 40, 0.12)',
                      border: '2px solid #FFFFFF',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-green)', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
                      <CheckCircle2 size={16} />
                      <span>{uiLanguage === 'ta' ? 'புகைப்படம் இணைக்கப்பட்டது (JPEG / JPG)' : 'Portrait Photo Attached (JPEG / JPG)'}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                      {uiLanguage === 'ta'
                        ? 'இப்புகைப்படம் முகப்புப் பக்கத்தில் நினைவாளரின் கதையுடன் காண்பிக்கப்படும்.'
                        : 'This photo will appear with their name in the Inspiring Journeys showcase.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn-pill-outline"
                      style={{ padding: '6px 14px', fontSize: '12px' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera size={14} />
                      <span>{uiLanguage === 'ta' ? 'மாற்றுக' : 'Change'}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-pill-outline"
                      style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--status-red)', borderColor: 'var(--status-red)' }}
                      onClick={() => setForm((prev) => ({ ...prev, profile_photo_url: '' }))}
                      title="Remove Photo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: isDragging ? '2px dashed var(--accent-green)' : '2px dashed #D6CEC5',
                    background: isDragging ? 'rgba(140, 83, 56, 0.04)' : '#FAF9F8',
                    borderRadius: '24px',
                    padding: '24px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(140, 83, 56, 0.1)',
                      color: 'var(--accent-green)',
                      display: 'grid',
                      placeItems: 'center',
                      margin: '0 auto 12px',
                    }}
                  >
                    <Camera size={22} />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '4px' }}>
                    {uiLanguage === 'ta' ? 'புகைப்படத்தைப் பதிவேற்ற இங்கு கிளிக் செய்யவும் (JPEG / JPG)' : 'Click or Drag & Drop to insert photo (JPEG / JPG)'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {uiLanguage === 'ta'
                      ? 'நேர்காணலுக்குப் பின் முகப்புப் பக்கத்தின் சிறப்புக் கதைகள் பிரிவில் பெயருடன் காண்பிக்கப்படும்'
                      : 'After interview, this photo will appear in the showcase with their name & stories'}
                  </div>
                </div>
              )}
            </div>
            {/* Tamil Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
                {uiLanguage === 'ta' ? 'தமிழில் முழுப் பெயர்' : 'Full Name in Tamil'} *
              </label>
              <input
                type="text"
                name="full_name_tamil"
                value={form.full_name_tamil}
                onChange={handleChange}
                placeholder="எ.கா: சண்முகம் அல்லது லட்சுமி"
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '14px',
                  background: '#FAF9F8',
                  outline: 'none',
                }}
              />
            </div>

            {/* English Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
                {uiLanguage === 'ta' ? 'ஆங்கிலத்தில் முழுப் பெயர்' : 'Full Name in English'} *
              </label>
              <input
                type="text"
                name="full_name_english"
                value={form.full_name_english}
                onChange={handleChange}
                placeholder="e.g. Shanmugam or Lakshmi"
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '14px',
                  background: '#FAF9F8',
                  outline: 'none',
                }}
              />
            </div>

            {/* Preferred Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
                {uiLanguage === 'ta' ? 'அழைக்கும் பெயர் (Preferred Name)' : 'Preferred Name / Title'}
              </label>
              <input
                type="text"
                name="preferred_name"
                value={form.preferred_name}
                onChange={handleChange}
                placeholder="தாத்தா, பாட்டி, அப்பா, பெரியப்பா..."
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '14px',
                  background: '#FAF9F8',
                  outline: 'none',
                }}
              />
            </div>

            {/* Birth Year */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
                {uiLanguage === 'ta' ? 'பிறந்த ஆண்டு (Birth Year)' : 'Birth Year'}
              </label>
              <input
                type="number"
                name="birth_year"
                min="1800"
                max={new Date().getFullYear()}
                value={form.birth_year}
                onChange={handleChange}
                placeholder="1943"
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '14px',
                  background: '#FAF9F8',
                  outline: 'none',
                }}
              />
            </div>

            {/* Place of Birth */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
                {uiLanguage === 'ta' ? 'பிறந்த இடம் / சொந்த ஊர்' : 'Place of Birth / Hometown'}
              </label>
              <input
                type="text"
                name="place_of_birth"
                value={form.place_of_birth}
                onChange={handleChange}
                placeholder={uiLanguage === 'ta' ? 'எ.கா: மதுரை, தஞ்சாவூர், சென்னை...' : 'e.g. Madurai, Thanjavur...'}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '14px',
                  background: '#FAF9F8',
                  outline: 'none',
                }}
              />
            </div>

            {/* Preferred Language */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
                {uiLanguage === 'ta' ? 'விருப்பமான மொழி (Default Tamil)' : 'Preferred Language'}
              </label>
              <select
                name="preferred_language"
                value={form.preferred_language}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '14px',
                  background: '#FAF9F8',
                  outline: 'none',
                }}
              >
                <option value="ta">தமிழ் (Tamil - Recommended)</option>
                <option value="en">English</option>
                <option value="bilingual">தமிழ் & English (Bilingual)</option>
              </select>
            </div>

            {/* Tamil Dialect */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
                {uiLanguage === 'ta' ? 'தமிழ் வட்டார வழக்கு (Tamil Dialect)' : 'Tamil Dialect'}
              </label>
              <input
                type="text"
                name="tamil_dialect"
                value={form.tamil_dialect}
                onChange={handleChange}
                placeholder="எ.கா: கொங்குத் தமிழ் / ஈரோடு, மதுரைத் தமிழ், நெல்லைத் தமிழ், சென்னைத் தமிழ்..."
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '14px',
                  background: '#FAF9F8',
                  outline: 'none',
                }}
              />
            </div>

            {/* Optional Notes */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
                {uiLanguage === 'ta' ? 'கூடுதல் குறிப்புகள் (Optional Notes)' : 'Optional Background Notes'}
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  uiLanguage === 'ta'
                    ? 'குடும்ப பின்னணி, முக்கிய தொழில், அல்லது நேர்காணலுக்குத் தேவையான சிறப்புக் குறிப்புகள்...'
                    : 'Family background, occupation highlights, or notes for the interviewer...'
                }
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  borderRadius: '20px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '14px',
                  background: '#FAF9F8',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* Form Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '22px' }}>
            <button
              type="button"
              className="btn-pill-outline"
              onClick={() => {
                setIsAddNarratorOpen(false);
                setEditingNarrator(null);
              }}
            >
              {uiLanguage === 'ta' ? 'ரத்து செய்க' : 'Cancel'}
            </button>

            <button
              type="submit"
              className="btn-pill-primary"
              disabled={saving}
            >
              <Save size={16} />
              <span>{saving ? (uiLanguage === 'ta' ? 'சேமிக்கிறது...' : 'Saving...') : (uiLanguage === 'ta' ? 'நினைவாளரைச் சேமிக்க' : 'Save Narrator')}</span>
              <span
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '11px',
                }}
              >
                ↗
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
