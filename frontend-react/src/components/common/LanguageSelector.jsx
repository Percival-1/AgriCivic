import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../../i18n/languages';
import { FaGlobe } from 'react-icons/fa';

export default function LanguageSelector() {
    const { i18n } = useTranslation();

    const handleLanguageChange = (e) => {
        const newLanguage = e.target.value;
        i18n.changeLanguage(newLanguage);
    };

    return (
        <div className="flex items-center gap-2">
            <FaGlobe className="text-gray-600" />
            <select
                value={i18n.language}
                onChange={handleLanguageChange}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
                {LANGUAGES.map((language) => (
                    <option key={language.code} value={language.code}>
                        {language.nativeName}
                    </option>
                ))}
            </select>
        </div>
    );
}
