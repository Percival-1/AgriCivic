import { useState, useEffect } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import {
    FaDatabase,
    FaSync,
    FaTrash,
    FaCheckCircle,
    FaExclamationTriangle,
    FaTimesCircle,
    FaChartPie,
    FaMemory,
    FaClock,
} from 'react-icons/fa';
import Loader from '../../components/common/Loader';
import ErrorAlert from '../../components/common/ErrorAlert';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import cacheService from '../../api/services/cacheService';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

export default function CacheManagement() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // State for cache data
    const [metrics, setMetrics] = useState(null);
    const [health, setHealth] = useState(null);
    const [namespaces, setNamespaces] = useState([]);

    // Confirmation dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    // Fetch all cache data
    const fetchCacheData = async () => {
        try {
            setError(null);
            const [metricsData, healthData] = await Promise.all([
                cacheService.getCacheMetrics(),
                cacheService.getCacheHealth(),
            ]);

            setMetrics(metricsData);
            setHealth(healthData);

            // Extract namespaces from metrics if available
            if (metricsData?.namespaces) {
                setNamespaces(metricsData.namespaces);
            } else if (metricsData?.by_namespace) {
                // Convert by_namespace object to array
                const namespacesArray = Object.entries(metricsData.by_namespace).map(
                    ([name, data]) => ({
                        name,
                        ...data,
                    })
                );
                setNamespaces(namespacesArray);
            }
        } catch (err) {
            console.error('Error fetching cache data:', err);
            setError(err.message || 'Failed to fetch cache data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCacheData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchCacheData, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchCacheData();
    };

    const handleInvalidateCache = async (namespace) => {
        try {
            setError(null);
            setSuccess(null);
            await cacheService.invalidateCache(namespace);
            setSuccess(`Cache invalidated successfully for namespace: ${namespace}`);
            fetchCacheData();
        } catch (err) {
            setError(`Failed to invalidate cache: ${err.message}`);
        }
    };

    const handleInvalidateAllCache = async () => {
        try {
            setError(null);
            setSuccess(null);
            await cacheService.invalidateAllCache();
            setSuccess('All cache namespaces invalidated successfully');
            fetchCacheData();
        } catch (err) {
            setError(`Failed to invalidate all cache: ${err.message}`);
        }
    };

    const handleResetMetrics = async () => {
        try {
            setError(null);
            setSuccess(null);
            await cacheService.resetMetrics();
            setSuccess('Cache metrics reset successfully');
            fetchCacheData();
        } catch (err) {
            setError(`Failed to reset metrics: ${err.message}`);
        }
    };

    const confirmInvalidate = (namespace) => {
        setConfirmMessage(
            namespace === 'all'
                ? 'Are you sure you want to invalidate all cache namespaces? This will clear all cached data.'
                : `Are you sure you want to invalidate the cache for namespace: ${namespace}?`
        );
        setConfirmAction(() => () => {
            if (namespace === 'all') {
                handleInvalidateAllCache();
            } else {
                handleInvalidateCache(namespace);
            }
            setShowConfirmDialog(false);
        });
        setShowConfirmDialog(true);
    };

    const confirmResetMetrics = () => {
        setConfirmMessage(
            'Are you sure you want to reset cache metrics? This will clear all statistics.'
        );
        setConfirmAction(() => () => {
            handleResetMetrics();
            setShowConfirmDialog(false);
        });
        setShowConfirmDialog(true);
    };

    // Get status icon and color
    const getStatusIcon = (status) => {
        const statusLower = status?.toLowerCase();
        if (statusLower === 'healthy' || statusLower === 'ok') {
            return <FaCheckCircle className="text-green-500" />;
        } else if (statusLower === 'degraded' || statusLower === 'warning') {
            return <FaExclamationTriangle className="text-yellow-500" />;
        } else if (statusLower === 'unhealthy' || statusLower === 'error') {
            return <FaTimesCircle className="text-red-500" />;
        }
        return <FaCheckCircle className="text-gray-500" />;
    };

    // Calculate hit rate
    const calculateHitRate = (hits, misses) => {
        return cacheService.calculateHitRate(hits || 0, misses || 0);
    };

    // Chart data for hit/miss distribution
    const hitMissChartData = metrics
        ? {
            labels: ['Hits', 'Misses'],
            datasets: [
                {
                    label: 'Cache Performance',
                    data: [metrics.hits || 0, metrics.misses || 0],
                    backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(239, 68, 68, 0.8)'],
                },
            ],
        }
        : null;

    // Chart data for namespace performance
    const namespaceChartData =
        namespaces.length > 0
            ? {
                labels: namespaces.map((ns) => ns.name),
                datasets: [
                    {
                        label: 'Hits',
                        data: namespaces.map((ns) => ns.hits || 0),
                        backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    },
                    {
                        label: 'Misses',
                        data: namespaces.map((ns) => ns.misses || 0),
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    },
                ],
            }
            : null;

    if (loading) {
        return <Loader fullScreen text="Loading cache data..." />;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Cache Management</h1>
                    <p className="text-gray-600 mt-1">
                        Monitor and manage application cache performance
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        variant="secondary"
                        className="flex items-center gap-2"
                    >
                        <FaSync className={refreshing ? 'animate-spin' : ''} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => confirmInvalidate('all')}
                        variant="danger"
                        className="flex items-center gap-2"
                    >
                        <FaTrash />
                        Clear All Cache
                    </Button>
                </div>
            </div>

            {error && <ErrorAlert message={error} onClose={() => setError(null)} />}
            {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 flex items-center gap-2">
                        <FaCheckCircle />
                        {success}
                    </p>
                </div>
            )}

            {/* Cache Health Status */}
            <Card>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FaDatabase />
                    Cache Health Status
                </h2>
                {health ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            {getStatusIcon(health.status)}
                            <div>
                                <p className="text-sm text-gray-600">Status</p>
                                <p className="text-lg font-semibold capitalize">
                                    {health.status || 'Unknown'}
                                </p>
                            </div>
                        </div>
                        {health.connected !== undefined && (
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                {health.connected ? (
                                    <FaCheckCircle className="text-green-500" />
                                ) : (
                                    <FaTimesCircle className="text-red-500" />
                                )}
                                <div>
                                    <p className="text-sm text-gray-600">Connection</p>
                                    <p className="text-lg font-semibold">
                                        {health.connected ? 'Connected' : 'Disconnected'}
                                    </p>
                                </div>
                            </div>
                        )}
                        {health.memory_usage && (
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                <FaMemory className="text-purple-500" />
                                <div>
                                    <p className="text-sm text-gray-600">Memory Usage</p>
                                    <p className="text-lg font-semibold">
                                        {cacheService.formatMemorySize(health.memory_usage)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <Loader text="Loading health status..." />
                )}
            </Card>

            {/* Cache Metrics Overview */}
            {metrics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Overall Metrics */}
                    <Card>
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <FaChartPie />
                            Overall Cache Performance
                        </h2>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <span className="text-gray-600">Hit Rate</span>
                                <span className="font-semibold text-green-600">
                                    {calculateHitRate(metrics.hits, metrics.misses)}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <span className="text-gray-600">Total Requests</span>
                                <span className="font-semibold">
                                    {(metrics.hits || 0) + (metrics.misses || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <span className="text-gray-600">Cache Hits</span>
                                <span className="font-semibold text-green-600">
                                    {metrics.hits || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <span className="text-gray-600">Cache Misses</span>
                                <span className="font-semibold text-red-600">
                                    {metrics.misses || 0}
                                </span>
                            </div>
                            {metrics.evictions !== undefined && (
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                    <span className="text-gray-600">Evictions</span>
                                    <span className="font-semibold">{metrics.evictions}</span>
                                </div>
                            )}
                        </div>
                        <div className="mt-4">
                            <Button
                                onClick={confirmResetMetrics}
                                variant="secondary"
                                size="sm"
                                className="w-full"
                            >
                                Reset Metrics
                            </Button>
                        </div>
                    </Card>

                    {/* Hit/Miss Distribution Chart */}
                    {hitMissChartData && (
                        <Card>
                            <h2 className="text-xl font-semibold mb-4">Hit/Miss Distribution</h2>
                            <div className="flex justify-center">
                                <div className="w-64 h-64">
                                    <Doughnut
                                        data={hitMissChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: true,
                                            plugins: {
                                                legend: { position: 'bottom' },
                                            },
                                        }}
                                    />
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* Namespace Performance Chart */}
            {namespaceChartData && (
                <Card>
                    <h2 className="text-xl font-semibold mb-4">Performance by Namespace</h2>
                    <div className="h-80">
                        <Bar
                            data={namespaceChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'top' },
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                    },
                                },
                            }}
                        />
                    </div>
                </Card>
            )}

            {/* Cache Namespaces */}
            <Card>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FaClock />
                    Cache Namespaces
                </h2>
                {namespaces.length > 0 ? (
                    <div className="space-y-2">
                        {namespaces.map((namespace) => (
                            <div
                                key={namespace.name}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex-1">
                                    <p className="font-medium text-lg">{namespace.name}</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                                        <div>
                                            <p className="text-xs text-gray-600">Hit Rate</p>
                                            <p className="text-sm font-semibold text-green-600">
                                                {calculateHitRate(namespace.hits, namespace.misses)}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">Hits</p>
                                            <p className="text-sm font-semibold">
                                                {namespace.hits || 0}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">Misses</p>
                                            <p className="text-sm font-semibold">
                                                {namespace.misses || 0}
                                            </p>
                                        </div>
                                        {namespace.ttl && (
                                            <div>
                                                <p className="text-xs text-gray-600">TTL</p>
                                                <p className="text-sm font-semibold">
                                                    {namespace.ttl}s
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    onClick={() => confirmInvalidate(namespace.name)}
                                    variant="danger"
                                    size="sm"
                                    className="ml-4"
                                >
                                    <FaTrash />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <FaDatabase className="text-gray-400 text-4xl mx-auto mb-2" />
                        <p className="text-gray-600">No cache namespaces found</p>
                    </div>
                )}
            </Card>

            {/* Confirm Dialog */}
            {showConfirmDialog && (
                <ConfirmDialog
                    title="Confirm Action"
                    message={confirmMessage}
                    onConfirm={confirmAction}
                    onCancel={() => setShowConfirmDialog(false)}
                />
            )}
        </div>
    );
}
