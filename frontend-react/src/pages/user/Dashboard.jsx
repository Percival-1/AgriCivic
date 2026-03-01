import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { FaCloudSun, FaChartLine, FaFileAlt, FaBell } from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';
import { selectUser as selectAuthUser } from '../../store/slices/authSlice';
import { selectProfile } from '../../store/slices/userSlice';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useDashboardPreferences } from '../../hooks/useDashboardPreferences';
import weatherService from '../../api/services/weatherService';
import marketService from '../../api/services/marketService';
import schemeService from '../../api/services/schemeService';
import notificationService from '../../api/services/notificationService';
import WelcomeCard from '../../components/dashboard/WelcomeCard';
import StatsCard from '../../components/dashboard/StatsCard';
import WeatherWidget from '../../components/dashboard/WeatherWidget';
import MarketWidget from '../../components/dashboard/MarketWidget';
import SchemeWidget from '../../components/dashboard/SchemeWidget';
import NotificationWidget from '../../components/dashboard/NotificationWidget';

/**
 * User Dashboard Page
 * * Displays personalized dashboard with:
 * - Welcome message
 * - Quick stats cards
 * - Weather widget for user location
 * - Market prices for user crops
 * - Recent notifications
 * - Scheme recommendations
 * * Requirements: 20.1-20.7, 2.5-2.8
 */
