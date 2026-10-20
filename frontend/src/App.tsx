import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import logoImg from './assets/logo.png';

// Screens
import { Screen1_Welcome } from './screens/Screen1_Welcome';
import { Screen2_Auth } from './screens/Screen2_Auth';
import { Screen3_Dashboard } from './screens/Screen3_Dashboard';
import { Screen4_NarratorList } from './screens/Screen4_NarratorList';
import { Screen5_AddEditNarratorModal } from './screens/Screen5_AddEditNarratorModal';
import { Screen6_NarratorProfile } from './screens/Screen6_NarratorProfile';
import { Screen7_SessionSetup } from './screens/Screen7_SessionSetup';
import { Screen8_InterviewQuestion } from './screens/Screen8_InterviewQuestion';
import { Screen9_RecordingStudio } from './screens/Screen9_RecordingStudio';
import { Screen10_TranscriptReviewModal } from './screens/Screen10_TranscriptReviewModal';
import { Screen11_AIFollowUpModal } from './screens/Screen11_AIFollowUpModal';
import { Screen12_MemoriesTimeline } from './screens/Screen12_MemoriesTimeline';
import { Screen13_LifeStoryBuilder } from './screens/Screen13_LifeStoryBuilder';
import { Screen14_RecordingLibrary } from './screens/Screen14_RecordingLibrary';
import { Screen15_ExportShare } from './screens/Screen15_ExportShare';
import { Screen_Settings } from './screens/Screen_Settings';
import { Screen_Help } from './screens/Screen_Help';

const AppContent: React.FC = () => {
  const { isLoading } = useAuth();
  const { currentScreen } = useApp();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--bg-app)',
          color: 'var(--slate-taupe-dark)',
          fontSize: '16px',
          fontWeight: 500,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <img
            src={logoImg}
            alt="NinaivuKalanjiyam"
            style={{
              margin: '0 auto 16px',
              width: '60px',
              height: '60px',
              borderRadius: '18px',
              objectFit: 'cover',
              boxShadow: '0 8px 24px rgba(47, 42, 40, 0.12)',
            }}
          />
          <p style={{ fontWeight: 800 }}>NINAIVU KALANJIYAM</p>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Loading family archive...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container no-sidebar">
      {/* Top Header Navbar across the entire app (Matching Screenshot) */}
      <Header />

      {/* Main Full-Width Content Container (Zero Left Sidebar) */}
      <main className="main-content-full">
        {currentScreen === 'dashboard' && <Screen3_Dashboard />}
        {currentScreen === 'welcome' && <Screen3_Dashboard />}
        {currentScreen === 'signin' && <Screen2_Auth />}
        {currentScreen === 'narrators' && <Screen4_NarratorList />}
        {currentScreen === 'narrator_profile' && <Screen6_NarratorProfile />}
        {currentScreen === 'session_setup' && <Screen7_SessionSetup />}
        {currentScreen === 'interview_question' && <Screen8_InterviewQuestion />}
        {currentScreen === 'recording_studio' && <Screen9_RecordingStudio />}
        {currentScreen === 'recordings' && <Screen14_RecordingLibrary />}
        {currentScreen === 'timeline' && <Screen12_MemoriesTimeline />}
        {currentScreen === 'story_builder' && <Screen13_LifeStoryBuilder />}
        {currentScreen === 'export' && <Screen15_ExportShare />}
        {currentScreen === 'settings' && <Screen_Settings />}
        {currentScreen === 'help' && <Screen_Help />}
      </main>

      {/* Global Interactive Modals */}
      <Screen5_AddEditNarratorModal />
      <Screen10_TranscriptReviewModal />
      <Screen11_AIFollowUpModal />

      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}