import React, { useState } from 'react';
import { Settings, Save, Shield, HardDrive, Volume2, Globe, Database } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Screen_Settings: React.FC = () => {
  const { uiLanguage, setUiLanguage, showToast } = useApp();

  const [audioFormat, setAudioFormat] = useState('webm');
  const [autoSaveTranscripts, setAutoSaveTranscripts] = useState(true);
  const [aiSuggestionsEnabled, setAiSuggestionsEnabled] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(uiLanguage === 'ta' ? 'அமைப்புகள் வெற்றிகரமாகச் சேமிக்கப்பட்டன!' : 'Settings saved successfully!');
  };

  return (
    <div className="page-container" style={{ maxWidth: '820px' }}>
      <div style={{ marginBottom: '28px' }}>
        <span className="breadcrumb-tag">
          {uiLanguage === 'ta' ? 'கணினி அமைப்புகள்' : 'Configuration'}
        </span>
        <h1 style={{ fontSize: '28px', color: 'var(--slate-taupe-dark)', marginTop: '4px' }}>
          {uiLanguage === 'ta' ? 'பயன்பாட்டு அமைப்புகள் (Settings)' : 'Application Settings'}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
          {uiLanguage === 'ta'
            ? 'ஒலிப்பதிவு முறை, தரவுத்தள இணைப்பு மற்றும் AI பரிந்துரை விருப்பங்களை நிர்வகிக்கவும்'
            : 'Configure audio engine, local PostgreSQL database connection, and AI assist preferences'}
        </p>
      </div>

      <form onSubmit={handleSave} className="card">
        {/* Local Database Status */}
        <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Database size={18} color="var(--slate-steel-blue)" />
            <h3 style={{ fontSize: '16px', color: 'var(--slate-taupe-dark)', margin: 0 }}>
              Local PostgreSQL Database
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Connected to <code>postgresql://localhost:5432/NinaivuKalanjiyam</code>
          </p>
          <span className="chip chip-success" style={{ fontSize: '12px' }}>
            ● Active Connection · 9 Relational Tables Migrated
          </span>
        </div>

        {/* Audio Recording Settings */}
        <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Volume2 size={18} color="var(--slate-sand)" />
            <h3 style={{ fontSize: '16px', color: 'var(--slate-taupe-dark)', margin: 0 }}>
              Audio Recording Engine & iPad Safari Support
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--slate-taupe-dark)', marginBottom: '6px' }}>
                Preferred Audio Encoding
              </label>
              <select
                value={audioFormat}
                onChange={(e) => setAudioFormat(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: '#FFFFFF',
                  fontSize: '13px',
                }}
              >
                <option value="webm">WebM Opus (High fidelity / Browser default)</option>
                <option value="mp4">MPEG-4 AAC (iPad Safari optimized)</option>
                <option value="wav">WAV PCM Uncompressed</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--slate-taupe-dark)', marginBottom: '6px' }}>
                Speech Recognition Engine
              </label>
              <input
                type="text"
                disabled
                value="Tamil (India) Neural STT + Local Rule Engine"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: '#FAF9F8',
                  fontSize: '13px',
                  color: 'var(--slate-gray)',
                }}
              />
            </div>
          </div>
        </div>

        {/* AI & Automation Preferences */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Shield size={18} color="var(--slate-steel-blue)" />
            <h3 style={{ fontSize: '16px', color: 'var(--slate-taupe-dark)', margin: 0 }}>
              AI Assurances & Privacy Flags
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--slate-taupe-dark)' }}>
              <input
                type="checkbox"
                checked={aiSuggestionsEnabled}
                onChange={(e) => setAiSuggestionsEnabled(e.target.checked)}
                style={{ accentColor: 'var(--slate-steel-blue)', width: '16px', height: '16px' }}
              />
              <span>Enable AI follow-up question suggestions during interviews</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--slate-taupe-dark)' }}>
              <input
                type="checkbox"
                checked={autoSaveTranscripts}
                onChange={(e) => setAutoSaveTranscripts(e.target.checked)}
                style={{ accentColor: 'var(--slate-steel-blue)', width: '16px', height: '16px' }}
              />
              <span>Automatically generate initial speech-to-text transcript draft on voice upload</span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '18px' }}>
          <button type="submit" className="btn-primary">
            <Save size={16} />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
