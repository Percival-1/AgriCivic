import { useState, useEffect } from 'react';
import {
    FaSync,
    FaCheckCircle,
    FaExclamationTriangle,
    FaTimesCircle,
    FaClock,
    FaServer,
    FaFileAlt,
    FaPlay,
    FaChartLine,
} from 'react-icons/fa';
import Loader from '../../components/common/Loader';
import ErrorAlert from '../../components/common/ErrorAlert';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import portalSyncService from '../../api/services/portalSyncService';

export default function PortalSync() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // State for portal sync data
    const [syncStatus, setSyncStatus] = useState(null);
    const [portals, setPortals] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [health, setHealth] = useState(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [itemsPerPage] = useState(10);

    // Confirmation dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    // Syncing state
    const [syncing, setSyncing] = useState(false);

    // Fetch all portal sync data
    const fetchPortalSyncData = async () => {
        try {
            setError(null);

            const [statusData, portalsData, documentsData, healthData] = await Promise.all([
                portalSyncService.getSyncStatus().catch(() => null),
                portalSyncService.getConfiguredPortals().catch(() => ({ portals: [] })),
                portalSyncService.getSyncedDocuments({
                    page: currentPage,
                    limit: itemsPerPage,
                }).catch(() => ({ documents: [], total_documents: 0 })),
                portalSyncService.getSyncHealth().catch(() => ({ status: 'unknown' })),
            ]);

            setSyncStatus(statusData);
            setPortals(portalsData?.portals || []);
            setDocuments(documentsData?.documents || []);
            setTotalPages(Math.ceil((documentsData?.total_documents || 0) / itemsPerPage));
            setHealth(healthData);
        } catch (err) {
            console.error('Error fetching portal sync data:', err);
            setError(err.message || 'Failed to fetch portal sync data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPortalSyncData();
    }, [currentPage]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchPortalSyncData();
    };

    const handleTriggerSync = async (forceSync = false) => {
        try {
            setSyncing(true);
            setError(null);
            setSuccess(null);

            console.log('Triggering sync with forceSync:', forceSync);
            const result = await portalSyncService.triggerBackgroundSync(forceSync);
            console.log('Sync result:', result);

            setSuccess(`Sync triggered successfully. ${result.message || ''}`);
            setTimeout(() => {
                fetchPortalSyncData();
            }, 2000);
        } catch (err) {
            console.error('Sync error:', err);
            setError(`Failed to trigger sync: ${err.message}`);
        } finally {
            setSyncing(false);
        }
    };

    const confirmTriggerSync = (forceSync = false) => {
        setConfirmMessage(
            'Are you sure you want to trigger synchronization for all portals?'
        );
        setConfirmAction(() => () => {
            handleTriggerSync(forceSync);
            setShowConfirmDialog(false);
        });
        setShowConfirmDialog(true);
    };

    // Get status icon and color
    const getStatusIcon = (status) => {
        if (!status || typeof status !== 'string') {
            return <FaClock className="text-gray-500" />;
        }
        const statusLower = status.toLowerCase();
        if (statusLower === 'completed' || statusLower === 'success' || statusLower === 'healthy') {
            return <FaCheckCircle className="text-green-500" />;
        } else if (statusLower === 'running' || statusLower === 'in_progress' || statusLower === 'pending') {
            return <FaClock className="text-blue-500 animate-pulse" />;
        } else if (statusLower === 'failed' || statusLower === 'error' || statusLower === 'unhealthy') {
            return <FaTimesCircle className="text-red-500" />;
        } else if (statusLower === 'warning' || statusLower === 'degraded') {
            return <FaExclamationTriangle className="text-yellow-500" />;
        }
        return <FaClock className="text-gray-500" />;
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return <Loader fullScreen text="Loading portal sync data..." />;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Portal Synchronization</h1>
                    <p className="text-gray-600 mt-1">
                        Manage government portal data synchronization
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
                        onClick={() => confirmTriggerSync(false)}
                        disabled={syncing}
                        variant="primary"
                        className="flex items-center gap-2"
                    >
                        <FaPlay />
                        {syncing ? 'Syncing...' : 'Trigger Sync'}
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

            {/* Sync Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <div className="flex items-center gap-3">
                        {health ? getStatusIcon(typeof health === 'object' && health.status ? health.status : 'unknown') : <FaClock className="text-gray-400" />}
                        <div>
                            <p className="text-sm text-gray-600">Health Status</p>
                            <p className="text-lg font-semibold capitalize">
                                {typeof health === 'object' && health.status ? health.status : health || 'Unknown'}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center gap-3">
                        <FaServer className="text-blue-500" />
                        <div>
                            <p className="text-sm text-gray-600">Active Portals</p>
                            <p className="text-lg font-semibold">
                                {syncStatus?.enabled_portals || 0} / {syncStatus?.configured_portals || 0}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center gap-3">
                        <FaFileAlt className="text-green-500" />
                        <div>
                            <p className="text-sm text-gray-600">Total Documents</p>
                            <p className="text-lg font-semibold">
                                {syncStatus?.total_synced_documents || 0}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center gap-3">
                        <FaClock className="text-purple-500" />
                        <div>
                            <p className="text-sm text-gray-600">Last Sync</p>
                            <p className="text-sm font-semibold">
                                {syncStatus?.last_sync_time
                                    ? formatDate(syncStatus.last_sync_time)
                                    : 'Never'}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Configured Portals */}
            <Card>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FaServer />
                    Configured Portals
                </h2>
                {portals.length > 0 ? (
                    <div className="space-y-3">
                        {portals.map((portal, index) => (
                            <div
                                key={portal.name || index}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        {portal.enabled ? (
                                            <FaCheckCircle className="text-green-500" />
                                        ) : (
                                            <FaTimesCircle className="text-gray-400" />
                                        )}
                                        <div>
                                            <p className="font-medium text-lg">{portal.name}</p>
                                            <p className="text-sm text-gray-600">{portal.url}</p>
                                            <div className="flex gap-4 mt-2 text-sm">
                                                <span className="text-gray-600">
                                                    Status:{' '}
                                                    <span
                                                        className={
                                                            portal.enabled
                                                                ? 'text-green-600 font-semibold'
                                                                : 'text-gray-500'
                                                        }
                                                    >
                                                        {portal.enabled ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </span>
                                                {portal.scheme_type && (
                                                    <span className="text-gray-600">
                                                        Type: {portal.scheme_type}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <FaServer className="text-gray-400 text-4xl mx-auto mb-2" />
                        <p className="text-gray-600">No portals configured</p>
                    </div>
                )}
            </Card>

            {/* Synced Documents */}
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <FaFileAlt />
                        Synced Documents
                    </h2>
                </div>

                {documents.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Scheme
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Source URL
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Last Updated
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {documents.map((doc, index) => (
                                        <tr key={doc.scheme_id || index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {doc.scheme_name || 'Untitled'}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    ID: {doc.scheme_id}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                <a
                                                    href={doc.source_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {doc.source_url?.substring(0, 50)}...
                                                </a>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(doc.last_updated)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center mt-4">
                                <p className="text-sm text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        variant="secondary"
                                        size="sm"
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        onClick={() =>
                                            setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                                        }
                                        disabled={currentPage === totalPages}
                                        variant="secondary"
                                        size="sm"
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-8">
                        <FaFileAlt className="text-gray-400 text-4xl mx-auto mb-2" />
                        <p className="text-gray-600">No documents found</p>
                    </div>
                )}
            </Card>

            {/* Confirm Dialog */}
            {showConfirmDialog && (
                <ConfirmDialog
                    isOpen={showConfirmDialog}
                    title="Confirm Action"
                    message={confirmMessage}
                    onConfirm={confirmAction}
                    onCancel={() => setShowConfirmDialog(false)}
                    onClose={() => setShowConfirmDialog(false)}
                />
            )}
        </div>
    );
}
