import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FaUser,
    FaEnvelope,
    FaPhone,
    FaMapMarkerAlt,
    FaCalendar,
    FaCheckCircle,
    FaTimesCircle,
    FaDownload,
    FaArrowLeft
} from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';
import { adminService } from '../../api/services';
import Card from '../../components/common/Card';
import ErrorAlert from '../../components/common/ErrorAlert';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export default function UserDetails() {
    const { userId } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [activityLogs, setActivityLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    // Calculate profile completion percentage
    const calculateProfileCompletion = (userData) => {
        if (!userData) return 0;

        const fields = ['name', 'location_address', 'crops', 'land_size', 'preferred_language', 'phone_number'];
        let completedFields = 0;

        fields.forEach(field => {
            const value = userData[field];
            if (Array.isArray(value)) {
                if (value.length > 0) completedFields++;
            } else if (value !== null && value !== undefined && value !== '') {
                completedFields++;
            }
        });

        return Math.round((completedFields / fields.length) * 100);
    };

    useEffect(() => {
        if (userId) {
            fetchUserDetails();
        }
    }, [userId]);

    const fetchUserDetails = async () => {
        try {
            setLoading(true);
            setError(null);

            const [userData, logsData] = await Promise.all([
                adminService.getUserDetails(userId),
                adminService.getUserActivityLogs(userId, 1, 20),
            ]);

            setUser(userData);
            setActivityLogs(logsData.logs || []);
        } catch (err) {
            console.error('Error fetching user details:', err);
            setError(err.response?.data?.message || 'Failed to load user details');
        } finally {
            setLoading(false);
        }
    };

    const handleActivateDeactivate = async () => {
        try {
            setActionLoading(true);

            if (user.is_active) {
                await adminService.deactivateUser(userId);
            } else {
                await adminService.activateUser(userId);
            }

            await fetchUserDetails();
            setShowConfirmDialog(false);
        } catch (err) {
            console.error('Error updating user status:', err);
            setError(err.response?.data?.message || 'Failed to update user status');
        } finally {
            setActionLoading(false);
        }
    };

    const handleExportData = async (format) => {
        try {
            setActionLoading(true);
            const blob = await adminService.exportUserData(userId, format);

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `user_${userId}_data.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error exporting user data:', err);
            setError(err.response?.data?.message || 'Failed to export user data');
        } finally {
            setActionLoading(false);
        }
    };

    const openConfirmDialog = (action) => {
        setConfirmAction(action);
        setShowConfirmDialog(true);
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
                <ErrorAlert message={error} onRetry={fetchUserDetails} />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-8">
                <ErrorAlert message="User not found" />
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <Button
                    variant="secondary"
                    onClick={() => navigate('/admin/users')}
                    className="mb-4"
                >
                    <FaArrowLeft className="mr-2" />
                    Back to Users
                </Button>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">User Details</h1>
                        <p className="text-gray-600">Detailed information and activity logs</p>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => handleExportData('json')}
                            disabled={actionLoading}
                        >
                            <FaDownload className="mr-2" />
                            Export JSON
                        </Button>

                        <Button
                            variant="secondary"
                            onClick={() => handleExportData('csv')}
                            disabled={actionLoading}
                        >
                            <FaDownload className="mr-2" />
                            Export CSV
                        </Button>

                        <Button
                            variant={user.is_active ? 'danger' : 'primary'}
                            onClick={() => openConfirmDialog('toggleStatus')}
                            disabled={actionLoading}
                        >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* User Information */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Profile Card */}
                <Card className="p-6 lg:col-span-2">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Profile Information</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-start">
                            <FaUser className="text-gray-400 mt-1 mr-3" />
                            <div>
                                <p className="text-gray-500 text-sm">Name</p>
                                <p className="text-gray-800 font-medium">{user.name || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex items-start">
                            <FaPhone className="text-gray-400 mt-1 mr-3" />
                            <div>
                                <p className="text-gray-500 text-sm">Phone Number</p>
                                <p className="text-gray-800 font-medium">{user.phone_number || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex items-start">
                            <FaMapMarkerAlt className="text-gray-400 mt-1 mr-3" />
                            <div>
                                <p className="text-gray-500 text-sm">Location</p>
                                <p className="text-gray-800 font-medium">{user.location_address || user.district || user.state || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex items-start">
                            <div className="text-gray-400 mt-1 mr-3">🌾</div>
                            <div>
                                <p className="text-gray-500 text-sm">Language</p>
                                <p className="text-gray-800 font-medium">{user.preferred_language || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex items-start">
                            <FaCalendar className="text-gray-400 mt-1 mr-3" />
                            <div>
                                <p className="text-gray-500 text-sm">Registration Date</p>
                                <p className="text-gray-800 font-medium">
                                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start">
                            <FaCalendar className="text-gray-400 mt-1 mr-3" />
                            <div>
                                <p className="text-gray-500 text-sm">Last Login</p>
                                <p className="text-gray-800 font-medium">
                                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Additional Profile Info */}
                    {user.crops && user.crops.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <p className="text-gray-500 text-sm mb-2">Crops</p>
                            <div className="flex flex-wrap gap-2">
                                {user.crops.map((crop, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                                    >
                                        {crop}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {user.land_size && (
                        <div className="mt-4">
                            <p className="text-gray-500 text-sm">Land Size</p>
                            <p className="text-gray-800 font-medium">{user.land_size} acres</p>
                        </div>
                    )}
                </Card>

                {/* Statistics Card */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Statistics</h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Status</span>
                            <span className={`flex items-center ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                {user.is_active ? (
                                    <>
                                        <FaCheckCircle className="mr-1" />
                                        Active
                                    </>
                                ) : (
                                    <>
                                        <FaTimesCircle className="mr-1" />
                                        Inactive
                                    </>
                                )}
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Role</span>
                            <span className="text-gray-800 font-medium capitalize">{user.role || 'user'}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Total Sessions</span>
                            <span className="text-gray-800 font-medium">{user.total_sessions || 0}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Active Sessions</span>
                            <span className="text-gray-800 font-medium">{user.active_sessions || 0}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Profile Completion</span>
                            <span className="text-gray-800 font-medium">
                                {calculateProfileCompletion(user)}%
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Activity Logs */}
            <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Activity Logs</h2>

                {activityLogs.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No activity logs available</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Timestamp</th>
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Action</th>
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Details</th>
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activityLogs.map((log, index) => (
                                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-4 text-gray-800">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-gray-800 font-medium">{log.action}</td>
                                        <td className="py-3 px-4 text-gray-600">{log.details || '-'}</td>
                                        <td className="py-3 px-4 text-gray-600">{log.ipAddress || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={showConfirmDialog}
                title={user.is_active ? 'Deactivate User' : 'Activate User'}
                message={
                    user.is_active
                        ? 'Are you sure you want to deactivate this user? They will not be able to access the platform.'
                        : 'Are you sure you want to activate this user? They will be able to access the platform.'
                }
                onConfirm={handleActivateDeactivate}
                onClose={() => setShowConfirmDialog(false)}
                confirmText={user.is_active ? 'Deactivate' : 'Activate'}
                variant={user.is_active ? 'danger' : 'warning'}
                loading={actionLoading}
            />
        </div>
    );
}
