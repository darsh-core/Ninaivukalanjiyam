import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import logoImg from '../assets/logo.png';

export const Screen2_Auth: React.FC = () => {
  const { login, register } = useAuth();
  const { setCurrentScreen, showToast, uiLanguage } = useApp();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState(() => localStorage.getItem('nk_last_email') || '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name');
        }
        await register(fullName, email, password);
        localStorage.setItem('nk_last_email', email.trim());
        showToast(
          uiLanguage === 'ta'
            ? 'கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது!'
            : 'Assistant account created successfully!'
        );
      } else {
        await login(email, password);
        localStorage.setItem('nk_last_email', email.trim());
        showToast(
          uiLanguage === 'ta'
            ? 'அங்கீகரிக்கப்பட்ட உள்நுழைவு வெற்றிகரமானது!'
            : 'Signed in successfully to family archive!'
        );
      }
      setCurrentScreen('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
      }}
    >
      <div
        className="modern-card"
        style={{
          maxWidth: '500px',
          width: '100%',
          background: '#FFFFFF',
          borderRadius: '32px',
          padding: '44px 40px',
          boxShadow: '0 20px 48px rgba(94, 86, 83, 0.08)',
          border: '1px solid var(--border-card)',
        }}
      >
        {/* Top Header Row with Arrow Button and Centered Logo */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 40px',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          {/* Simple arrow back button */}
          <button
            type="button"
            onClick={() => setCurrentScreen('dashboard')}
            title={uiLanguage === 'ta' ? 'பின்செல்ல' : 'Back'}
            aria-label={uiLanguage === 'ta' ? 'பின்செல்ல' : 'Back'}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '1px solid var(--border-card, #E5E0D8)',
              background: '#FFFFFF',
              color: 'var(--slate-taupe-dark, #2F2A28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(47, 42, 40, 0.05)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.borderColor = 'var(--terracotta, #D9532F)';
              e.currentTarget.style.color = 'var(--terracotta, #D9532F)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.borderColor = 'var(--border-card, #E5E0D8)';
              e.currentTarget.style.color = 'var(--slate-taupe-dark, #2F2A28)';
            }}
          >
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>

          {/* Logo centered on the exact same horizontal level as the arrow button */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              src={logoImg}
              alt="NinaivuKalanjiyam Logo"
              style={{
                width: '68px',
                height: '68px',
                objectFit: 'cover',
                borderRadius: '20px',
                display: 'block',
                boxShadow: '0 8px 24px rgba(47, 42, 40, 0.12)',
                border: '2px solid #FFFFFF',
              }}
            />
          </div>

          {/* Symmetrical empty spacer */}
          <div style={{ width: '40px' }} aria-hidden="true" />
        </div>

        {/* Branding title & badge */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span className="badge-pill" style={{ marginBottom: '10px' }}>
            {isRegister
              ? uiLanguage === 'ta'
                ? 'உதவியாளர் பதிவு'
                : 'Assistant Registration'
              : uiLanguage === 'ta'
              ? 'குடும்பக் காப்பக அணுகல்'
              : 'Family Archive Access'}
          </span>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
            {isRegister
              ? uiLanguage === 'ta'
                ? 'உதவியாளர் கணக்கு உருவாக்குக'
                : 'Create Assistant Account'
              : uiLanguage === 'ta'
              ? 'அங்கீகரிக்கப்பட்ட உள்நுழைவு'
              : 'Sign In to Archive'}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {uiLanguage === 'ta'
              ? 'தனியார் குடும்ப நினைவுக் களஞ்சிய அணுகல்'
              : 'Authorized family members & interview assistants'}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '16px',
              background: 'var(--status-red-bg)',
              color: 'var(--status-red)',
              fontSize: '13px',
              marginBottom: '22px',
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isRegister && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--slate-taupe-dark)',
                  marginBottom: '8px',
                }}
              >
                {uiLanguage === 'ta' ? 'முழு பெயர்' : 'Full Name'}
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={17}
                  style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--slate-gray)' }}
                />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="அன்பரசன் / Anbarasan"
                  style={{
                    width: '100%',
                    padding: '13px 18px 13px 44px',
                    borderRadius: '9999px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '14px',
                    outline: 'none',
                    background: '#FAF9F8',
                    transition: 'all 0.2s',
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--slate-taupe-dark)',
                marginBottom: '8px',
              }}
            >
              {uiLanguage === 'ta' ? 'மின்னஞ்சல் முகவரி' : 'Email Address'}
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={17}
                style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--slate-gray)' }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="darshinibalu25@gmail.com / name@example.com"
                style={{
                  width: '100%',
                  padding: '13px 18px 13px 44px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#FAF9F8',
                  transition: 'all 0.2s',
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--slate-taupe-dark)',
                }}
              >
                {uiLanguage === 'ta' ? 'கடவுச்சொல்' : 'Password'}
              </label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() =>
                    showToast(
                      uiLanguage === 'ta'
                        ? 'கடவுச்சொல் மீட்டெடுப்பு வழிமுறை குடும்ப நிர்வாகிக்கு அனுப்பப்பட்டது.'
                        : 'Password reset link sent to registered archive email.',
                      'info'
                    )
                  }
                  style={{ fontSize: '12px', color: 'var(--slate-sand)', fontWeight: 600 }}
                >
                  {uiLanguage === 'ta' ? 'கடவுச்சொல் மறந்ததா?' : 'Forgot Password?'}
                </button>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <Lock
                size={17}
                style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--slate-gray)' }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '13px 44px 13px 44px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#FAF9F8',
                  transition: 'all 0.2s',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '14px',
                  color: 'var(--slate-gray)',
                  padding: '2px',
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-pill-primary"
            disabled={loading}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '14px 24px',
              fontSize: '15px',
              marginTop: '10px',
            }}
          >
            <span>
              {loading
                ? uiLanguage === 'ta'
                  ? 'சரிபார்க்கிறது...'
                  : 'Verifying...'
                : isRegister
                ? uiLanguage === 'ta'
                  ? 'கணக்கு உருவாக்குக'
                  : 'Create Account'
                : uiLanguage === 'ta'
                ? 'உள்நுழைக'
                : 'Sign In to Archive'}
            </span>
            <span
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'grid',
                placeItems: 'center',
                fontSize: '12px',
              }}
            >
              ↗
            </span>
          </button>
        </form>

        {/* Toggle between Sign In and Register */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            style={{ fontSize: '13px', color: 'var(--slate-taupe-dark)', fontWeight: 600 }}
          >
            {isRegister
              ? uiLanguage === 'ta'
                ? 'ஏற்கனவே கணக்கு உள்ளதா? உள்நுழையவும்'
                : 'Already have an account? Sign In'
              : uiLanguage === 'ta'
              ? 'புதிய உதவியாளர் கணக்கு தொடங்க வேண்டுமா?'
              : "Don't have an account? Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
};
