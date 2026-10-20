import React from 'react';
import {
  LayoutDashboard,
  Users,
  Mic,
  Headphones,
  Clock,
  BookOpen,
  Download,
  Settings,
  HelpCircle,
  PlusCircle,
  LogOut,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { ActiveScreen } from '../types';

export const Sidebar: React.FC = () => {
  const { currentScreen, setCurrentScreen, setIsAddNarratorOpen, uiLanguage } = useApp();
  const { user, logout } = useAuth();

  const mainNavItems: Array<{ id: ActiveScreen; labelTa: string; labelEn: string; icon: React.ReactNode }> = [
    {
      id: 'dashboard',
      labelTa: 'முகப்பு பலகை',
      labelEn: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
    },
    {
      id: 'narrators',
      labelTa: 'நினைவாளர்கள்',
      labelEn: 'Narrators',
      icon: <Users size={18} />,
    },
    {
      id: 'session_setup',
      labelTa: 'நேர்காணல்கள்',
      labelEn: 'Interviews',
      icon: <Mic size={18} />,
    },
    {
      id: 'recordings',
      labelTa: 'பதிவுகள் நூலகம்',
      labelEn: 'Recordings',
      icon: <Headphones size={18} />,
    },
    {
      id: 'timeline',
      labelTa: 'நினைவுகள் & காலவரிசை',
      labelEn: 'Memories & Timeline',
      icon: <Clock size={18} />,
    },
    {
      id: 'story_builder',
      labelTa: 'வாழ்க்கை வரலாறு',
      labelEn: 'Life Story Builder',
      icon: <BookOpen size={18} />,
    },
    {
      id: 'export',
      labelTa: 'ஏற்றுமதி & ஆவணம்',
      labelEn: 'Export & Archive',
      icon: <Download size={18} />,
    },
  ];

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-symbol">
          நி
        </div>
        <div className="brand-text">
          <h1>NinaivuKalanjiyam</h1>
          <p>நினைவுக் களஞ்சியம் · Archive</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">
          {uiLanguage === 'ta' ? 'முதன்மைப் பிரிவுகள்' : 'Archive Navigation'}
        </div>

        {mainNavItems.map((item) => {
          const isActive =
            currentScreen === item.id ||
            (item.id === 'narrators' && currentScreen === 'narrator_profile') ||
            (item.id === 'session_setup' &&
              (currentScreen === 'interview_question' || currentScreen === 'recording_studio'));

          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentScreen(item.id)}
            >
              {item.icon}
              <span>{uiLanguage === 'ta' ? item.labelTa : item.labelEn}</span>
            </button>
          );
        })}

        {/* Quick action button inside nav */}
        <div style={{ marginTop: '16px', padding: '0 4px' }}>
          <button
            className="btn-pill-primary"
            style={{ width: '100%', justifyContent: 'center', fontSize: '12.5px', padding: '11px 16px' }}
            onClick={() => setIsAddNarratorOpen(true)}
          >
            <PlusCircle size={15} />
            <span>{uiLanguage === 'ta' ? '+ நினைவாளர் சேர்க்க' : '+ Add Narrator'}</span>
          </button>
        </div>

        {/* Preferences Section */}
        <div style={{ marginTop: 'auto' }}>
          <div className="nav-section-title">
            {uiLanguage === 'ta' ? 'உதவி & அமைப்புகள்' : 'Preferences'}
          </div>

          <button
            className={`nav-item ${currentScreen === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('settings')}
          >
            <Settings size={18} />
            <span>{uiLanguage === 'ta' ? 'அமைப்புகள்' : 'Settings'}</span>
          </button>

          <button
            className={`nav-item ${currentScreen === 'help' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('help')}
          >
            <HelpCircle size={18} />
            <span>{uiLanguage === 'ta' ? 'வழிகாட்டி & உதவி' : 'Help & Guide'}</span>
          </button>
        </div>
      </nav>

      {/* Sidebar Footer with current user and logout */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--slate-taupe-dark)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 800,
              }}
            >
              {user?.fullName?.charAt(0) || 'A'}
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>
                {user?.fullName?.split(' ')[0] || 'Archivist'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {user?.role === 'admin' ? 'Family Admin' : 'Family Assistant'}
              </div>
            </div>
          </div>

          <button
            title="Sign Out"
            style={{ color: 'var(--text-muted)', padding: '6px' }}
            onClick={() => {
              logout();
              setCurrentScreen('welcome');
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
