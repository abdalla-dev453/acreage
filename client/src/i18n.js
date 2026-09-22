import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslation from './locales/en.json';
import swTranslation from './locales/sw.json';

const resources = {
  en: {
    translation: enTranslation
  },
  sw: {
    translation: swTranslation
  }
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources,
    fallbackLng: 'en', // Default language
    debug: false, // Set to true for development debugging
    
    interpolation: {
      escapeValue: false // React already escapes values
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'acreage_language'
    }
  });

// Export a function to manually change language
export const changeLanguage = (lng) => {
  i18n.changeLanguage(lng);
  localStorage.setItem('acreage_language', lng);
};

export default i18n;