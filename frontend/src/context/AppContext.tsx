import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type {
  ActiveScreen,
  Narrator,
  InterviewSession,
  SessionQuestion,
  Recording,
} from '../types';

interface AppContextType {
  currentScreen: ActiveScreen;
  setCurrentScreen: (screen: ActiveScreen) => void;
  activeNarrator: Narrator | null;
  setActiveNarrator: (narrator: Narrator | null) => void;
  activeSession: InterviewSession | null;
  setActiveSession: (session: InterviewSession | null) => void;
  activeQuestionIndex: number;
  setActiveQuestionIndex: (idx: number) => void;
  
  // Modals & Panels
  isAddNarratorOpen: boolean;
  setIsAddNarratorOpen: (open: boolean) => void;
  editingNarrator: Narrator | null;
  setEditingNarrator: (narrator: Narrator | null) => void;

  isTranscriptModalOpen: boolean;
  setIsTranscriptModalOpen: (open: boolean) => void;
  activeRecordingForReview: Recording | null;
  setActiveRecordingForReview: (rec: Recording | null) => void;

  isAIFollowUpModalOpen: boolean;
  setIsAIFollowUpModalOpen: (open: boolean) => void;
  activeFollowUpContext: { question: string; answer?: string; questionId?: string } | null;
  setActiveFollowUpContext: (ctx: { question: string; answer?: string; questionId?: string } | null) => void;

  // Language & Notification
  uiLanguage: 'ta' | 'en';
  setUiLanguage: (lang: 'ta' | 'en') => void;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;

  // Navigation shortcuts
  initialProfileTab: string;
  setInitialProfileTab: (tab: string) => void;
  goToNarratorProfile: (narrator: Narrator, initialTab?: string) => void;
  goToInterview: (session: InterviewSession) => void;
  goToNewInterview: (narrator?: Narrator) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('dashboard');
  const [activeNarrator, setActiveNarrator] = useState<Narrator | null>(null);
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);

  const [isAddNarratorOpen, setIsAddNarratorOpen] = useState(false);
  const [editingNarrator, setEditingNarrator] = useState<Narrator | null>(null);

  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
  const [activeRecordingForReview, setActiveRecordingForReview] = useState<Recording | null>(null);

  const [isAIFollowUpModalOpen, setIsAIFollowUpModalOpen] = useState(false);
  const [activeFollowUpContext, setActiveFollowUpContext] = useState<{
    question: string;
    answer?: string;
    questionId?: string;
  } | null>(null);

  const [uiLanguage, setUiLanguage] = useState<'ta' | 'en'>('ta');
  const [initialProfileTab, setInitialProfileTab] = useState<string>('overview');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const goToNarratorProfile = (narrator: Narrator, initialTab: string = 'overview') => {
    setActiveNarrator(narrator);
    setInitialProfileTab(initialTab);
    setCurrentScreen('narrator_profile');
  };

  const goToInterview = (session: InterviewSession) => {
    setActiveSession(session);
    setActiveQuestionIndex(0);
    setCurrentScreen('interview_question');
  };

  const goToNewInterview = (narrator?: Narrator) => {
    if (narrator) {
      setActiveNarrator(narrator);
    }
    setCurrentScreen('session_setup');
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        activeNarrator,
        setActiveNarrator,
        activeSession,
        setActiveSession,
        activeQuestionIndex,
        setActiveQuestionIndex,
        isAddNarratorOpen,
        setIsAddNarratorOpen,
        editingNarrator,
        setEditingNarrator,
        isTranscriptModalOpen,
        setIsTranscriptModalOpen,
        activeRecordingForReview,
        setActiveRecordingForReview,
        isAIFollowUpModalOpen,
        setIsAIFollowUpModalOpen,
        activeFollowUpContext,
        setActiveFollowUpContext,
        uiLanguage,
        setUiLanguage,
        toast,
        showToast,
        initialProfileTab,
        setInitialProfileTab,
        goToNarratorProfile,
        goToInterview,
        goToNewInterview,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
