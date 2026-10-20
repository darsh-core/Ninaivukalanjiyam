import React from 'react';
import { HelpCircle, Mic, BookOpen, Clock, Heart, Shield, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Screen_Help: React.FC = () => {
  const { uiLanguage } = useApp();

  return (
    <div className="page-container" style={{ maxWidth: '860px' }}>
      <div style={{ marginBottom: '28px' }}>
        <span className="breadcrumb-tag">
          {uiLanguage === 'ta' ? 'உதவி மையம்' : 'Archivist Guide'}
        </span>
        <h1 style={{ fontSize: '28px', color: 'var(--slate-taupe-dark)', marginTop: '4px' }}>
          {uiLanguage === 'ta' ? 'வழிகாட்டி & உதவி (Help & Guide)' : 'Family Interviewer & Archive Guide'}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
          {uiLanguage === 'ta'
            ? 'பெரியவர்களிடம் கனிவாக உரையாடி வாய்மொழி வரலாற்றைப் பதிவு செய்வதற்கான சிறந்த வழிமுறைகள்'
            : 'Best practices for recording generational life stories with empathy, respect, and technical care'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Card 1: 5-step Workflow */}
        <div className="card">
          <h3 style={{ fontSize: '17px', color: 'var(--slate-taupe-dark)', marginBottom: '14px' }}>
            {uiLanguage === 'ta' ? 'ஆவணப்படுத்தலின் 5 எளிய நிலைகள்:' : 'The 5-Step Preservation Workflow:'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', lineHeight: 1.6 }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span className="chip chip-primary" style={{ height: '22px' }}>1</span>
              <div>
                <strong>Add Narrator (நினைவாளர் சேர்க்க):</strong> Create a profile with birth year, hometown, and dialect (e.g. Kongu, Madurai, Central).
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <span className="chip chip-primary" style={{ height: '22px' }}>2</span>
              <div>
                <strong>Interview Setup (நேர்காணல் அமைப்பு):</strong> Choose Structured, Intelligent AI, or Free Storytelling mode.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <span className="chip chip-primary" style={{ height: '22px' }}>3</span>
              <div>
                <strong>Record Answer (குரல் பதிவு கூடம்):</strong> Position the iPad/laptop 1–2 feet from the narrator in a quiet room and record. Retain version history if re-recording.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <span className="chip chip-primary" style={{ height: '22px' }}>4</span>
              <div>
                <strong>Transcript Review & Timeline (சரிபார்த்தல்):</strong> Edit speech-to-text mistakes and confirm extracted life events.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <span className="chip chip-primary" style={{ height: '22px' }}>5</span>
              <div>
                <strong>Life Story & Export (புத்தகம் & ஆவணம்):</strong> Generate chapter biography and download PDF / ZIP archive for family preservation.
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Interviewing Elders Advice */}
        <div className="card" style={{ background: '#FAF9F8' }}>
          <h3 style={{ fontSize: '17px', color: 'var(--slate-taupe-dark)', marginBottom: '12px' }}>
            {uiLanguage === 'ta' ? 'பெரியவர்களிடம் உரையாடும் போது நினைவில் கொள்ள வேண்டியவை:' : 'Empathy & Interview Etiquette with Elders:'}
          </h3>
          <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: 1.8, color: 'var(--slate-taupe-dark)' }}>
            <li>Make sessions comfortable and no longer than 30–45 minutes to prevent fatigue.</li>
            <li>Use the "Play Question" button so narrators can hear questions spoken naturally in Tamil.</li>
            <li>Embrace pauses and silence; elders often reflect deeply before recalling distant memories.</li>
            <li>Honor their dialect terms without enforcing rigid grammatical corrections.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
