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
    FaServer,
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
            const [metricsData, healthData, namespacesData] = await Promise.all([
                cacheService.getCacheMetrics(),
                cacheService.getCacheHealth(),
                cacheService.getCacheNamespaces(),
            ]);

            setMetrics(metricsData);
            setHealth(healthData);
            setNamespaces(namespacesData?.namespaces || []);
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
            `Are you sure you want to invalidate the cache for namespace: ${namespace}? This will clear all cached data for this namespace.`
        );
        setConfirmAction(() => () => {
            handleInvalidateCache(namespace);
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

    // Calculate total hits (memory + redis + fallback)
    const getTotalHits = () => {
        if (!metrics) return 0;
        return (metrics.memory_hits || 0) + (metrics.redis_hits || 0) + (metrics.fallback_hits || 0);
    };

    // Chart data for hit/miss distribution
    const hitMissChartData = metrics
        ? {
            labels: ['Hits', 'Misses'],
            datasets: [
                {
                    label: 'Cache Performance',
                    data: [getTotalHits(), metrics.misses || 0],
                    backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(239, 68, 68, 0.8)'],
                },
            ],
        }
        : null;

    // Chart data for tier distribution
    const tierChartData = metrics
        ? {
            labels: ['Memory', 'Redis', 'Fallback'],
            datasets: [
                {
                    label: 'Cache Tier Hits',
                    data: [
                        metrics.memory_hits || 0,
                        metrics.redis_hits || 0,
                        metrics.fallback_hits || 0,
                    ],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(168, 85, 247, 0.8)',
                        'rgba(251, 146, 60, 0.8)',
                    ],
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
                        {health.memory_cache && (
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                {health.memory_cache.available ? (
                                    <FaCheckCircle className="text-green-500" />
                                ) : (
                                    <FaTimesCircle className="text-red-500" />
                                )}
                                <div>
                                    <p className="text-sm text-gray-600">Memory Cache</p>
                                    <p className="text-lg font-semibold">
                                        {health.memory_cache.available ? 'Available' : 'Unavailable'}
                                    </p>
                                </div>
                            </div>
                        )}
                        {health.redis_cache && (
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                {health.redis_cache.available ? (
                                    <FaCheckCircle className="text-green-500" />
                                ) : (
                                    <FaTimesCircle className="text-red-500" />
                                )}
                                <div>
                                    <p className="text-sm text-gray-600">Redis Cache</p>
                                    <p className="text-lg font-semibold">
                                        {health.redis_cache.available ? 'Available' : 'Unavailable'}
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
                                    {(metrics.hit_rate * 100).toFixed(2)}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <span className="text-gray-600">Total Requests</span>
                                <span className="font-semibold">
                                    {metrics.total_requests || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <span className="text-gray-600">Total Hits</span>
                                <span className="font-semibold text-green-600">
                                    {getTotalHits()}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <span className="text-gray-600">Cache Misses</span>
                                <span className="font-semibold text-red-600">
                                    {metrics.misses || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <span className="text-gray-600">Evictions</span>
                                <span className="font-semibold">{metrics.evictions || 0}</span>
                            </div>
                            {metrics.average_access_time > 0 && (
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                    <span className="text-gray-600">Avg Access Time</span>
                                    <span className="font-semibold">
                                        {(metrics.average_access_time || 0).toFixed(3)}ms
                                    </span>
                                </div>
                            )}
                        </div>
                        {metrics.redis_stats && (
                            <div className="mt-4 p-3 bg-blue-50 rounded">
                                <p className="text-sm font-semibold text-blue-900 mb-2">Redis Statistics</p>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-blue-700">Total Keys:</span>
                                        <span className="font-medium">{metrics.redis_stats.total_keys || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-blue-700">Memory Used:</span>
                                        <span className="font-medium">{metrics.redis_stats.used_memory_human || '0B'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-blue-700">Peak Memory:</span>
                                        <span className="font-medium">{metrics.redis_stats.used_memory_peak_human || '0B'}</span>
                                    </div>
                                </div>
                            </div>
                        )}
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
                            {metrics.redis_stats && metrics.redis_stats.namespace_keys && (
                                <div className="mt-4 p-3 bg-gray-50 rounded">
                                    <p className="text-sm font-semibold text-gray-700 mb-2">Keys by Namespace</p>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        {Object.entries(metrics.redis_stats.namespace_keys).map(([ns, count]) => (
                                            <div key={ns} className="flex justify-between">
                                                <span className="text-gray-600 capitalize">{ns}:</span>
                                                <span className="font-medium">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    )}
                </div>
            )}

            {/* Cache Tier Performance */}
            {metrics && tierChartData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <h2 className="text-xl font-semibold mb-4">Cache Tier Performance</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                                <span className="text-gray-600">Memory Hits</span>
                                <span className="font-semibold text-blue-600">
                                    {metrics.memory_hits || 0} ({(metrics.memory_hit_rate * 100).toFixed(1)}%)
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                                <span className="text-gray-600">Redis Hits</span>
                                <span className="font-semibold text-purple-600">
                                    {metrics.redis_hits || 0} ({(metrics.redis_hit_rate * 100).toFixed(1)}%)
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                                <span className="text-gray-600">Fallback Hits</span>
                                <span className="font-semibold text-orange-600">
                                    {metrics.fallback_hits || 0} ({(metrics.fallback_hit_rate * 100).toFixed(1)}%)
                                </span>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h2 className="text-xl font-semibold mb-4">Tier Distribution</h2>
                        <div className="flex justify-center">
                            <div className="w-64 h-64">
                                <Doughnut
                                    data={tierChartData}
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
                </div>
            )}

            {/* Memory Utilization */}
            {metrics && (
                <Card>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <FaMemory />
                        Memory Utilization
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <FaServer className="text-blue-500" />
                            <div>
                                <p className="text-sm text-gray-600">Memory Cache Size</p>
                                <p className="text-lg font-semibold">
                                    {cacheService.formatMemorySize(metrics.memory_cache_size || 0)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <FaDatabase className="text-purple-500" />
                            <div>
                                <p className="text-sm text-gray-600">Max Memory Size</p>
                                <p className="text-lg font-semibold">
                                    {cacheService.formatMemorySize(metrics.max_memory_size || 0)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <FaChartPie className="text-green-500" />
                            <div>
                                <p className="text-sm text-gray-600">Utilization</p>
                                <p className="text-lg font-semibold">
                                    {(metrics.memory_utilization * 100).toFixed(1)}%
                                </p>
                            </div>
                        </div>
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
                                    <p className="text-sm text-gray-600">{namespace.description}</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                                        <div>
                                            <p className="text-xs text-gray-600">Default TTL</p>
                                            <p className="text-sm font-semibold">
                                                {namespace.default_ttl}s
                                            </p>
                                        </div>
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
