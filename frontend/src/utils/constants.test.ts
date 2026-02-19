import { describe, it, expect } from 'vitest';
import { API_BASE_URL, STORAGE_KEYS, SUPPORTED_LANGUAGES } from './constants';

describe('Constants', () => {
    it('should have correct API_BASE_URL', () => {
        expect(API_BASE_URL).toBeDefined();
        expect(typeof API_BASE_URL).toBe('string');
    });

    it('should have all required storage keys', () => {
        expect(STORAGE_KEYS.TOKEN).toBe('auth_token');
        expect(STORAGE_KEYS.USER).toBe('user_data');
        expect(STORAGE_KEYS.LANGUAGE).toBe('language_preference');
        expect(STORAGE_KEYS.THEME).toBe('theme_preference');
    });

    it('should have at least 10 supported languages', () => {
        expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(10);
    });

    it('should have English as first supported language', () => {
        expect(SUPPORTED_LANGUAGES[0].code).toBe('en');
        expect(SUPPORTED_LANGUAGES[0].name).toBe('English');
    });
});
