import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    FaSearch,
    FaFilter,
    FaUserCheck,
    FaUserTimes,
    FaEye,
    FaDownload,
    FaChevronLeft,
    FaChevronRight,
} from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';
import { adminService } from '../../api/services';
import Card from '../../components/common/Card';
import ErrorAlert from '../../components/common/ErrorAlert';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useDebounce } from '../../hooks';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        role: '',
        status: '',
        profileComplete: '',
    });
    const [showFilters, setShowFilters] = useState(false);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalUsers: 0,
        limit: 20,
    });
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
    });

    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    useEffect(() => {
        fetchUsers();
    }, [pagination.currentPage, debouncedSearchTerm, filters]);

    useEffect(() => {
        fetchUserStats();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await adminService.getUsers(
                pagination.currentPage,
                pagination.limit,
                debouncedSearchTerm,
                filters
            );

            setUsers(response.users || []);
            setPagination((prev) => ({
                ...prev,
                totalPages: response.total_pages || 1,
                totalUsers: response.total || 0,
            }));
        } catch (err) {
            console.error('Error fetching users:', err);
            setError(err.response?.data?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const fetchUserStats = async () => {
        try {
            const statsData = await adminService.getUserStats();
            setStats(statsData);
        } catch (err) {
            console.error('Error fetching user stats:', err);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    };

    const handleFilterChange = (filterName, value) => {
        setFilters((prev) => ({
            ...prev,
            [filterName]: value,
        }));
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    };

    const clearFilters = () => {
        setFilters({
            role: '',
            status: '',
            profileComplete: '',
        });
        setSearchTerm('');
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    };

    const handleActivateUser = async (userId) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Activate User',
            message: 'Are you sure you want to activate this user account?',
            onConfirm: async () => {
                try {
                    await adminService.activateUser(userId);
                    fetchUsers();
                    fetchUserStats();
                } catch (err) {
                    console.error('Error activating user:', err);
                    setError(err.response?.data?.message || 'Failed to activate user');
                }
                setConfirmDialog({ ...confirmDialog, isOpen: false });
            },
        });
    };

    const handleDeactivateUser = async (userId) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Deactivate User',
            message: 'Are you sure you want to deactivate this user account?',
            onConfirm: async () => {
                try {
                    await adminService.deactivateUser(userId);
                    fetchUsers();
                    fetchUserStats();
                } catch (err) {
                    console.error('Error deactivating user:', err);
                    setError(err.response?.data?.message || 'Failed to deactivate user');
                }
                setConfirmDialog({ ...confirmDialog, isOpen: false });
            },
        });
    };

    const handleExportUser = async (userId) => {
        try {
            const blob = await adminService.exportUserData(userId, 'json');
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `user-${userId}-data.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error exporting user data:', err);
            setError(err.response?.data?.message || 'Failed to export user data');
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination((prev) => ({ ...prev, currentPage: newPage }));
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusBadge = (isActive) => {
        return isActive ? (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                Active
            </span>
        ) : (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                Inactive
            </span>
        );
    };

    const getRoleBadge = (role) => {
        const isAdmin = role === 'admin';
        return isAdmin ? (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                Admin
            </span>
        ) : (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                User
            </span>
        );
    };

    if (loading && users.length === 0) {
        return (
            <div className="flex justify-center items-center h-screen">
                <ClipLoader color="#3B82F6" size={50} />
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">User Management</h1>
                <p className="text-gray-600">Manage user accounts and permissions</p>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mb-6">
                    <ErrorAlert message={error} onClose={() => setError(null)} />
                </div>
            )}

            {/* User Statistics */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="p-6">
                        <p className="text-gray-500 text-sm mb-1">Total Users</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.total_users || 0}</p>
                    </Card>
                    <Card className="p-6">
                        <p className="text-gray-500 text-sm mb-1">Active Users</p>
                        <p className="text-3xl font-bold text-green-600">{stats.active_users || 0}</p>
                    </Card>
                    <Card className="p-6">
                        <p className="text-gray-500 text-sm mb-1">New This Month</p>
                        <p className="text-3xl font-bold text-blue-600">{stats.new_users_month || 0}</p>
                    </Card>
                    <Card className="p-6">
                        <p className="text-gray-500 text-sm mb-1">Admin Users</p>
                        <p className="text-3xl font-bold text-purple-600">{stats.admin_users || 0}</p>
                    </Card>
                </div>
            )}

            {/* Search and Filters */}
            <Card className="p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="flex-1">
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search by name, phone, or email..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="pl-10 w-full"
                            />
                        </div>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2"
                    >
                        <FaFilter />
                        Filters
                    </Button>
                </div>

                {/* Filter Options */}
                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Role
                            </label>
                            <select
                                value={filters.role}
                                onChange={(e) => handleFilterChange('role', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Roles</option>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                            </label>
                            <select
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Profile Status
                            </label>
                            <select
                                value={filters.profileComplete}
                                onChange={(e) =>
                                    handleFilterChange('profileComplete', e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Profiles</option>
                                <option value="complete">Complete</option>
                                <option value="incomplete">Incomplete</option>
                            </select>
                        </div>
                        <div className="md:col-span-3">
                            <Button variant="secondary" onClick={clearFilters} className="w-full">
                                Clear Filters
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Users Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Phone
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Registered
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Login
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center">
                                        <ClipLoader color="#3B82F6" size={40} />
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="7"
                                        className="px-6 py-12 text-center text-gray-500"
                                    >
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <span className="text-blue-600 font-semibold">
                                                        {user.name
                                                            ? user.name.charAt(0).toUpperCase()
                                                            : 'U'}
                                                    </span>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.name || 'Unnamed User'}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        ID: {user.id}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {user.phone_number || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getRoleBadge(user.role)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(user.is_active)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(user.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(user.last_login)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    to={`/admin/users/${user.id}`}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="View Details"
                                                >
                                                    <FaEye />
                                                </Link>
                                                {user.is_active ? (
                                                    <button
                                                        onClick={() =>
                                                            handleDeactivateUser(user.id)
                                                        }
                                                        className="text-red-600 hover:text-red-900"
                                                        title="Deactivate User"
                                                    >
                                                        <FaUserTimes />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleActivateUser(user.id)}
                                                        className="text-green-600 hover:text-green-900"
                                                        title="Activate User"
                                                    >
                                                        <FaUserCheck />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleExportUser(user.id)}
                                                    className="text-gray-600 hover:text-gray-900"
                                                    title="Export User Data"
                                                >
                                                    <FaDownload />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="bg-white px-6 py-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Showing{' '}
                                <span className="font-medium">
                                    {(pagination.currentPage - 1) * pagination.limit + 1}
                                </span>{' '}
                                to{' '}
                                <span className="font-medium">
                                    {Math.min(
                                        pagination.currentPage * pagination.limit,
                                        pagination.totalUsers
                                    )}
                                </span>{' '}
                                of <span className="font-medium">{pagination.totalUsers}</span>{' '}
                                users
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                                    disabled={pagination.currentPage === 1}
                                    className="flex items-center gap-1"
                                >
                                    <FaChevronLeft />
                                    Previous
                                </Button>
                                <div className="flex items-center gap-2">
                                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                                        .filter(
                                            (page) =>
                                                page === 1 ||
                                                page === pagination.totalPages ||
                                                Math.abs(page - pagination.currentPage) <= 1
                                        )
                                        .map((page, index, array) => (
                                            <div key={page} className="flex items-center">
                                                {index > 0 && array[index - 1] !== page - 1 && (
                                                    <span className="px-2 text-gray-500">...</span>
                                                )}
                                                <Button
                                                    variant={
                                                        page === pagination.currentPage
                                                            ? 'primary'
                                                            : 'secondary'
                                                    }
                                                    onClick={() => handlePageChange(page)}
                                                    className="min-w-[40px]"
                                                >
                                                    {page}
                                                </Button>
                                            </div>
                                        ))}
                                </div>
                                <Button
                                    variant="secondary"
                                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                                    disabled={pagination.currentPage === pagination.totalPages}
                                    className="flex items-center gap-1"
                                >
                                    Next
                                    <FaChevronRight />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
            />
        </div>
    );
}
