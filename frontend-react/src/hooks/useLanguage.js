import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { LANGUAGES, DEFAULT_LANGUAGE } from '../i18n/languages';

export const useLanguage = () => {
    const { i18n, t } = useTranslation();

    const changeLanguage = useCallback(
        (languageCode) => {
            i18n.changeLanguage(languageCode);
        },
        [i18n]
    );

    const getCurrentLanguage = useCallback(() => {
        return i18n.language || DEFAULT_LANGUAGE;
    }, [i18n.language]);

    const getAvailableLanguages = useCallback(() => {
        return LANGUAGES;
    }, []);

    return {
        currentLanguage: getCurrentLanguage(),
        changeLanguage,
        availableLanguages: getAvailableLanguages(),
        t,
    };
};
