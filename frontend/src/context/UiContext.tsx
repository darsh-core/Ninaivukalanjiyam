import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type Lang = 'ta' | 'en';
export type ToastKind = 'success' | 'error' | 'info';

interface UiContextType {
  lang: Lang;
  setLang(l: Lang): void;
  tr(ta: string, en: string): string;
  showToast(msg: string, kind?: ToastKind): void;
  toast: { message: string; kind: ToastKind } | null;
}

const KEY = 'nk_ui_lang';

function readLang(): Lang {
  try {
    return localStorage.getItem(KEY) === 'en' ? 'en' : 'ta';
  } catch {
    return 'ta';
  }
}

const UiContext = createContext<UiContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function UiProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);
  const [toast, setToast] = useState<UiContextType['toast']>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const tr = useCallback((ta: string, en: string) => (lang === 'en' ? en : ta), [lang]);

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    setToast({ message, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const value = useMemo(() => ({ lang, setLang, tr, showToast, toast }), [lang, setLang, tr, showToast, toast]);
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUi(): UiContextType {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used within UiProvider');
  return ctx;
}
