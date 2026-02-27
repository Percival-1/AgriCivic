import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { FaTimes } from 'react-icons/fa';
import { toggleWelcomeMessage } from '../../store/slices/userSlice';
import { selectProfile } from '../../store/slices/userSlice';

/**
 * Welcome Card Component
 * Displays personalized welcome message
 * Requirement 20.1: Display dashboard with user-specific data
 */
export default function WelcomeCard({ user }) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const profile = useSelector(selectProfile);

    const handleClose = () => {
        dispatch(toggleWelcomeMessage());
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('dashboard.goodMorning');
        if (hour < 18) return t('dashboard.goodAfternoon');
        return t('dashboard.goodEvening');
    };

    // Use profile name first, then user name, then phone number, then generic greeting
    const userName = profile?.name || user?.name || user?.phone_number || t('common.welcome');

    return (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6 relative">
            <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
                aria-label="Close welcome message"
            >
                <FaTimes size={20} />
            </button>

            <h1 className="text-3xl font-bold mb-2">
                {getGreeting().replace('{{name}}', userName)}
            </h1>
            <p className="text-blue-100 text-lg">
                {t('dashboard.welcomeGreeting')}
            </p>
        </div>
    );
}
