import React, { useState } from 'react';
import { User as UserIcon, Shield, Globe, ChevronDown, LogOut, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo.png';

export const Header: React.FC = () => {
  const {
    currentScreen,
    setCurrentScreen,
    activeNarrator,
    uiLanguage,
    setUiLanguage,
    goToNewInterview,
  } = useApp();

  const { isAuthenticated, user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const navItems = [
    {
      id: 'narrators' as const,
      labelEn: 'Narrators',
      labelTa: 'நினைவாளர்கள்',
      screen: 'narrators' as const,
      isActive: currentScreen === 'narrators' || currentScreen === 'narrator_profile',
    },
    {
      id: 'interviews' as const,
      labelEn: 'Interviews',
      labelTa: 'நேர்காணல்கள்',
      screen: 'session_setup' as const,
      isActive:
        currentScreen === 'session_setup' ||
        currentScreen === 'interview_question' ||
        currentScreen === 'recording_studio',
    },
    {
      id: 'recordings' as const,
      labelEn: 'Recordings',
      labelTa: 'ஒலிப்பதிவுகள்',
      screen: 'recordings' as const,
      isActive: currentScreen === 'recordings',
    },
    {
      id: 'timeline' as const,
      labelEn: 'Memories & Timeline',
      labelTa: 'நினைவுகள் & காலவரிசை',
      screen: 'timeline' as const,
      isActive: currentScreen === 'timeline',
    },
    {
      id: 'story_builder' as const,
      labelEn: 'LifeStory Builder',
      labelTa: 'வாழ்க்கை வரலாறு',
      screen: 'story_builder' as const,
      isActive: currentScreen === 'story_builder',
    },
    {
      id: 'export' as const,
      labelEn: 'Export & Archive',
      labelTa: 'ஏற்றுமதி & ஆவணம்',
      screen: 'export' as const,
      isActive: currentScreen === 'export',
    },
  ];

  return (
    <header className="hope-rise-header">
      {/* Brand Left (Matching Screenshot: 3-circle emblem + brand title) */}
      <div
        className="header-brand"
        onClick={() => {
          setCurrentScreen('dashboard');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        title="Go to Dashboard"
      >
        <img
          src={logoImg}
          alt="NinaivuKalanjiyam"
          style={{
            width: '40px',
            height: '40px',
            objectFit: 'cover',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(47, 42, 40, 0.1)',
            border: '1.5px solid var(--border-subtle)',
            flexShrink: 0,
          }}
        />
        <div className="brand-title-wrap">
          <span className="brand-name">NINAIVU KALANJIYAM</span>
          <span className="brand-sub">நினைவுக் களஞ்சியம்</span>
        </div>
      </div>

      {/* Center Nav Links (Matching screenshot uppercase font & spacing) */}
      <nav className="header-nav-center" aria-label="Main Navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setCurrentScreen(item.screen);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`nav-link-btn ${item.isActive ? 'active' : ''}`}
            title={`Open ${item.labelEn}`}
          >
            <span className="nav-text">
              {uiLanguage === 'ta' ? item.labelTa : item.labelEn}
            </span>
            {item.isActive && <span className="active-pill-dot" />}
          </button>
        ))}
      </nav>

      {/* Right Corner (Matching Screenshot: Circular icon + Pill button) */}
      <div className="header-actions-right">
        {/* Language switch toggle */}
        <div className="lang-switch-capsule" title="Toggle Language / மொழி">
          <button
            className={`lang-opt ${uiLanguage === 'ta' ? 'active' : ''}`}
            onClick={() => setUiLanguage('ta')}
          >
            தமிழ்
          </button>
          <button
            className={`lang-opt ${uiLanguage === 'en' ? 'active' : ''}`}
            onClick={() => setUiLanguage('en')}
          >
            EN
          </button>
        </div>

        {/* Circular Profile Icon Button (Screenshot circle phone style) */}
        <div style={{ position: 'relative' }}>
          <button
            className="circle-profile-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title={isAuthenticated ? (user?.fullName || 'Archivist Profile') : 'Sign in to continue'}
            aria-label="User Profile"
          >
            {isAuthenticated ? (
              <span className="profile-initials">
                {(user?.fullName || 'NK').substring(0, 2).toUpperCase()}
              </span>
            ) : (
              <UserIcon size={18} />
            )}
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="profile-dropdown-card">
              <div className="profile-menu-header">
                <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--slate-taupe-dark)' }}>
                  {isAuthenticated ? (user?.fullName || 'Family Archivist') : (uiLanguage === 'ta' ? 'குடும்ப ஆவணப் பயனர்' : 'Family Archive')}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {isAuthenticated ? user?.email : 'Sign in to access private recordings'}
                </div>
              </div>

              {activeNarrator && (
                <div className="profile-active-narrator">
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--slate-gray)' }}>
                    Active Narrator
                  </span>
                  <div style={{ fontWeight: 700, fontSize: '13px', marginTop: '3px' }}>
                    {activeNarrator.full_name_tamil || activeNarrator.full_name_english}
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setCurrentScreen('narrator_profile');
                    }}
                    style={{ fontSize: '11.5px', color: 'var(--accent-green)', fontWeight: 700, marginTop: '4px', textAlign: 'left' }}
                  >
                    View Full Profile →
                  </button>
                </div>
              )}

              <div className="profile-menu-actions">
                {isAuthenticated ? (
                  <button
                    className="profile-menu-item"
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                      setCurrentScreen('dashboard');
                    }}
                  >
                    <LogOut size={14} />
                    <span>{uiLanguage === 'ta' ? 'வெளியேறு' : 'Sign Out'}</span>
                  </button>
                ) : (
                  <button
                    className="profile-menu-item highlight"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setCurrentScreen('signin');
                    }}
                  >
                    <UserIcon size={14} />
                    <span>{uiLanguage === 'ta' ? 'உள்நுழைக' : 'Sign In to Continue'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pill Button (Matching Screenshot "DONATE" pill) */}
        {isAuthenticated ? (
          <button
            className="header-pill-btn"
            onClick={() => goToNewInterview()}
            title="Start a new interview session"
          >
            <span>{uiLanguage === 'ta' ? 'புதிய நேர்காணல்' : 'NEW INTERVIEW'}</span>
          </button>
        ) : (
          <button
            className="header-pill-btn"
            onClick={() => setCurrentScreen('signin')}
            title="Sign in to continue"
          >
            <span>{uiLanguage === 'ta' ? 'உள்நுழைக' : 'SIGN IN TO CONTINUE'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
