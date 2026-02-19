import { describe, it, expect } from 'vitest';
import {
    loginSchema,
    registerSchema,
    profileUpdateSchema,
    isValidPhoneNumber,
    validatePasswordStrength,
    isValidEmail,
    sanitizeString,
    isNotEmpty,
    isInRange,
    isYupValidationError,
    extractValidationErrors,
} from './validation';
import * as yup from 'yup';

describe('loginSchema', () => {
    it('should validate correct login credentials', async () => {
        const validData = {
            phone_number: '+919876543210',
            password: 'Password123',
        };

        await expect(loginSchema.validate(validData)).resolves.toEqual(validData);
    });

    it('should reject missing phone number', async () => {
        const invalidData = {
            password: 'Password123',
        };

        await expect(loginSchema.validate(invalidData)).rejects.toThrow('Phone number is required');
    });

    it('should reject invalid phone number format', async () => {
        const invalidData = {
            phone_number: '123',
            password: 'Password123',
        };

        await expect(loginSchema.validate(invalidData)).rejects.toThrow('Invalid phone number format');
    });

    it('should reject missing password', async () => {
        const invalidData = {
            phone_number: '+919876543210',
        };

        await expect(loginSchema.validate(invalidData)).rejects.toThrow('Password is required');
    });

    it('should reject password shorter than 8 characters', async () => {
        const invalidData = {
            phone_number: '+919876543210',
            password: 'Pass1',
        };

        await expect(loginSchema.validate(invalidData)).rejects.toThrow('Password must be at least 8 characters');
    });
});

