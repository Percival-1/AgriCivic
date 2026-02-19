import * as yup from 'yup';

/**
 * Validation schema for login form
 * Validates phone number in E.164 format and password requirements
 */
export const loginSchema = yup.object({
    phone_number: yup
        .string()
        .required('Phone number is required')
        .matches(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format'),
    password: yup
        .string()
        .required('Password is required')
        .min(8, 'Password must be at least 8 characters'),
});

/**
 * Validation schema for registration form
 * Matches backend UserRegister schema
 */
export const registerSchema = yup.object({
    phone_number: yup
        .string()
        .required('Phone number is required')
        .matches(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format'),
    password: yup
        .string()
        .required('Password is required')
        .min(8, 'Password must be at least 8 characters')
        .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
        .matches(/[0-9]/, 'Password must contain at least one number'),
    confirm_password: yup
        .string()
        .required('Please confirm your password')
        .oneOf([yup.ref('password')], 'Passwords must match'),
    name: yup
        .string()
        .optional()
        .min(2, 'Name must be at least 2 characters'),
    preferred_language: yup
        .string()
        .optional(),
    terms_accepted: yup
        .boolean()
        .oneOf([true], 'You must accept the terms and conditions'),
});

/**
 * Validation schema for profile update form
 * All fields are optional since users can update partial information
 */
export const profileUpdateSchema = yup.object({
    name: yup
        .string()
        .optional()
        .min(2, 'Name must be at least 2 characters'),
    preferred_language: yup
        .string()
        .optional(),
    crops: yup
        .array()
        .of(yup.string())
        .optional(),
    land_size: yup
        .number()
        .optional()
        .positive('Land size must be a positive number')
        .max(100000, 'Land size seems unreasonably large'),
});

/**
 * Validator utility functions
 */

/**
 * Validates phone number in E.164 format
 * @param phoneNumber - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    return phoneRegex.test(phoneNumber);
}

/**
 * Validates password strength
 * @param password - Password to validate
 * @returns Object with validation result and strength score
 */
export function validatePasswordStrength(password: string): {
    isValid: boolean;
    strength: 'weak' | 'medium' | 'strong';
    score: number;
    feedback: string[];
} {
    const feedback: string[] = [];
    let score = 0;

    // Check length
    if (password.length >= 8) {
        score += 1;
    } else {
        feedback.push('Password must be at least 8 characters');
    }

    // Check for uppercase
    if (/[A-Z]/.test(password)) {
        score += 1;
    } else {
        feedback.push('Add at least one uppercase letter');
    }

    // Check for lowercase
    if (/[a-z]/.test(password)) {
        score += 1;
    } else {
        feedback.push('Add at least one lowercase letter');
    }

    // Check for numbers
    if (/[0-9]/.test(password)) {
        score += 1;
    } else {
        feedback.push('Add at least one number');
    }

    // Check for special characters (bonus)
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        score += 1;
    }

    // Determine strength
    let strength: 'weak' | 'medium' | 'strong';
    if (score <= 2) {
        strength = 'weak';
    } else if (score <= 3) {
        strength = 'medium';
    } else {
        strength = 'strong';
    }

    const isValid = score >= 4; // Minimum requirements met

    return {
        isValid,
        strength,
        score,
        feedback,
    };
}

/**
 * Validates email format
 * @param email - Email to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Sanitizes string input by trimming whitespace
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
    return input.trim();
}

/**
 * Validates that a value is not empty
 * @param value - Value to check
 * @returns true if not empty, false otherwise
 */
export function isNotEmpty(value: unknown): boolean {
    if (value === null || value === undefined) {
        return false;
    }
    if (typeof value === 'string') {
        return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
        return value.length > 0;
    }
    return true;
}

/**
 * Validates numeric input within a range
 * @param value - Number to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns true if within range, false otherwise
 */
export function isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
}

/**
 * Type guard for checking if error is a Yup validation error
 * @param error - Error to check
 * @returns true if Yup validation error
 */
export function isYupValidationError(error: unknown): error is yup.ValidationError {
    return error instanceof yup.ValidationError;
}

/**
 * Extracts field-specific errors from Yup validation error
 * @param error - Yup validation error
 * @returns Object mapping field names to error messages
 */
export function extractValidationErrors(error: yup.ValidationError): Record<string, string> {
    const errors: Record<string, string> = {};

    if (error.inner && error.inner.length > 0) {
        error.inner.forEach((err) => {
            if (err.path) {
                errors[err.path] = err.message;
            }
        });
    } else if (error.path) {
        errors[error.path] = error.message;
    }

    return errors;
}
