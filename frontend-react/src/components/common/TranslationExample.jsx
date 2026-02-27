import { useTranslation } from 'react-i18next';

/**
 * Translation Example Component
 * 
 * This component demonstrates how to use translations in React components.
 * Use this as a reference when adding translations to other components.
 * 
 * Basic usage:
 * 1. Import useTranslation hook from 'react-i18next'
 * 2. Call const { t } = useTranslation() in your component
 * 3. Use t('key.path') to translate strings
 * 4. Use t('key.path', { variable: value }) for interpolation
 */
export default function TranslationExample() {
    const { t } = useTranslation();

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold">{t('common.appName')}</h1>
            <p>{t('common.welcome')}</p>

            {/* With interpolation */}
            <p>{t('dashboard.welcomeMessage', { name: 'John' })}</p>

            {/* Button examples */}
            <button className="btn">{t('common.save')}</button>
            <button className="btn">{t('common.cancel')}</button>

            {/* Form examples */}
            <label>{t('auth.phoneNumber')}</label>
            <label>{t('auth.password')}</label>

            {/* Navigation examples */}
            <nav>
                <a href="/dashboard">{t('navigation.dashboard')}</a>
                <a href="/chat">{t('navigation.chat')}</a>
                <a href="/weather">{t('navigation.weather')}</a>
            </nav>

            {/* Error examples */}
            <div className="error">{t('errors.networkError')}</div>
            <div className="error">{t('validation.required')}</div>
        </div>
    );
}
