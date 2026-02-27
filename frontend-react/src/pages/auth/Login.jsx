import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router-dom';
import { FaPhone, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import useAuth from '../../hooks/useAuth';
import Loader from '../../components/common/Loader';

/**
 * Login Page Component
 * 
 * Provides user authentication interface with:
 * - Phone number and password fields
 * - Password strength indicator
 * - Form validation using React Hook Form
 * - Error handling and display
 * - Redirect to dashboard or profile completion after login
 * 
 * Requirements: 1.1, 1.5, 1.6
 */
export default function Login() {
    const location = useLocation();
    const { login, loading, error, clearError, checkPasswordStrength } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(null);

    // Get redirect path from location state (for protected route redirects)
    const from = location.state?.from?.pathname || null;

    // React Hook Form setup
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting }
    } = useForm({
        mode: 'onBlur',
        defaultValues: {
            phone_number: '',
            password: ''
        }
    });

    // Watch password field for strength indicator
    const password = watch('password');

    // Update password strength when password changes
    useEffect(() => {
        if (password) {
            const strength = checkPasswordStrength(password);
            setPasswordStrength(strength);
        } else {
            setPasswordStrength(null);
        }
    }, [password, checkPasswordStrength]);

    // Clear error when component unmounts
    useEffect(() => {
        return () => clearError();
    }, [clearError]);

    /**
     * Handle form submission
     * Requirement 1.1: Authenticate via Backend_API and store JWT_Token
     */
    const onSubmit = async (data) => {
        const result = await login(data.phone_number, data.password, from);

        if (!result.success) {
            // Error is already set in the auth hook
            console.error('Login failed:', result.error);
        }
        // Redirect is handled by the useAuth hook
    };

    /**
     * Get password strength color
     */
    const getStrengthColor = () => {
        if (!passwordStrength) return 'bg-gray-200';

        switch (passwordStrength.label) {
            case 'Strong':
                return 'bg-green-500';
            case 'Medium':
                return 'bg-yellow-500';
            case 'Weak':
                return 'bg-red-500';
            default:
                return 'bg-gray-200';
        }
    };

    /**
     * Get password strength width percentage
     */
    const getStrengthWidth = () => {
        if (!passwordStrength) return '0%';
        return `${(passwordStrength.strength / 5) * 100}%`;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
                {/* Header */}
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Welcome Back
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Sign in to access your agricultural intelligence platform
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                {/* Login Form */}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                        {/* Phone Number Field */}
                        <div>
                            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                                Phone Number
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaPhone className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="phone_number"
                                    type="tel"
                                    placeholder="+1234567890"
                                    className={`appearance-none block w-full pl-10 pr-3 py-2 border ${errors.phone_number ? 'border-red-300' : 'border-gray-300'
                                        } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                                    {...register('phone_number', {
                                        required: 'Phone number is required',
                                        pattern: {
                                            value: /^\+[1-9]\d{1,14}$/,
                                            message: 'Please enter a valid phone number in E.164 format (e.g., +1234567890)'
                                        }
                                    })}
                                />
                            </div>
                            {errors.phone_number && (
                                <p className="mt-1 text-sm text-red-600">{errors.phone_number.message}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                                Format: +[country code][number] (e.g., +1234567890)
                            </p>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaLock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter your password"
                                    className={`appearance-none block w-full pl-10 pr-10 py-2 border ${errors.password ? 'border-red-300' : 'border-gray-300'
                                        } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                                    {...register('password', {
                                        required: 'Password is required',
                                        minLength: {
                                            value: 6,
                                            message: 'Password must be at least 6 characters'
                                        }
                                    })}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    ) : (
                                        <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                            )}

                            {/* Password Strength Indicator - Requirement 1.6 */}
                            {password && passwordStrength && (
                                <div className="mt-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-gray-600">Password Strength:</span>
                                        <span className={`text-xs font-medium ${passwordStrength.label === 'Strong' ? 'text-green-600' :
                                                passwordStrength.label === 'Medium' ? 'text-yellow-600' :
                                                    'text-red-600'
                                            }`}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
                                            style={{ width: getStrengthWidth() }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div>
                        <button
                            type="submit"
                            disabled={loading || isSubmitting}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading || isSubmitting ? (
                                <Loader size={20} color="#ffffff" />
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </div>

                    {/* Register Link */}
                    <div className="text-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link
                                to="/register"
                                className="font-medium text-blue-600 hover:text-blue-500"
                            >
                                Sign up here
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
