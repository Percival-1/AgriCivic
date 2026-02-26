import { useSelector } from 'react-redux';
import { selectUser, selectToken } from '../../store/slices/authSlice';
import Card from '../../components/common/Card';

/**
 * Admin Check Component
 * 
 * Diagnostic page to verify admin access and role detection
 */
export default function AdminCheck() {
    const user = useSelector(selectUser);
    const token = useSelector(selectToken);

    const isAdmin = user && (
        user.role === 'admin' ||
        user.is_admin === true ||
        user.isAdmin === true ||
        (Array.isArray(user.roles) && user.roles.includes('admin'))
    );

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Access Diagnostic</h1>

            <div className="grid grid-cols-1 gap-6">
                {/* Authentication Status */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Authentication Status</h2>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Has Token:</span>
                            <span className={`font-medium ${token ? 'text-green-600' : 'text-red-600'}`}>
                                {token ? 'Yes ✓' : 'No ✗'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">User Loaded:</span>
                            <span className={`font-medium ${user ? 'text-green-600' : 'text-red-600'}`}>
                                {user ? 'Yes ✓' : 'No ✗'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Is Admin:</span>
                            <span className={`font-medium ${isAdmin ? 'text-green-600' : 'text-red-600'}`}>
                                {isAdmin ? 'Yes ✓' : 'No ✗'}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* User Details */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">User Details</h2>
                    {user ? (
                        <div className="space-y-2">
                            <div>
                                <span className="text-gray-600">Phone Number:</span>
                                <span className="ml-2 font-medium text-gray-800">{user.phone_number || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">Name:</span>
                                <span className="ml-2 font-medium text-gray-800">{user.name || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">Role:</span>
                                <span className="ml-2 font-medium text-gray-800">{user.role || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">is_admin:</span>
                                <span className="ml-2 font-medium text-gray-800">{String(user.is_admin) || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">isAdmin:</span>
                                <span className="ml-2 font-medium text-gray-800">{String(user.isAdmin) || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">Active:</span>
                                <span className="ml-2 font-medium text-gray-800">{String(user.is_active) || 'N/A'}</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500">No user data available</p>
                    )}
                </Card>

                {/* Full User Object */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Full User Object (JSON)</h2>
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                        {JSON.stringify(user, null, 2)}
                    </pre>
                </Card>

                {/* Token Preview */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Token Preview</h2>
                    <div className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm break-all">
                        {token ? token.substring(0, 100) + '...' : 'No token'}
                    </div>
                </Card>

                {/* Recommendations */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Recommendations</h2>
                    <div className="space-y-3">
                        {!token && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-red-800 font-medium">⚠️ No authentication token found</p>
                                <p className="text-red-600 text-sm mt-1">Please login first</p>
                            </div>
                        )}
                        {!user && token && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-yellow-800 font-medium">⚠️ Token exists but no user data</p>
                                <p className="text-yellow-600 text-sm mt-1">Try refreshing the page or logging in again</p>
                            </div>
                        )}
                        {user && !isAdmin && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-yellow-800 font-medium">⚠️ User is not an admin</p>
                                <p className="text-yellow-600 text-sm mt-1">
                                    Current role: <strong>{user.role || 'none'}</strong>
                                </p>
                                <p className="text-yellow-600 text-sm mt-1">
                                    To fix: Run SQL command: <code className="bg-yellow-100 px-2 py-1 rounded">
                                        UPDATE users SET role = 'admin' WHERE phone_number = '{user.phone_number}';
                                    </code>
                                </p>
                            </div>
                        )}
                        {user && isAdmin && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-green-800 font-medium">✓ Admin access confirmed!</p>
                                <p className="text-green-600 text-sm mt-1">You have full admin privileges</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
