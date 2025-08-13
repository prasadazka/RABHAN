import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Import translation resources
import arTranslations from '../locales/ar/common.json';
import enTranslations from '../locales/en/common.json';

const resources = {
  ar: {
    common: arTranslations,
  },
  en: {
    common: enTranslations,
  },
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar', // Default to Arabic
    debug: process.env.NODE_ENV === 'development',
    
    // Language detection options
    detection: {
      order: ['localStorage', 'sessionStorage', 'htmlTag', 'navigator'],
      caches: ['localStorage', 'sessionStorage'],
      lookupLocalStorage: 'rabhan_admin_language',
      lookupSessionStorage: 'rabhan_admin_language',
    },

    interpolation: {
      escapeValue: false, // React already escapes by default
    },

    // Namespace configuration
    defaultNS: 'common',
    ns: ['common'],

    // RTL support
    react: {
      useSuspense: false,
    },
  });

// RTL languages list
export const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

// Check if language is RTL
export const isRTL = (language: string): boolean => {
  return RTL_LANGUAGES.includes(language);
};

// Update document direction based on language
export const updateDocumentDirection = (language: string) => {
  const direction = isRTL(language) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', direction);
  document.documentElement.setAttribute('lang', language);
};

// Listen for language changes and update direction
i18n.on('languageChanged', (lng) => {
  updateDocumentDirection(lng);
});

export default i18n;