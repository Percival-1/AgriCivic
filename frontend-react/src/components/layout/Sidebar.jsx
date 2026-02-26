import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
    FaTachometerAlt,
    FaComments,
    FaLeaf,
    FaCloudSun,
    FaChartLine,
    FaFileAlt,
    FaBell,
    FaMicrophone,
    FaUser,
    FaUsers,
    FaChartBar,
    FaLanguage,
    FaSms,
    FaDatabase,
    FaSync,
    FaBook,
    FaRobot,
    FaMapMarkedAlt,
} from 'react-icons/fa';
import { selectUser } from '../../store/slices/authSlice';
import { selectProfile } from '../../store/slices/userSlice';

/**
 * Sidebar Component
 * 
 * Navigation sidebar with:
 * - Role-based menu items (user vs admin)
 * - Active route highlighting
 * - Collapsible on mobile
 * - Responsive design
 * 
 * Requirements: 4.3
 */
export default function Sidebar({ isOpen, onClose }) {
    const { t } = useTranslation();
    const user = useSelector(selectUser);
    const profile = useSelector(selectProfile);
    const isAdmin = user?.role === 'admin' || user?.is_admin;

    // Use profile name if available, otherwise fall back to user name
    const displayName = profile?.name || user?.name || t('common.welcome');

    // User navigation items
    const userNavItems = [
        {
            name: t('navigation.dashboard'),
            path: '/dashboard',
            icon: FaTachometerAlt,
        },
        {
            name: t('navigation.chat'),
            path: '/chat',
            icon: FaComments,
        },
        {
            name: t('navigation.diseaseDetection'),
            path: '/disease-detection',
            icon: FaLeaf,
        },
        {
            name: t('navigation.weather'),
            path: '/weather',
            icon: FaCloudSun,
        },
        {
            name: t('navigation.market'),
            path: '/market',
            icon: FaChartLine,
        },
        {
            name: t('navigation.schemes'),
            path: '/schemes',
            icon: FaFileAlt,
        },
        {
            name: t('navigation.notifications'),
            path: '/notifications',
            icon: FaBell,
        },
        {
            name: 'Speech Services',
            path: '/speech',
            icon: FaMicrophone,
        },
        {
            name: 'Maps & Location',
            path: '/maps',
            icon: FaMapMarkedAlt,
        },
        {
            name: t('profile.profile'),
            path: '/profile',
            icon: FaUser,
        },
    ];

    // Admin navigation items
    const adminNavItems = [
        {
            name: t('admin.adminDashboard'),
            path: '/admin/dashboard',
            icon: FaTachometerAlt,
        },
        {
            name: t('admin.userManagement'),
            path: '/admin/users',
            icon: FaUsers,
        },
        {
            name: t('admin.systemMonitoring'),
            path: '/admin/monitoring',
            icon: FaChartBar,
        },
        {
            name: t('admin.performance'),
            path: '/admin/performance',
            icon: FaChartLine,
        },
        {
            name: 'Translation Service',
            path: '/admin/translation',
            icon: FaLanguage,
        },
        {
            name: 'SMS Management',
            path: '/admin/sms',
            icon: FaSms,
        },
        {
            name: t('admin.cacheManagement'),
            path: '/admin/cache',
            icon: FaDatabase,
        },
        {
            name: t('admin.portalSync'),
            path: '/admin/portal-sync',
            icon: FaSync,
        },
        {
            name: t('admin.knowledgeBase'),
            path: '/admin/knowledge-base',
            icon: FaBook,
        },
        {
            name: t('admin.llmManagement'),
            path: '/admin/llm',
            icon: FaRobot,
        },
    ];

    // Select navigation items based on user role
    const navItems = isAdmin ? adminNavItems : userNavItems;

    // Handle mobile menu close on navigation
    const handleNavClick = () => {
        if (window.innerWidth < 1024) {
            onClose();
        }
    };

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed lg:static inset-y-0 left-0 z-50
                    w-64 bg-white shadow-lg
                    transform transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    flex flex-col
                `}
            >
                {/* Sidebar Header */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 lg:hidden">
                    <h2 className="text-lg font-semibold text-gray-900">{t('navigation.dashboard')}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        aria-label="Close menu"
                    >
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4">
                    <div className="px-3 space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={handleNavClick}
                                className={({ isActive }) =>
                                    `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive
                                        ? 'bg-green-100 text-green-900'
                                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon
                                            className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-green-600' : 'text-gray-500'
                                                }`}
                                        />
                                        <span>{item.name}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </nav>

                {/* Sidebar Footer */}
                <div className="border-t border-gray-200 p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-green-600 font-semibold text-sm">
                                    {isAdmin ? 'A' : 'U'}
                                </span>
                            </div>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                                {displayName}
                            </p>
                            <p className="text-xs text-gray-500">
                                {profile?.location || user?.phone_number || (isAdmin ? t('admin.admin') : t('common.welcome'))}
                            </p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
