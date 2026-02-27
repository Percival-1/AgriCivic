import { useState, useEffect } from 'react';
import { FaRobot, FaChartLine, FaShieldAlt, FaHeartbeat, FaSyncAlt } from 'react-icons/fa';
import { Bar, Doughnut } from 'react-chartjs-2';
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
import llmService from '../../api/services/llmService';
import Loader from '../../components/common/Loader';
import ErrorAlert from '../../components/common/ErrorAlert';

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

export default function LLMManagement() {
    const [metrics, setMetrics] = useState(null);
    const [providerUsage, setProviderUsage] = useState(null);
    const [health, setHealth] = useState(null);
    const [circuitBreakers, setCircuitBreakers] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [metricsData, providersData, healthData] = await Promise.all([
                llmService.getLLMMetrics(),
                llmService.getProviderUsage(),
                llmService.getLLMHealth(),
            ]);

            setMetrics(metricsData);

            // Transform provider usage data
            const providerUsageData = {
                providers: Object.entries(providersData.provider_usage || {}).map(([name, requests]) => ({
                    name,
                    requests,
                    tokens: 0, // Backend doesn't provide per-provider token data
                    avg_response_time: 0,
                    error_rate: 0,
                })),
            };
            setProviderUsage(providerUsageData);

            setHealth(healthData);

            // Get circuit breakers from metrics
            const breakersData = await llmService.getCircuitBreakerStatus();
            setCircuitBreakers(breakersData);
        } catch (err) {
            setError(err.message || 'Failed to fetch LLM data');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchAllData();
        setRefreshing(false);
    };

    const handleResetMetrics = async () => {
        if (!window.confirm('Are you sure you want to reset LLM metrics?')) {
            return;
        }

        try {
            await llmService.resetMetrics();
            await fetchAllData();
            alert('Metrics reset successfully');
        } catch (err) {
            alert('Failed to reset metrics: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader />
            </div>
        );
    }

    if (error) {
        return <ErrorAlert message={error} onRetry={fetchAllData} />;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <FaRobot className="text-blue-600" />
                        LLM Service Management
                    </h1>
                    <p className="text-gray-600 mt-1">Monitor and manage LLM service metrics</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <FaSyncAlt className={refreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button
                        onClick={handleResetMetrics}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                    >
                        Reset Metrics
                    </button>
                </div>
            </div>

            {/* Metrics Overview */}
            {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <MetricCard
                        title="Total Requests"
                        value={metrics.total_requests || 0}
                        icon={<FaChartLine />}
                        color="blue"
                    />
                    <MetricCard
                        title="Total Tokens"
                        value={metrics.total_tokens_used || 0}
                        icon={<FaRobot />}
                        color="green"
                    />
                    <MetricCard
                        title="Avg Response Time"
                        value={`${(metrics.average_response_time || 0).toFixed(2)}s`}
                        icon={<FaHeartbeat />}
                        color="purple"
                    />
                    <MetricCard
                        title="Success Rate"
                        value={`${((metrics.success_rate || 0) * 100).toFixed(2)}%`}
                        icon={<FaShieldAlt />}
                        color="green"
                    />
                </div>
            )}

            {/* Provider Usage Statistics */}
            {providerUsage && providerUsage.providers && providerUsage.providers.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <FaChartLine className="text-blue-600" />
                        Provider Usage Statistics
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Provider Usage Bar Chart */}
                        <div>
                            <h3 className="text-lg font-medium mb-3">Requests by Provider</h3>
                            <Bar
                                data={{
                                    labels: providerUsage.providers.map((p) => p.name),
                                    datasets: [
                                        {
                                            label: 'Requests',
                                            data: providerUsage.providers.map((p) => p.requests),
                                            backgroundColor: 'rgba(59, 130, 246, 0.5)',
                                            borderColor: 'rgba(59, 130, 246, 1)',
                                            borderWidth: 1,
                                        },
                                    ],
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: true,
                                    plugins: {
                                        legend: {
                                            display: false,
                                        },
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                        },
                                    },
                                }}
                            />
                        </div>

                        {/* Provider Distribution Doughnut Chart */}
                        <div>
                            <h3 className="text-lg font-medium mb-3">Request Distribution</h3>
                            <Doughnut
                                data={{
                                    labels: providerUsage.providers.map((p) => p.name),
                                    datasets: [
                                        {
                                            label: 'Requests',
                                            data: providerUsage.providers.map((p) => p.requests),
                                            backgroundColor: [
                                                'rgba(59, 130, 246, 0.5)',
                                                'rgba(16, 185, 129, 0.5)',
                                                'rgba(245, 158, 11, 0.5)',
                                                'rgba(239, 68, 68, 0.5)',
                                                'rgba(139, 92, 246, 0.5)',
                                            ],
                                            borderColor: [
                                                'rgba(59, 130, 246, 1)',
                                                'rgba(16, 185, 129, 1)',
                                                'rgba(245, 158, 11, 1)',
                                                'rgba(239, 68, 68, 1)',
                                                'rgba(139, 92, 246, 1)',
                                            ],
                                            borderWidth: 1,
                                        },
                                    ],
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: true,
                                    plugins: {
                                        legend: {
                                            position: 'bottom',
                                        },
                                    },
                                }}
                            />
                        </div>
                    </div>

                    {/* Provider Details Table */}
                    <div className="mt-6">
                        <h3 className="text-lg font-medium mb-3">Provider Details</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Provider
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Requests
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {providerUsage.providers.map((provider, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {provider.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {provider.requests || 0}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Circuit Breaker Status */}
            {circuitBreakers && circuitBreakers.breakers && circuitBreakers.breakers.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <FaShieldAlt className="text-orange-600" />
                        Circuit Breaker Status
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {circuitBreakers.breakers.map((breaker, index) => (
                            <div
                                key={index}
                                className={`p-4 rounded-lg border-2 ${breaker.state === 'closed'
                                    ? 'border-green-500 bg-green-50'
                                    : breaker.state === 'open'
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-yellow-500 bg-yellow-50'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-gray-800">{breaker.provider}</h3>
                                    <span
                                        className={`px-2 py-1 text-xs font-semibold rounded ${breaker.state === 'closed'
                                            ? 'bg-green-200 text-green-800'
                                            : breaker.state === 'open'
                                                ? 'bg-red-200 text-red-800'
                                                : 'bg-yellow-200 text-yellow-800'
                                            }`}
                                    >
                                        {breaker.state?.toUpperCase()}
                                    </span>
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                    <p>Failures: {breaker.failure_count || 0}</p>
                                    <p>Success: {breaker.success_count || 0}</p>
                                    {breaker.last_failure_time && (
                                        <p className="text-xs">
                                            Last Failure: {new Date(breaker.last_failure_time).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Health Check Results */}
            {health && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <FaHeartbeat className="text-green-600" />
                        Health Check Results
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h3 className="font-semibold text-gray-800">Overall Status</h3>
                                <p className="text-sm text-gray-600">LLM service health status</p>
                            </div>
                            <span
                                className={`px-4 py-2 rounded-full font-semibold ${health.status === 'healthy'
                                    ? 'bg-green-200 text-green-800'
                                    : health.status === 'degraded'
                                        ? 'bg-yellow-200 text-yellow-800'
                                        : 'bg-red-200 text-red-800'
                                    }`}
                            >
                                {health.status?.toUpperCase()}
                            </span>
                        </div>

                        {health.providers && Object.keys(health.providers).length > 0 && (
                            <div>
                                <h3 className="font-medium text-gray-800 mb-2">Provider Health</h3>
                                <div className="space-y-2">
                                    {Object.entries(health.providers).map(([name, providerHealth], index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded"
                                        >
                                            <div>
                                                <span className="text-gray-700 font-medium">{name}</span>
                                                {providerHealth.response_time && (
                                                    <span className="text-sm text-gray-500 ml-2">
                                                        ({providerHealth.response_time.toFixed(2)}s)
                                                    </span>
                                                )}
                                            </div>
                                            <span
                                                className={`px-3 py-1 text-sm rounded ${providerHealth.healthy
                                                    ? 'bg-green-200 text-green-800'
                                                    : 'bg-red-200 text-red-800'
                                                    }`}
                                            >
                                                {providerHealth.healthy ? 'Healthy' : 'Unhealthy'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ title, value, icon, color }) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600',
        red: 'bg-red-100 text-red-600',
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{title}</p>
                    <p className="text-2xl font-bold text-gray-800">{value}</p>
                </div>
                <div className={`p-3 rounded-full ${colorClasses[color]}`}>{icon}</div>
            </div>
        </div>
    );
}
