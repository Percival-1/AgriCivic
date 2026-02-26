import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    FaUsers,
    FaChartLine,
    FaDatabase,
    FaCog,
    FaExclamationTriangle,
    FaCheckCircle,
    FaServer,
    FaClipboardList
} from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';
import { adminService } from '../../api/services';
import Card from '../../components/common/Card';
import ErrorAlert from '../../components/common/ErrorAlert';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [statsData, activityData] = await Promise.all([
                adminService.getSystemStats(),
                adminService.getRecentActivity(10),
            ]);

            setStats(statsData);
            setRecentActivity(activityData);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError(err.response?.data?.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <ClipLoader color="#3B82F6" size={50} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <ErrorAlert message={error} onRetry={fetchDashboardData} />
            </div>
        );
    }

    const quickLinks = [
        {
            title: 'User Management',
            description: 'Manage users and permissions',
            icon: FaUsers,
            link: '/admin/users',
            color: 'bg-blue-500',
        },
        {
            title: 'System Monitoring',
            description: 'Monitor system health and performance',
            icon: FaChartLine,
            link: '/admin/monitoring',
            color: 'bg-green-500',
        },
        {
            title: 'Performance',
            description: 'View performance metrics',
            icon: FaServer,
            link: '/admin/performance',
            color: 'bg-purple-500',
        },
        {
            title: 'Cache Management',
            description: 'Manage application cache',
            icon: FaDatabase,
            link: '/admin/cache',
            color: 'bg-yellow-500',
        },
        {
            title: 'Portal Sync',
            description: 'Manage government portal synchronization',
            icon: FaCog,
            link: '/admin/portal-sync',
            color: 'bg-indigo-500',
        },
        {
            title: 'Knowledge Base',
            description: 'Manage RAG and knowledge base',
            icon: FaClipboardList,
            link: '/admin/knowledge-base',
            color: 'bg-pink-500',
        },
    ];

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
                <p className="text-gray-600">System overview and quick access to admin features</p>
            </div>

            {/* System Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm mb-1">Total Users</p>
                            <p className="text-3xl font-bold text-gray-800">
                                {stats?.totalUsers || 0}
                            </p>
                            <p className="text-green-500 text-sm mt-1">
                                +{stats?.newUsersToday || 0} today
                            </p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-full">
                            <FaUsers className="text-blue-500 text-2xl" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm mb-1">Active Sessions</p>
                            <p className="text-3xl font-bold text-gray-800">
                                {stats?.activeSessions || 0}
                            </p>
                            <p className="text-gray-500 text-sm mt-1">
                                {stats?.activeUsers || 0} users online
                            </p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-full">
                            <FaCheckCircle className="text-green-500 text-2xl" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm mb-1">System Health</p>
                            <p className="text-3xl font-bold text-gray-800">
                                {stats?.systemHealth || 'Good'}
                            </p>
                            <p className="text-gray-500 text-sm mt-1">
                                {stats?.uptime || '99.9%'} uptime
                            </p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-full">
                            <FaServer className="text-green-500 text-2xl" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm mb-1">Active Alerts</p>
                            <p className="text-3xl font-bold text-gray-800">
                                {stats?.activeAlerts || 0}
                            </p>
                            <p className="text-yellow-500 text-sm mt-1">
                                {stats?.criticalAlerts || 0} critical
                            </p>
                        </div>
                        <div className="bg-yellow-100 p-3 rounded-full">
                            <FaExclamationTriangle className="text-yellow-500 text-2xl" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Quick Links */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Links</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quickLinks.map((link, index) => (
                        <Link key={index} to={link.link}>
                            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                                <div className="flex items-start">
                                    <div className={`${link.color} p-3 rounded-lg mr-4`}>
                                        <link.icon className="text-white text-2xl" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                            {link.title}
                                        </h3>
                                        <p className="text-gray-600 text-sm">{link.description}</p>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent Activity */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Activity</h2>
                <Card className="p-6">
                    {recentActivity.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No recent activity</p>
                    ) : (
                        <div className="space-y-4">
                            {recentActivity.map((activity, index) => (
                                <div
                                    key={index}
                                    className="flex items-start pb-4 border-b border-gray-200 last:border-b-0 last:pb-0"
                                >
                                    <div className="flex-shrink-0 mr-4">
                                        <div className="bg-gray-100 p-2 rounded-full">
                                            <FaClipboardList className="text-gray-600" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-gray-800 font-medium">{activity.action}</p>
                                        <p className="text-gray-600 text-sm">{activity.description}</p>
                                        <p className="text-gray-400 text-xs mt-1">
                                            {activity.user} • {activity.timestamp}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
