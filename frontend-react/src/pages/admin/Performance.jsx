import { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import {
    FaTachometerAlt,
    FaSync,
    FaClock,
    FaDatabase,
    FaExclamationTriangle,
    FaChartLine,
    FaTrash,
} from 'react-icons/fa';
import Loader from '../../components/common/Loader';
import ErrorAlert from '../../components/common/ErrorAlert';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import performanceService from '../../api/services/performanceService';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function Performance() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // State for performance data
    const [performanceMetrics, setPerformanceMetrics] = useState(null);
    const [slowRequests, setSlowRequests] = useState(null);
    const [slowQueries, setSlowQueries] = useState(null);
    const [timeSeriesData, setTimeSeriesData] = useState(null);
    const [queryPerformance, setQueryPerformance] = useState(null);
    const [endpointPerformance, setEndpointPerformance] = useState(null);

    // Filters
    const [slowRequestThreshold, setSlowRequestThreshold] = useState(1000);
    const [slowQueryThreshold, setSlowQueryThreshold] = useState(500);
    const [timeSeriesMetric, setTimeSeriesMetric] = useState('response_time');
    const [timeWindow, setTimeWindow] = useState(3600);

    // Fetch performance data
    const fetchPerformanceData = async () => {
        try {
            setError(null);
            const [metrics, requests, queries, timeSeries] = await Promise.all([
                performanceService.getPerformanceMetrics(),
                performanceService.getSlowRequests(slowRequestThreshold, 100),
                performanceService.getSlowQueries(slowQueryThreshold, 100),
                performanceService.getTimeSeriesMetrics(
                    timeSeriesMetric,
                    timeWindow,
                    60
                ),
            ]);

            setPerformanceMetrics(metrics);
            setSlowRequests(requests);
            setSlowQueries(queries);
            setTimeSeriesData(timeSeries);

            // Extract query performance from metrics
            if (metrics && metrics.database) {
                setQueryPerformance(metrics.database);
            }

            // Extract endpoint performance from metrics
            if (metrics && metrics.endpoints) {
                setEndpointPerformance({
                    endpoints: Object.entries(metrics.endpoints).map(([path, data]) => ({
                        endpoint: path,
                        ...data
                    }))
                });
            }
        } catch (err) {
            console.error('Error fetching performance data:', err);
            setError(err.message || 'Failed to fetch performance data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPerformanceData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchPerformanceData, 30000);
        return () => clearInterval(interval);
    }, [slowRequestThreshold, slowQueryThreshold, timeSeriesMetric, timeWindow]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchPerformanceData();
    };

    const handleClearOldMetrics = async () => {
        if (!confirm('Are you sure you want to clear old performance metrics?')) {
            return;
        }
        try {
            await performanceService.clearOldMetrics(86400); // Clear metrics older than 24 hours
            fetchPerformanceData();
        } catch (err) {
            setError(`Failed to clear old metrics: ${err.message}`);
        }
    };

    // Prepare time series chart data
    const timeSeriesChartData = timeSeriesData?.time_series
        ? {
            labels: timeSeriesData.time_series.map((point) => {
                // Backend sends timestamps without timezone, treat as UTC and convert to IST
                const utcDate = new Date(point.timestamp + 'Z');
                return utcDate.toLocaleTimeString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }),
            datasets: [
                {
                    label: 'Requests',
                    data: timeSeriesData.time_series.map((point) => point.requests || 0),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                },
            ],
        }
        : null;

    // Prepare endpoint performance chart data
    const endpointChartData = endpointPerformance?.endpoints && endpointPerformance.endpoints.length > 0
        ? {
            labels: endpointPerformance.endpoints
                .slice(0, 10)
                .map((ep) => (ep.endpoint || ep.path || '').substring(0, 30)),
            datasets: [
                {
                    label: 'Avg Response Time',
                    data: endpointPerformance.endpoints
                        .slice(0, 10)
                        .map((ep) => {
                            // Parse response time string like "0.0050s" to number
                            const timeStr = ep.avg_response_time || ep.average_response_time || '0s';
                            const timeValue = parseFloat(timeStr.replace('s', ''));
                            return timeValue;
                        }),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                },
            ],
        }
        : null;

    if (loading) {
        return <Loader fullScreen text="Loading performance data..." />;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Performance Monitoring</h1>
                    <p className="text-gray-600 mt-1">
                        Application performance metrics and slow query analysis
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleClearOldMetrics}
                        variant="secondary"
                        className="flex items-center gap-2"
                    >
                        <FaTrash />
                        Clear Old Metrics
                    </Button>
                    <Button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2"
                    >
                        <FaSync className={refreshing ? 'animate-spin' : ''} />
                        Refresh
                    </Button>
                </div>
            </div>

            {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

            {/* Performance Metrics Overview */}
            {performanceMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <div className="flex items-center gap-3">
                            <FaTachometerAlt className="text-blue-500 text-2xl" />
                            <div>
                                <p className="text-sm text-gray-600">Avg Response Time</p>
                                <p className="text-2xl font-bold">
                                    {performanceMetrics.response_times?.average || '0ms'}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-3">
                            <FaChartLine className="text-green-500 text-2xl" />
                            <div>
                                <p className="text-sm text-gray-600">Total Requests</p>
                                <p className="text-2xl font-bold">
                                    {performanceMetrics.total_requests || 0}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-3">
                            <FaClock className="text-yellow-500 text-2xl" />
                            <div>
                                <p className="text-sm text-gray-600">P95 Response Time</p>
                                <p className="text-2xl font-bold">
                                    {performanceMetrics.response_times?.p95 || '0ms'}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-3">
                            <FaExclamationTriangle className="text-red-500 text-2xl" />
                            <div>
                                <p className="text-sm text-gray-600">Error Rate</p>
                                <p className="text-2xl font-bold">
                                    {performanceMetrics.error_rate || '0.00%'}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Time Series Chart */}
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <FaChartLine />
                        Performance Trends
                    </h2>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label htmlFor="metric" className="text-sm text-gray-600">
                                Metric:
                            </label>
                            <select
                                id="metric"
                                value={timeSeriesMetric}
                                onChange={(e) => setTimeSeriesMetric(e.target.value)}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="response_time">Response Time</option>
                                <option value="throughput">Throughput</option>
                                <option value="error_rate">Error Rate</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="timeWindow" className="text-sm text-gray-600">
                                Window:
                            </label>
                            <select
                                id="timeWindow"
                                value={timeWindow}
                                onChange={(e) => setTimeWindow(parseInt(e.target.value, 10))}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={1800}>30 minutes</option>
                                <option value={3600}>1 hour</option>
                                <option value={7200}>2 hours</option>
                                <option value={21600}>6 hours</option>
                                <option value={86400}>24 hours</option>
                            </select>
                        </div>
                    </div>
                </div>
                {timeSeriesChartData ? (
                    <div className="h-80">
                        <Line
                            data={timeSeriesChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: true, position: 'top' },
                                    tooltip: { mode: 'index', intersect: false },
                                },
                                scales: {
                                    y: { beginAtZero: true },
                                },
                            }}
                        />
                    </div>
                ) : (
                    <Loader text="Loading time series data..." />
                )}
            </Card>

            {/* Endpoint Performance */}
            {endpointChartData && (
                <Card>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <FaTachometerAlt />
                        Top 10 Slowest Endpoints
                    </h2>
                    <div className="h-80">
                        <Bar
                            data={endpointChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false },
                                },
                                scales: {
                                    y: { beginAtZero: true, title: { display: true, text: 'seconds' } },
                                },
                            }}
                        />
                    </div>
                </Card>
            )}

            {/* Slow Requests Table */}
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <FaClock />
                        Slow Requests
                    </h2>
                    <div className="flex items-center gap-2">
                        <label htmlFor="requestThreshold" className="text-sm text-gray-600">
                            Threshold (ms):
                        </label>
                        <input
                            id="requestThreshold"
                            type="number"
                            value={slowRequestThreshold}
                            onChange={(e) => setSlowRequestThreshold(parseInt(e.target.value, 10))}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                {slowRequests && slowRequests.slow_requests && slowRequests.slow_requests.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Endpoint
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Method
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Response Time
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Timestamp
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {slowRequests.slow_requests.map((request, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {request.endpoint || request.path}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                                {request.method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span
                                                className={performanceService.getPerformanceColor(
                                                    request.response_time
                                                )}
                                            >
                                                {performanceService.formatDuration(
                                                    request.response_time
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-medium ${request.status_code >= 200 && request.status_code < 300
                                                    ? 'bg-green-100 text-green-800'
                                                    : request.status_code >= 400
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                {request.status_code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(request.timestamp + 'Z').toLocaleString('en-IN', {
                                                timeZone: 'Asia/Kolkata',
                                                dateStyle: 'short',
                                                timeStyle: 'medium'
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
                            Showing {slowRequests.slow_requests.length} slow requests above{' '}
                            {slowRequestThreshold}ms
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <FaTachometerAlt className="text-4xl mx-auto mb-2 text-green-500" />
                        <p>No slow requests found above {slowRequestThreshold}ms threshold</p>
                    </div>
                )}
            </Card>

            {/* Slow Queries Table */}
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <FaDatabase />
                        Slow Database Queries
                    </h2>
                    <div className="flex items-center gap-2">
                        <label htmlFor="queryThreshold" className="text-sm text-gray-600">
                            Threshold (ms):
                        </label>
                        <input
                            id="queryThreshold"
                            type="number"
                            value={slowQueryThreshold}
                            onChange={(e) => setSlowQueryThreshold(parseInt(e.target.value, 10))}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                {slowQueries && slowQueries.slow_queries && slowQueries.slow_queries.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Query
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Execution Time
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Timestamp
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {slowQueries.slow_queries.map((query, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                                {(query.query || query.query_text || '').substring(0, 100)}
                                                {(query.query || query.query_text || '').length > 100 ? '...' : ''}
                                            </code>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span
                                                className={performanceService.getPerformanceColor(
                                                    query.execution_time * 1000
                                                )}
                                            >
                                                {performanceService.formatDuration(
                                                    query.execution_time * 1000
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(query.timestamp + 'Z').toLocaleString('en-IN', {
                                                timeZone: 'Asia/Kolkata',
                                                dateStyle: 'short',
                                                timeStyle: 'medium'
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
                            Showing {slowQueries.slow_queries.length} slow queries above{' '}
                            {slowQueryThreshold}ms
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <FaDatabase className="text-4xl mx-auto mb-2 text-green-500" />
                        <p>No slow queries found above {slowQueryThreshold}ms threshold</p>
                    </div>
                )}
            </Card>

            {/* Database Query Performance Summary */}
            {queryPerformance && (
                <Card>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <FaDatabase />
                        Database Query Performance
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Total Queries</p>
                            <p className="text-2xl font-bold">
                                {queryPerformance.total_queries || 0}
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Avg Execution Time</p>
                            <p className="text-2xl font-bold">
                                {performanceService.formatDuration(
                                    queryPerformance.avg_execution_time || 0
                                )}
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Slow Query Count</p>
                            <p className="text-2xl font-bold text-red-600">
                                {queryPerformance.slow_query_count || 0}
                            </p>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
