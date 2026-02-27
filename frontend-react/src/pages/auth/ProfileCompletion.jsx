import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaUser, FaMapMarkerAlt, FaSeedling, FaRulerCombined, FaLanguage, FaCheckCircle } from 'react-icons/fa';
import userService from '../../api/services/userService';
import { updateUser, selectUser } from '../../store/slices/authSlice';
import Loader from '../../components/common/Loader';

/**
 * ProfileCompletion Page Component
 * 
 * Provides interface for new users to complete their profile with:
 * - Name, location, crops, land size, and language fields
 * - Form validation using React Hook Form
 * - Multi-select for crops
 * - Error handling and display
 * - Redirect to dashboard after completion
 * 
 * Requirements: 2.1-2.3, 1.9
 */
export default function ProfileCompletion() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const currentUser = useSelector(selectUser);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [cropInput, setCropInput] = useState('');

    // Available languages
    const languages = [
        { value: 'en', label: 'English' },
        { value: 'hi', label: 'Hindi' },
        { value: 'bn', label: 'Bengali' },
        { value: 'te', label: 'Telugu' },
        { value: 'mr', label: 'Marathi' },
        { value: 'ta', label: 'Tamil' },
        { value: 'gu', label: 'Gujarati' },
        { value: 'kn', label: 'Kannada' },
        { value: 'ml', label: 'Malayalam' },
        { value: 'pa', label: 'Punjabi' }
    ];

    // Common crops for suggestions
    const commonCrops = [
        'Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane',
        'Soybean', 'Groundnut', 'Pulses', 'Vegetables', 'Fruits'
    ];

    // React Hook Form setup
    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        formState: { errors, isSubmitting }
    } = useForm({
        mode: 'onBlur',
        defaultValues: {
            name: currentUser?.name || '',
            location: currentUser?.location || '',
            crops: currentUser?.crops || [],
            land_size: currentUser?.land_size || '',
            language: currentUser?.language || 'en'
        }
    });

    // Watch crops field
    const crops = watch('crops');

    // Check if profile is already complete
    useEffect(() => {
        if (currentUser && userService.isProfileComplete(currentUser)) {
            // Profile already complete, redirect to dashboard
            navigate('/dashboard');
        }
    }, [currentUser, navigate]);

    /**
     * Handle form submission
     * Requirement 2.1-2.3: Save profile data via API
     * Requirement 1.9: Redirect to dashboard after completion
     */
    const onSubmit = async (data) => {
        try {
            setLoading(true);
            setError(null);

            // Validate profile data
            const validation = userService.validateProfileData(data);
            if (!validation.isValid) {
                const errorMessages = Object.values(validation.errors).join(', ');
                setError(errorMessages);
                return;
            }

            // Convert land_size to number
            const profileData = {
                ...data,
                land_size: parseFloat(data.land_size)
            };

            // Call API to complete profile
            const response = await userService.completeProfile(profileData);

            // Update Redux store with new user data
            const updatedUser = response.user || response;
            dispatch(updateUser(updatedUser));

            // Redirect to dashboard
            navigate('/dashboard');
        } catch (err) {
            console.error('Profile completion error:', err);
            setError(err.message || 'Failed to save profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Add crop to the list
     */
    const addCrop = (cropName) => {
        const trimmedCrop = cropName.trim();
        if (trimmedCrop && !crops.includes(trimmedCrop)) {
            setValue('crops', [...crops, trimmedCrop]);
            setCropInput('');
        }
    };

    /**
     * Remove crop from the list
     */
    const removeCrop = (cropToRemove) => {
        setValue('crops', crops.filter(crop => crop !== cropToRemove));
    };

    /**
     * Handle crop input key press
     */
    const handleCropKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addCrop(cropInput);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
                {/* Header */}
                <div>
                    <div className="flex items-center justify-center mb-4">
                        <FaCheckCircle className="h-12 w-12 text-green-500" />
                    </div>
                    <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
                        Complete Your Profile
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Help us personalize your experience by providing some information about your farm
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                {/* Profile Completion Form */}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                        {/* Name Field */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaUser className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="name"
                                    type="text"
                                    placeholder="Enter your full name"
                                    className={`appearance-none block w-full pl-10 pr-3 py-2 border ${errors.name ? 'border-red-300' : 'border-gray-300'
                                        } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                                    {...register('name', {
                                        required: 'Name is required',
                                        minLength: {
                                            value: 2,
                                            message: 'Name must be at least 2 characters'
                                        },
                                        maxLength: {
                                            value: 100,
                                            message: 'Name must not exceed 100 characters'
                                        }
                                    })}
                                />
                            </div>
                            {errors.name && (
                                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                            )}
                        </div>

                        {/* Location Field */}
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                                Location <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaMapMarkerAlt className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="location"
                                    type="text"
                                    placeholder="City, State or Village"
                                    className={`appearance-none block w-full pl-10 pr-3 py-2 border ${errors.location ? 'border-red-300' : 'border-gray-300'
                                        } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                                    {...register('location', {
                                        required: 'Location is required',
                                        minLength: {
                                            value: 2,
                                            message: 'Location must be at least 2 characters'
                                        }
                                    })}
                                />
                            </div>
                            {errors.location && (
                                <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
                            )}
                        </div>

                        {/* Crops Field */}
                        <div>
                            <label htmlFor="crops" className="block text-sm font-medium text-gray-700 mb-1">
                                Crops <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaSeedling className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="crops"
                                    type="text"
                                    placeholder="Type crop name and press Enter"
                                    value={cropInput}
                                    onChange={(e) => setCropInput(e.target.value)}
                                    onKeyPress={handleCropKeyPress}
                                    className={`appearance-none block w-full pl-10 pr-3 py-2 border ${errors.crops ? 'border-red-300' : 'border-gray-300'
                                        } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                                />
                            </div>

                            {/* Crop suggestions */}
                            <div className="mt-2 flex flex-wrap gap-2">
                                {commonCrops.map((crop) => (
                                    <button
                                        key={crop}
                                        type="button"
                                        onClick={() => addCrop(crop)}
                                        disabled={crops.includes(crop)}
                                        className={`px-3 py-1 text-xs rounded-full ${crops.includes(crop)
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                            }`}
                                    >
                                        {crop}
                                    </button>
                                ))}
                            </div>

                            {/* Selected crops */}
                            {crops.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {crops.map((crop) => (
                                        <span
                                            key={crop}
                                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                                        >
                                            {crop}
                                            <button
                                                type="button"
                                                onClick={() => removeCrop(crop)}
                                                className="ml-2 text-green-600 hover:text-green-800"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Hidden input for validation */}
                            <Controller
                                name="crops"
                                control={control}
                                rules={{
                                    validate: (value) => value.length > 0 || 'At least one crop is required'
                                }}
                                render={() => null}
                            />

                            {errors.crops && (
                                <p className="mt-1 text-sm text-red-600">{errors.crops.message}</p>
                            )}
                        </div>

                        {/* Land Size Field */}
                        <div>
                            <label htmlFor="land_size" className="block text-sm font-medium text-gray-700 mb-1">
                                Land Size (acres) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaRulerCombined className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="land_size"
                                    type="number"
                                    step="0.01"
                                    placeholder="Enter land size in acres"
                                    className={`appearance-none block w-full pl-10 pr-3 py-2 border ${errors.land_size ? 'border-red-300' : 'border-gray-300'
                                        } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                                    {...register('land_size', {
                                        required: 'Land size is required',
                                        min: {
                                            value: 0.01,
                                            message: 'Land size must be greater than 0'
                                        },
                                        max: {
                                            value: 10000,
                                            message: 'Land size seems too large'
                                        }
                                    })}
                                />
                            </div>
                            {errors.land_size && (
                                <p className="mt-1 text-sm text-red-600">{errors.land_size.message}</p>
                            )}
                        </div>

                        {/* Language Field */}
                        <div>
                            <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                                Preferred Language <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaLanguage className="h-5 w-5 text-gray-400" />
                                </div>
                                <select
                                    id="language"
                                    className={`appearance-none block w-full pl-10 pr-3 py-2 border ${errors.language ? 'border-red-300' : 'border-gray-300'
                                        } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                                    {...register('language', {
                                        required: 'Language preference is required'
                                    })}
                                >
                                    {languages.map((lang) => (
                                        <option key={lang.value} value={lang.value}>
                                            {lang.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {errors.language && (
                                <p className="mt-1 text-sm text-red-600">{errors.language.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div>
                        <button
                            type="submit"
                            disabled={loading || isSubmitting}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading || isSubmitting ? (
                                <Loader size={20} color="#ffffff" />
                            ) : (
                                'Complete Profile & Continue'
                            )}
                        </button>
                    </div>

                    {/* Skip Link (optional) */}
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            className="text-sm text-gray-600 hover:text-gray-800"
                        >
                            Skip for now
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