describe('registerSchema', () => {
    it('should validate correct registration data', async () => {
        const validData = {
            phone_number: '+919876543210',
            password: 'Password123',
            confirm_password: 'Password123',
            name: 'John Doe',
            terms_accepted: true,
        };

        await expect(registerSchema.validate(validData)).resolves.toMatchObject({
            phone_number: validData.phone_number,
            password: validData.password,
            confirm_password: validData.confirm_password,
            name: validData.name,
            terms_accepted: validData.terms_accepted,
        });
    });

    it('should reject password without uppercase letter', async () => {
        const invalidData = {
            phone_number: '+919876543210',
            password: 'password123',
            confirm_password: 'password123',
            name: 'John Doe',
            terms_accepted: true,
        };

        await expect(registerSchema.validate(invalidData)).rejects.toThrow('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', async () => {
        const invalidData = {
            phone_number: '+919876543210',
            password: 'PASSWORD123',
            confirm_password: 'PASSWORD123',
            name: 'John Doe',
            terms_accepted: true,
        };

        await expect(registerSchema.validate(invalidData)).rejects.toThrow('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', async () => {
        const invalidData = {
            phone_number: '+919876543210',
            password: 'PasswordABC',
            confirm_password: 'PasswordABC',
            name: 'John Doe',
            terms_accepted: true,
        };

        await expect(registerSchema.validate(invalidData)).rejects.toThrow('Password must contain at least one number');
    });

    it('should reject mismatched passwords', async () => {
        const invalidData = {
            phone_number: '+919876543210',
            password: 'Password123',
            confirm_password: 'Password456',
            name: 'John Doe',
            terms_accepted: true,
        };

        await expect(registerSchema.validate(invalidData)).rejects.toThrow('Passwords must match');
    });

    it('should reject name shorter than 2 characters', async () => {
        const invalidData = {
            phone_number: '+919876543210',
            password: 'Password123',
            confirm_password: 'Password123',
            name: 'J',
            terms_accepted: true,
        };

        await expect(registerSchema.validate(invalidData)).rejects.toThrow('Name must be at least 2 characters');
    });

    it('should reject when terms not accepted', async () => {
        const invalidData = {
            phone_number: '+919876543210',
            password: 'Password123',
            confirm_password: 'Password123',
            name: 'John Doe',
            terms_accepted: false,
        };

        await expect(registerSchema.validate(invalidData)).rejects.toThrow('You must accept the terms and conditions');
    });

    it('should accept optional fields', async () => {
        const validData = {
            phone_number: '+919876543210',
            password: 'Password123',
            confirm_password: 'Password123',
            name: 'John Doe',
            preferred_language: 'en',

            terms_accepted: true,
        };

        await expect(registerSchema.validate(validData)).resolves.toMatchObject(validData);
    });
});

describe('profileUpdateSchema', () => {
    it('should validate empty update (all fields optional)', async () => {
        const validData = {};

        await expect(profileUpdateSchema.validate(validData)).resolves.toEqual(validData);
    });

    it('should validate partial update with full_name', async () => {
        const validData = {
            name: 'Jane Doe',
        };

        await expect(profileUpdateSchema.validate(validData)).resolves.toEqual(validData);
    });

    it('should reject full_name shorter than 2 characters', async () => {
        const invalidData = {
            name: 'J',
        };

        await expect(profileUpdateSchema.validate(invalidData)).rejects.toThrow('Name must be at least 2 characters');
    });

    it('should validate crops array', async () => {
        const validData = {
            crops: ['wheat', 'rice', 'corn'],
        };

        await expect(profileUpdateSchema.validate(validData)).resolves.toEqual(validData);
    });

    it('should validate land_size', async () => {
        const validData = {
            land_size: 5.5,
        };

        await expect(profileUpdateSchema.validate(validData)).resolves.toEqual(validData);
    });

    it('should reject negative land_size', async () => {
        const invalidData = {
            land_size: -5,
        };

        await expect(profileUpdateSchema.validate(invalidData)).rejects.toThrow('Land size must be a positive number');
    });

    it('should reject unreasonably large land_size', async () => {
        const invalidData = {
            land_size: 200000,
        };

        await expect(profileUpdateSchema.validate(invalidData)).rejects.toThrow('Land size seems unreasonably large');
    });
});

describe('isValidPhoneNumber', () => {
    it('should validate correct phone numbers', () => {
        expect(isValidPhoneNumber('+919876543210')).toBe(true);
        expect(isValidPhoneNumber('+12025551234')).toBe(true);
        expect(isValidPhoneNumber('919876543210')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
        expect(isValidPhoneNumber('123')).toBe(false);
        expect(isValidPhoneNumber('+0123456789')).toBe(false);
        expect(isValidPhoneNumber('abc')).toBe(false);
        expect(isValidPhoneNumber('')).toBe(false);
    });
});

describe('validatePasswordStrength', () => {
    it('should identify weak passwords', () => {
        const result = validatePasswordStrength('pass');
        expect(result.strength).toBe('weak');
        expect(result.isValid).toBe(false);
        expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should identify medium strength passwords', () => {
        const result = validatePasswordStrength('Pass123');
        expect(result.strength).toBe('medium');
        expect(result.score).toBeGreaterThanOrEqual(3);
    });

    it('should identify strong passwords', () => {
        const result = validatePasswordStrength('Password123!');
        expect(result.strength).toBe('strong');
        expect(result.isValid).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(4);
    });

    it('should provide feedback for missing requirements', () => {
        const result = validatePasswordStrength('password');
        expect(result.feedback).toContain('Add at least one uppercase letter');
        expect(result.feedback).toContain('Add at least one number');
    });
});

describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
        expect(isValidEmail('user@example.com')).toBe(true);
        expect(isValidEmail('test.user@domain.co.in')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
        expect(isValidEmail('invalid')).toBe(false);
        expect(isValidEmail('user@')).toBe(false);
        expect(isValidEmail('@domain.com')).toBe(false);
        expect(isValidEmail('')).toBe(false);
    });
});

describe('sanitizeString', () => {
    it('should trim whitespace from strings', () => {
        expect(sanitizeString('  hello  ')).toBe('hello');
        expect(sanitizeString('\n\ttest\n')).toBe('test');
    });

    it('should handle empty strings', () => {
        expect(sanitizeString('')).toBe('');
        expect(sanitizeString('   ')).toBe('');
    });
});

describe('isNotEmpty', () => {
    it('should return true for non-empty values', () => {
        expect(isNotEmpty('hello')).toBe(true);
        expect(isNotEmpty(['item'])).toBe(true);
        expect(isNotEmpty(123)).toBe(true);
    });

    it('should return false for empty values', () => {
        expect(isNotEmpty('')).toBe(false);
        expect(isNotEmpty('   ')).toBe(false);
        expect(isNotEmpty([])).toBe(false);
        expect(isNotEmpty(null)).toBe(false);
        expect(isNotEmpty(undefined)).toBe(false);
    });
});

describe('isInRange', () => {
    it('should validate numbers within range', () => {
        expect(isInRange(5, 1, 10)).toBe(true);
        expect(isInRange(1, 1, 10)).toBe(true);
        expect(isInRange(10, 1, 10)).toBe(true);
    });

    it('should reject numbers outside range', () => {
        expect(isInRange(0, 1, 10)).toBe(false);
        expect(isInRange(11, 1, 10)).toBe(false);
        expect(isInRange(-5, 1, 10)).toBe(false);
    });
});

describe('isYupValidationError', () => {
    it('should identify Yup validation errors', () => {
        const yupError = new yup.ValidationError('Test error');
        expect(isYupValidationError(yupError)).toBe(true);
    });

    it('should reject non-Yup errors', () => {
        const regularError = new Error('Regular error');
        expect(isYupValidationError(regularError)).toBe(false);
        expect(isYupValidationError(null)).toBe(false);
        expect(isYupValidationError(undefined)).toBe(false);
    });
});

describe('extractValidationErrors', () => {
    it('should extract field errors from Yup validation error', async () => {
        try {
            await loginSchema.validate({ phone_number: '123' }, { abortEarly: false });
        } catch (error) {
            if (isYupValidationError(error)) {
                const errors = extractValidationErrors(error);
                expect(errors).toHaveProperty('password');
                expect(Object.keys(errors).length).toBeGreaterThan(0);
            }
        }
    });

    it('should handle single field error', () => {
        const error = new yup.ValidationError('Test error', 'value', 'testField');
        const errors = extractValidationErrors(error);
        expect(errors).toHaveProperty('testField');
        expect(errors.testField).toBe('Test error');
    });
});