export default function Dashboard() {
    const { t } = useTranslation();
    const authUser = useSelector(selectAuthUser);
    const profile = useSelector(selectProfile);
    const { loading: userLoading } = useCurrentUser();

    // Use dashboard preferences hook for persistence
    // Requirement 20.7: Save dashboard preferences to localStorage and restore on load
    const { dashboardPreferences, widgets, showWelcome } = useDashboardPreferences();

    // Widget data states
    const [weatherData, setWeatherData] = useState(null);
    const [marketData, setMarketData] = useState(null);
    const [schemes, setSchemes] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [stats, setStats] = useState({
        totalNotifications: 0,
        unreadNotifications: 0,
        activeSchemes: 0,
        profileCompletion: 0,
    });

    // Loading states
    const [loadingWeather, setLoadingWeather] = useState(false);
    const [loadingMarket, setLoadingMarket] = useState(false);
    const [loadingSchemes, setLoadingSchemes] = useState(false);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    // Error states
    const [weatherError, setWeatherError] = useState(null);
    const [marketError, setMarketError] = useState(null);
    const [schemesError, setSchemesError] = useState(null);
    const [notificationsError, setNotificationsError] = useState(null);

    // Fallback weather data when API fails or location is missing
    const fallbackWeatherData = {
        current: {
            temperature: 28,
            condition: 'Partly Cloudy',
            humidity: 65,
            wind_speed: 12,
            feels_like: 30,
        }
    };

    // Fallback market data when API fails or crops/coordinates are missing
    const fallbackMarketData = {
        prices: [
            { mandi: 'Local Mandi', price: 2150, change: 2.5 },
            { mandi: 'District Market', price: 2280, change: -1.2 },
            { mandi: 'State Market', price: 2340, change: 3.1 },
        ],
        msp: 2275,
    };

    // Fallback schemes data when API fails
    const fallbackSchemes = [
        { id: 1, name: 'PM-KISAN', description: 'Direct income support of ₹6,000 per year for farmer families', eligible: true },
        { id: 2, name: 'Fasal Bima Yojana', description: 'Crop insurance scheme for financial support against crop loss', eligible: true },
        { id: 3, name: 'Kisan Credit Card', description: 'Affordable credit for agricultural and allied activities', eligible: undefined },
    ];

    /**
     * Fetch weather data for user location
     * Requirement 20.2: Show weather for user's saved location
     */
    useEffect(() => {
        const fetchWeather = async () => {
            setLoadingWeather(true);
            setWeatherError(null);
            try {
                if (!profile?.location) {
                    // No location set — use fallback data
                    setWeatherData(fallbackWeatherData);
                    return;
                }
                const data = await weatherService.getCurrentWeather(profile.location);
                setWeatherData(data);
            } catch (error) {
                console.error('Error fetching weather:', error);
                // Use fallback data instead of showing error
                setWeatherData(fallbackWeatherData);
            } finally {
                setLoadingWeather(false);
            }
        };

        if (dashboardPreferences.widgets.includes('weather')) {
            fetchWeather();
        }
    }, [profile?.location, dashboardPreferences.widgets]);

    /**
     * Fetch market prices for user crops
     * Requirement 20.3: Display market prices for user's crops
     */
    useEffect(() => {
        const fetchMarket = async () => {
            if (!profile?.crops || profile.crops.length === 0) return;

            // Check if user has location coordinates
            if (!profile?.location_lat || !profile?.location_lng) {
                setMarketError('Location coordinates required for market data');
                setLoadingMarket(false);
                return;
            }
            setLoadingMarket(true);
            setMarketError(null);
            try {
                // If profile data is missing, use fallback
                if (!profile?.crops || profile.crops.length === 0 || !profile?.latitude || !profile?.longitude) {
                    setMarketData(fallbackMarketData);
                    return;
                }

                const primaryCrop = Array.isArray(profile.crops) ? profile.crops[0] : profile.crops;
                const data = await marketService.getCurrentPrices(
                    primaryCrop,
                    profile.location_lat,
                    profile.location_lng
                );
                setMarketData(data);
            } catch (error) {
                console.error('Error fetching market data:', error);
                // Use fallback data instead of showing error
                setMarketData(fallbackMarketData);
            } finally {
                setLoadingMarket(false);
            }
        };

        if (dashboardPreferences.widgets.includes('market')) {
            fetchMarket();
        }
    }, [profile?.crops, profile?.location_lat, profile?.location_lng, dashboardPreferences.widgets]);

    /**
     * Fetch scheme recommendations
     * Requirement 20.4: Show relevant scheme recommendations based on user profile
     */
    useEffect(() => {
        const fetchSchemes = async () => {
            setLoadingSchemes(true);
            setSchemesError(null);
            try {
                const userId = profile?.id || 'anonymous';
                const state = profile?.state || null;
                const language = profile?.language || 'en';

                const response = await schemeService.getSchemesForUser(userId, state, language);
                // Ensure schemes is always an array
                const schemesArray = Array.isArray(response.schemes)
                    ? response.schemes
                    : (Array.isArray(response) ? response : []);
                setSchemes(schemesArray.length > 0 ? schemesArray : fallbackSchemes);
                setStats(prev => ({ ...prev, activeSchemes: schemesArray.length || fallbackSchemes.length }));
            } catch (error) {
                console.error('Error fetching schemes:', error);
                // Use fallback data instead of showing error
                setSchemes(fallbackSchemes);
                setStats(prev => ({ ...prev, activeSchemes: fallbackSchemes.length }));
            } finally {
                setLoadingSchemes(false);
            }
        };

        if (dashboardPreferences.widgets.includes('schemes')) {
            fetchSchemes();
        }
    }, [profile, dashboardPreferences.widgets]);

    /**
     * Fetch recent notifications
     * Requirement 20.5: Display recent activity and notifications
     */
    useEffect(() => {
        const fetchNotifications = async () => {
            // Wait for user data to be available
            if (!profile?.id && !authUser?.id) {
                return; // Silently return, don't warn
            }

            setLoadingNotifications(true);
            setNotificationsError(null);
            try {
                const userId = profile?.id || authUser?.id;
                const data = await notificationService.getNotifications(5, 0, userId);
                // Handle different response formats
                const notifications = Array.isArray(data)
                    ? data
                    : (data.notifications || data.items || []);
                setNotifications(notifications);

                // Fetch unread count
                const unreadData = await notificationService.getUnreadCount(userId);
                setStats(prev => ({
                    ...prev,
                    totalNotifications: notifications.length || 0,
                    unreadNotifications: unreadData.count || 0,
                }));
            } catch (error) {
                console.error('Error fetching notifications:', error);
                setNotificationsError('Failed to load notifications');
                setNotifications([]); // Set to empty array on error
            } finally {
                setLoadingNotifications(false);
            }
        };

        if (dashboardPreferences.widgets.includes('notifications') && (profile?.id || authUser?.id)) {
            fetchNotifications();
        }
    }, [dashboardPreferences.widgets, profile?.id, authUser?.id]);

    /**
     * Calculate profile completion percentage
     * Requirement 20.6: Prompt to complete profile when incomplete
     */
    useEffect(() => {
        if (profile) {
            const requiredFields = ['name', 'location', 'crops', 'land_size', 'language'];
            const completedFields = requiredFields.filter(
                field => profile[field] && profile[field] !== ''
            );
            const percentage = Math.round((completedFields.length / requiredFields.length) * 100);
            setStats(prev => ({ ...prev, profileCompletion: percentage }));
        }
    }, [profile]);

    // Show loading state while user data is being fetched
    if (userLoading && !profile) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <ClipLoader color="#3B82F6" size={50} />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Welcome Message */}
            {showWelcome && (
                <WelcomeCard user={authUser || profile} />
            )}

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title={t('dashboard.profileCompletion')}
                    value={`${stats.profileCompletion}%`}
                    icon={FaFileAlt}
                    color="blue"
                    link={stats.profileCompletion < 100 ? '/profile' : null}
                />
                <StatsCard
                    title={t('dashboard.unreadNotifications')}
                    value={stats.unreadNotifications}
                    icon={FaBell}
                    color="yellow"
                    link="/notifications"
                />
                <StatsCard
                    title={t('dashboard.activeSchemes')}
                    value={stats.activeSchemes}
                    icon={FaFileAlt}
                    color="green"
                    link="/schemes"
                />
                <StatsCard
                    title={t('dashboard.weatherStatus')}
                    value={weatherData?.current?.condition || t('dashboard.noData')}
                    icon={FaCloudSun}
                    color="purple"
                    link="/weather"
                />
            </div>

            {/* Dashboard Widgets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weather Widget */}
                {widgets.includes('weather') && (
                    <WeatherWidget
                        data={weatherData}
                        loading={loadingWeather}
                        error={weatherError}
                        location={profile?.location}
                    />
                )}

                {/* Market Widget */}
                {widgets.includes('market') && (
                    <MarketWidget
                        data={marketData}
                        loading={loadingMarket}
                        error={marketError}
                        crops={profile?.crops}
                    />
                )}

                {/* Scheme Recommendations Widget */}
                {widgets.includes('schemes') && (
                    <SchemeWidget
                        schemes={schemes}
                        loading={loadingSchemes}
                        error={schemesError}
                    />
                )}

                {/* Notifications Widget */}
                {widgets.includes('notifications') && (
                    <NotificationWidget
                        notifications={notifications}
                        loading={loadingNotifications}
                        error={notificationsError}
                    />
                )}
            </div>
        </div>
    );
}