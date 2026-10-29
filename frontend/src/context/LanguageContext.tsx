import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import translations, { type AppLanguage, type TranslationShape } from '../i18n';

type TemplateParams = Record<string, string | number>;

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (next: AppLanguage) => void;
  toggleLanguage: () => void;
  strings: TranslationShape;
  format: (template: string, params?: TemplateParams) => string;
};

const DEFAULT_LANGUAGE: AppLanguage = 'th';
const STORAGE_KEY = 'clickortrick-lang';

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const readInitialLanguage = (): AppLanguage => {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'en' || stored === 'th' ? (stored as AppLanguage) : DEFAULT_LANGUAGE;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => readInitialLanguage());

  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next = prev === 'th' ? 'en' : 'th';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
      return next;
    });
  }, []);

  const format = useCallback((template: string, params?: TemplateParams) => {
    if (!params) return template;
    return template.replace(/{{(.*?)}}/g, (_, rawKey) => {
      const key = rawKey.trim();
      const value = params[key];
      return value === undefined || value === null ? '' : String(value);
    });
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      strings: translations[language],
      format,
    }),
    [language, setLanguage, toggleLanguage, format],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
