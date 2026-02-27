import { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import {
    FaCheckCircle,
    FaExclamationTriangle,
    FaTimesCircle,
    FaServer,
    FaDatabase,
    FaExclamationCircle,
    FaSync,
    FaClock,
} from 'react-icons/fa';
import Loader from '../../components/common/Loader';
import ErrorAlert from '../../components/common/ErrorAlert';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import monitoringService from '../../api/services/monitoringService';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

export default function Monitoring() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // State for different monitoring data
    const [healthStatus, setHealthStatus] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [circuitBreakers, setCircuitBreakers] = useState(null);
    const [errorSummary, setErrorSummary] = useState(null);
    const [activeAlerts, setActiveAlerts] = useState(null);
    const [alertHistory, setAlertHistory] = useState(null);
    const [serviceMetrics, setServiceMetrics] = useState(null);

    // Alert history filters
    const [showAlertHistory, setShowAlertHistory] = useState(false);
    const [alertHistoryLimit, setAlertHistoryLimit] = useState(100);

    // Fetch all monitoring data
    const fetchMonitoringData = async () => {
        try {
            setError(null);
            const [health, metricsData, breakers, errors, alerts, services] = await Promise.all([
                monitoringService.getHealthStatus(),
                monitoringService.getMetrics(),
                monitoringService.getCircuitBreakers(),
                monitoringService.getErrorSummary(3600), // Last hour
                monitoringService.getActiveAlerts(),
                monitoringService.getServiceMetrics(),
            ]);

            // Log data for debugging
            console.log('Health Status:', health);
            console.log('Circuit Breakers:', breakers);
            console.log('Health Circuit Breakers:', health?.circuit_breakers);

            setHealthStatus(health);
            setMetrics(metricsData);
            setCircuitBreakers(breakers);
            setErrorSummary(errors);
            setActiveAlerts(alerts);
            setServiceMetrics(services);

            // Fetch alert history if the section is visible
            if (showAlertHistory) {
                const history = await monitoringService.getAlertHistory(alertHistoryLimit);
                setAlertHistory(history);
            }
        } catch (err) {
            console.error('Error fetching monitoring data:', err);
            setError(err.message || 'Failed to fetch monitoring data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMonitoringData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchMonitoringData, 30000);
        return () => clearInterval(interval);
    }, [showAlertHistory, alertHistoryLimit]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchMonitoringData();
    };

    const handleResetCircuitBreaker = async (breakerName) => {
        try {
            await monitoringService.resetCircuitBreaker(breakerName);
            fetchMonitoringData();
        } catch (err) {
            setError(`Failed to reset circuit breaker: ${err.message}`);
        }
    };

    const handleResetAllCircuitBreakers = async () => {
        try {
            await monitoringService.resetAllCircuitBreakers();
            fetchMonitoringData();
        } catch (err) {
            setError(`Failed to reset all circuit breakers: ${err.message}`);
        }
    };

    const handleResolveAlert = async (alertId) => {
        try {
            await monitoringService.resolveAlert(alertId);
            fetchMonitoringData();
        } catch (err) {
            setError(`Failed to resolve alert: ${err.message}`);
        }
    };

    const handleCheckAlerts = async () => {
        try {
            await monitoringService.checkAlerts();
            fetchMonitoringData();
        } catch (err) {
            setError(`Failed to check alerts: ${err.message}`);
        }
    };

    const handleToggleAlertHistory = () => {
        setShowAlertHistory(!showAlertHistory);
    };

    const handleAlertHistoryLimitChange = (e) => {
        setAlertHistoryLimit(parseInt(e.target.value, 10));
    };

    // Get status icon and color
    const getStatusIcon = (status) => {
        const statusLower = status?.toLowerCase();
        if (statusLower === 'healthy' || statusLower === 'closed' || statusLower === 'ok') {
            return <FaCheckCircle className="text-green-500" />;
        } else if (
            statusLower === 'degraded' ||
            statusLower === 'half_open' ||
            statusLower === 'warning'
        ) {
            return <FaExclamationTriangle className="text-yellow-500" />;
        } else if (
            statusLower === 'unhealthy' ||
            statusLower === 'open' ||
            statusLower === 'error' ||
            statusLower === 'critical'
        ) {
            return <FaTimesCircle className="text-red-500" />;
        }
        return <FaExclamationCircle className="text-gray-500" />;
    };

    const getStatusColor = (status) => {
        const statusLower = status?.toLowerCase();
        if (statusLower === 'healthy' || statusLower === 'closed' || statusLower === 'ok') {
            return 'bg-green-100 text-green-800';
        } else if (
            statusLower === 'degraded' ||
            statusLower === 'half_open' ||
            statusLower === 'warning'
        ) {
            return 'bg-yellow-100 text-yellow-800';
        } else if (
            statusLower === 'unhealthy' ||
            statusLower === 'open' ||
            statusLower === 'error' ||
            statusLower === 'critical'
        ) {
            return 'bg-red-100 text-red-800';
        }
        return 'bg-gray-100 text-gray-800';
    };

    const formatUptime = (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    };

    // Chart configurations
    const errorChartData =
        errorSummary?.error_summary?.by_severity
            ? {
                labels: Object.keys(errorSummary.error_summary.by_severity),
                datasets: [
                    {
                        label: 'Errors by Severity',
                        data: Object.values(errorSummary.error_summary.by_severity),
                        backgroundColor: [
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(251, 146, 60, 0.8)',
                            'rgba(234, 179, 8, 0.8)',
                            'rgba(59, 130, 246, 0.8)',
                        ],
                    },
                ],
            }
            : null;

    if (loading) {
        return <Loader fullScreen text="Loading monitoring data..." />;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
                    <p className="text-gray-600 mt-1">
                        Real-time system health and performance metrics
                    </p>
                </div>
                <Button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2"
                >
                    <FaSync className={refreshing ? 'animate-spin' : ''} />
                    Refresh
                </Button>
            </div>

            {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

            {/* System Health Status */}
            <Card>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FaServer />
                    System Health Status
                </h2>
                {healthStatus ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                {getStatusIcon(healthStatus.status)}
                                <div>
                                    <p className="text-sm text-gray-600">Overall Status</p>
                                    <p className="text-lg font-semibold capitalize">
                                        {healthStatus.status || 'Unknown'}
                                    </p>
                                </div>
                            </div>
                            {metrics && (
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                    <FaClock className="text-blue-500" />
                                    <div>
                                        <p className="text-sm text-gray-600">Uptime</p>
                                        <p className="text-lg font-semibold">
                                            {formatUptime(metrics.uptime_seconds)}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {metrics?.cache && (
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                    <FaDatabase className="text-purple-500" />
                                    <div>
                                        <p className="text-sm text-gray-600">Cache Hit Rate</p>
                                        <p className="text-lg font-semibold">
                                            {(metrics.cache.hit_rate * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {healthStatus.warning && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-yellow-800 flex items-center gap-2">
                                    <FaExclamationTriangle />
                                    {healthStatus.warning}
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <Loader text="Loading health status..." />
                )}
            </Card>

            {/* Active Alerts */}
            {activeAlerts && activeAlerts.active_alerts && activeAlerts.active_alerts.length > 0 && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <FaExclamationTriangle className="text-yellow-500" />
                            Active Alerts ({activeAlerts.total_active})
                        </h2>
                        <Button size="sm" variant="secondary" onClick={handleCheckAlerts}>
                            Check Alerts
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {activeAlerts.active_alerts.map((alert) => (
                            <div
                                key={alert.id}
                                className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    {getStatusIcon(alert.severity)}
                                    <div>
                                        <p className="font-medium">{alert.message}</p>
                                        <p className="text-sm text-gray-600">
                                            {alert.rule_name} -{' '}
                                            {new Date(alert.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleResolveAlert(alert.id)}
                                >
                                    Resolve
                                </Button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Alert History */}
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <FaClock />
                        Alert History
                    </h2>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label htmlFor="alertLimit" className="text-sm text-gray-600">
                                Limit:
                            </label>
                            <select
                                id="alertLimit"
                                value={alertHistoryLimit}
                                onChange={handleAlertHistoryLimitChange}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                                <option value={500}>500</option>
                            </select>
                        </div>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleToggleAlertHistory}
                        >
                            {showAlertHistory ? 'Hide History' : 'Show History'}
                        </Button>
                    </div>
                </div>

                {showAlertHistory && (
                    <div>
                        {alertHistory ? (
                            alertHistory.alert_history && alertHistory.alert_history.length > 0 ? (
                                <div className="space-y-2">
                                    {alertHistory.alert_history.map((alert) => (
                                        <div
                                            key={alert.id}
                                            className={`flex items-center justify-between p-3 rounded-lg border ${alert.resolved
                                                    ? 'bg-gray-50 border-gray-200'
                                                    : 'bg-yellow-50 border-yellow-200'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {getStatusIcon(alert.severity)}
                                                <div>
                                                    <p className="font-medium">{alert.message}</p>
                                                    <p className="text-sm text-gray-600">
                                                        {alert.rule_name} -{' '}
                                                        {new Date(alert.timestamp).toLocaleString()}
                                                    </p>
                                                    {alert.resolved && alert.resolved_at && (
                                                        <p className="text-xs text-green-600">
                                                            Resolved at:{' '}
                                                            {new Date(
                                                                alert.resolved_at
                                                            ).toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                                                        alert.severity
                                                    )}`}
                                                >
                                                    {alert.severity}
                                                </span>
                                                {alert.resolved ? (
                                                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                                        Resolved
                                                    </span>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => handleResolveAlert(alert.id)}
                                                    >
                                                        Resolve
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
                                        Showing {alertHistory.alert_history.length} of{' '}
                                        {alertHistory.total_alerts || alertHistory.alert_history.length}{' '}
                                        total alerts
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <FaCheckCircle className="text-green-500 text-4xl mx-auto mb-2" />
                                    <p className="text-gray-600">No alert history found</p>
                                </div>
                            )
                        ) : (
                            <Loader text="Loading alert history..." />
                        )}
                    </div>
                )}

                {!showAlertHistory && (
                    <div className="text-center py-8 text-gray-500">
                        <p>Click "Show History" to view past alerts</p>
                    </div>
                )}
            </Card>

            {/* Metrics Overview */}
            {metrics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Cache Metrics */}
                    {metrics.cache && (
                        <Card>
                            <h2 className="text-xl font-semibold mb-4">Cache Performance</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                    <span className="text-gray-600">Hit Rate</span>
                                    <span className="font-semibold">
                                        {(metrics.cache.hit_rate * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                    <span className="text-gray-600">Total Requests</span>
                                    <span className="font-semibold">
                                        {metrics.cache.total_requests}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                    <span className="text-gray-600">Hits</span>
                                    <span className="font-semibold text-green-600">
                                        {metrics.cache.hits}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                    <span className="text-gray-600">Misses</span>
                                    <span className="font-semibold text-red-600">
                                        {metrics.cache.misses}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Error Summary */}
                    {errorChartData && (
                        <Card>
                            <h2 className="text-xl font-semibold mb-4">Error Distribution</h2>
                            <div className="flex justify-center">
                                <div className="w-64 h-64">
                                    <Doughnut
                                        data={errorChartData}
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
                            {errorSummary?.error_summary && (
                                <div className="mt-4 p-3 bg-gray-50 rounded">
                                    <p className="text-sm text-gray-600">
                                        Total Errors:{' '}
                                        <span className="font-semibold">
                                            {errorSummary.error_summary.total_errors}
                                        </span>
                                    </p>
                                </div>
                            )}
                        </Card>
                    )}
                </div>
            )}

            {/* Circuit Breakers from Monitoring Endpoint */}
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Circuit Breakers Status</h2>
                    <Button size="sm" variant="secondary" onClick={handleResetAllCircuitBreakers}>
                        Reset All
                    </Button>
                </div>
                {circuitBreakers && circuitBreakers.circuit_breakers && Object.keys(circuitBreakers.circuit_breakers).length > 0 ? (
                    <div className="space-y-2">
                        {Object.entries(circuitBreakers.circuit_breakers).map(
                            ([name, breaker]) => (
                                <div
                                    key={name}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        {getStatusIcon(breaker.state)}
                                        <div>
                                            <p className="font-medium">{name}</p>
                                            <p className="text-sm text-gray-600">
                                                Failures: {breaker.failure_count || 0} | Success:{' '}
                                                {breaker.success_count || 0}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                                                breaker.state
                                            )}`}
                                        >
                                            {breaker.state}
                                        </span>
                                        {breaker.state !== 'closed' && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleResetCircuitBreaker(name)}
                                            >
                                                Reset
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <FaCheckCircle className="text-green-500 text-4xl mx-auto mb-2" />
                        <p className="text-gray-600">No circuit breakers configured or all are healthy</p>
                    </div>
                )}
            </Card>

            {/* Service Health Checks */}
            {healthStatus?.services && (
                <Card>
                    <h2 className="text-xl font-semibold mb-4">Service Health Checks</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(healthStatus.services).map(([name, service]) => (
                            <div
                                key={name}
                                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"
                            >
                                {getStatusIcon(service.status || 'unknown')}
                                <div className="flex-1">
                                    <p className="font-medium capitalize">{name}</p>
                                    {service.error && (
                                        <p className="text-xs text-red-600">{service.error}</p>
                                    )}
                                </div>
                                <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                                        service.status || 'unknown'
                                    )}`}
                                >
                                    {service.status || 'unknown'}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Circuit Breaker Health from Health Check */}
            {healthStatus && (
                <Card>
                    <h2 className="text-xl font-semibold mb-4">Circuit Breaker Health Status</h2>
                    {healthStatus.circuit_breakers && Object.keys(healthStatus.circuit_breakers).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(healthStatus.circuit_breakers).map(([name, breaker]) => (
                                <div
                                    key={name}
                                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"
                                >
                                    {breaker.healthy ? (
                                        <FaCheckCircle className="text-green-500 text-xl" />
                                    ) : (
                                        <FaTimesCircle className="text-red-500 text-xl" />
                                    )}
                                    <div className="flex-1">
                                        <p className="font-medium">{name}</p>
                                        <p className="text-sm text-gray-600 capitalize">
                                            State: {breaker.state || 'unknown'}
                                        </p>
                                    </div>
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-medium ${breaker.healthy
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}
                                    >
                                        {breaker.healthy ? 'Healthy' : 'Unhealthy'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <FaCheckCircle className="text-green-500 text-4xl mx-auto mb-2" />
                            <p className="text-gray-600">All circuit breakers are healthy</p>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}
