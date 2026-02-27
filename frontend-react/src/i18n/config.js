import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import hiTranslations from './locales/hi.json';
import bnTranslations from './locales/bn.json';
import teTranslations from './locales/te.json';
import taTranslations from './locales/ta.json';
import mrTranslations from './locales/mr.json';
import guTranslations from './locales/gu.json';
import knTranslations from './locales/kn.json';
import mlTranslations from './locales/ml.json';
import paTranslations from './locales/pa.json';

const resources = {
    en: { translation: enTranslations },
    hi: { translation: hiTranslations },
    bn: { translation: bnTranslations },
    te: { translation: teTranslations },
    ta: { translation: taTranslations },
    mr: { translation: mrTranslations },
    gu: { translation: guTranslations },
    kn: { translation: knTranslations },
    ml: { translation: mlTranslations },
    pa: { translation: paTranslations },
};

const getInitialLanguage = () => {
    try {
        return localStorage.getItem('language') || 'en';
    } catch (error) {
        return 'en';
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        lng: getInitialLanguage(),
        debug: false,
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'language',
        },
        react: {
            useSuspense: false,
        },
    });

// Save language to localStorage on change
i18n.on('languageChanged', (lng) => {
    try {
        localStorage.setItem('language', lng);
    } catch (error) {
        console.error('Failed to save language to localStorage:', error);
    }
});

export default i18n;
