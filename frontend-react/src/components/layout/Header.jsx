import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { FaBell, FaUser, FaSignOutAlt, FaGlobe, FaBars, FaTimes } from 'react-icons/fa';
import { selectUser } from '../../store/slices/authSlice';
import { selectUnreadCount } from '../../store/slices/notificationSlice';
import { selectProfile } from '../../store/slices/userSlice';
import { useAuth } from '../../hooks/useAuth';
import { LANGUAGES } from '../../i18n/languages';

/**
 * Header Component
 * 
 * Main navigation header with:
 * - Logo and app title
 * - User menu with profile and logout
 * - Notification bell with badge
 * - Language selector
 * - Mobile menu toggle
 * 
 * Optimized with React.memo and useCallback to prevent unnecessary re-renders.
 * 
 * Requirements: 10.1, 11.1
 */
const Header = memo(function Header({ onMenuToggle, isMobileMenuOpen }) {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { t, i18n } = useTranslation();

    // Redux state
    const user = useSelector(selectUser);
    const profile = useSelector(selectProfile);
    const unreadCount = useSelector(selectUnreadCount);

    // Memoize display name to avoid recalculation
    const displayName = useMemo(
        () => profile?.name || user?.name || user?.phone_number || t('common.welcome'),
        [profile?.name, user?.name, user?.phone_number, t]
    );

    // Local state
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

    // Refs for click outside detection
    const userMenuRef = useRef(null);
    const languageMenuRef = useRef(null);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
            if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
                setIsLanguageMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Memoize event handlers with useCallback
    const handleLogout = useCallback(async () => {
        setIsUserMenuOpen(false);
        await logout();
    }, [logout]);

    const handleLanguageChange = useCallback((languageCode) => {
        i18n.changeLanguage(languageCode);
        setIsLanguageMenuOpen(false);
    }, [i18n]);

    const handleNotificationClick = useCallback(() => {
        navigate('/notifications');
    }, [navigate]);

    const handleProfileClick = useCallback(() => {
        setIsUserMenuOpen(false);
        navigate('/profile');
    }, [navigate]);

    const toggleUserMenu = useCallback(() => {
        setIsUserMenuOpen(prev => !prev);
    }, []);

    const toggleLanguageMenu = useCallback(() => {
        setIsLanguageMenuOpen(prev => !prev);
    }, []);

    // Memoize current language display name
    const getCurrentLanguage = useCallback(() => {
        const lang = LANGUAGES.find((l) => l.code === i18n.language);
        return lang ? lang.nativeName : 'English';
    }, [i18n.language]);

    const currentLanguage = useMemo(() => getCurrentLanguage(), [getCurrentLanguage]);

    return (
        <header className="bg-white shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Left: Logo and Title */}
                    <div className="flex items-center">
                        {/* Mobile menu toggle */}
                        <button
                            onClick={onMenuToggle}
                            className="lg:hidden mr-3 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? (
                                <FaTimes className="h-6 w-6" />
                            ) : (
                                <FaBars className="h-6 w-6" />
                            )}
                        </button>

                        {/* Logo and Title */}
                        <Link to="/dashboard" className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-10 w-10 bg-green-600 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-xl">A</span>
                                </div>
                            </div>
                            <div className="ml-3 hidden sm:block">
                                <h1 className="text-xl font-bold text-gray-900">
                                    {t('common.appName')}
                                </h1>
                                <p className="text-xs text-gray-500">Empowering Farmers</p>
                            </div>
                        </Link>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        {/* Language Selector */}
                        <div className="relative" ref={languageMenuRef}>
                            <button
                                onClick={toggleLanguageMenu}
                                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                                aria-label="Select language"
                            >
                                <FaGlobe className="h-5 w-5" />
                                <span className="hidden sm:inline text-sm font-medium">
                                    {currentLanguage}
                                </span>
                            </button>

                            {/* Language Dropdown */}
                            {isLanguageMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                                    <div className="px-4 py-2 text-xs text-gray-500 font-semibold uppercase">
                                        {t('profile.language')}
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {LANGUAGES.map((lang) => (
                                            <button
                                                key={lang.code}
                                                onClick={() => handleLanguageChange(lang.code)}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${i18n.language === lang.code
                                                    ? 'bg-green-50 text-green-700 font-medium'
                                                    : 'text-gray-700'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span>{lang.nativeName}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {lang.name}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Notification Bell */}
                        <button
                            onClick={handleNotificationClick}
                            className="relative p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                            aria-label="Notifications"
                        >
                            <FaBell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* User Menu */}
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={toggleUserMenu}
                                className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                                aria-label="User menu"
                            >
                                <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center">
                                    <FaUser className="h-4 w-4 text-white" />
                                </div>
                                <span className="hidden md:inline text-sm font-medium">
                                    {displayName}
                                </span>
                            </button>

                            {/* User Dropdown */}
                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                                    {user && (
                                        <div className="px-4 py-2 border-b border-gray-200">
                                            <p className="text-sm font-medium text-gray-900">
                                                {displayName}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {profile?.location || user.phone_number}
                                            </p>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleProfileClick}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                    >
                                        <FaUser className="h-4 w-4" />
                                        <span>{t('profile.profile')}</span>
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                                    >
                                        <FaSignOutAlt className="h-4 w-4" />
                                        <span>{t('auth.logout')}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
});

export default Header;
