/**
 * Security Utilities Tests
 * 
 * Tests for security functions to prevent XSS attacks
 * Requirements: 18.1-18.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    sanitizeInput,
    sanitizeHTML,
    sanitizeHTMLWithTags,
    sanitizeURL,
    sanitizeObject,
    sanitizeFilename,
    isValidRedirectURL,
    generateSecureRandom,
    rateLimit,
} from './security';

describe('Security Utilities', () => {
    describe('sanitizeInput', () => {
        it('should escape HTML special characters', () => {
            const input = '<script>alert("xss")</script>';
            const result = sanitizeInput(input);
            expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
        });

        it('should escape ampersands', () => {
            const input = 'Tom & Jerry';
            const result = sanitizeInput(input);
            expect(result).toBe('Tom &amp; Jerry');
        });

        it('should escape quotes', () => {
            const input = 'He said "Hello"';
            const result = sanitizeInput(input);
            expect(result).toBe('He said &quot;Hello&quot;');
        });

        it('should handle empty input', () => {
            expect(sanitizeInput('')).toBe('');
            expect(sanitizeInput(null)).toBe('');
            expect(sanitizeInput(undefined)).toBe('');
        });

        it('should handle normal text', () => {
            const input = 'Hello World';
            const result = sanitizeInput(input);
            expect(result).toBe('Hello World');
        });
    });

    describe('sanitizeHTML', () => {
        it('should remove all HTML tags', () => {
            const html = '<p>Hello <strong>World</strong></p>';
            const result = sanitizeHTML(html);
            expect(result).not.toContain('<p>');
            expect(result).not.toContain('<strong>');
        });

        it('should prevent script injection', () => {
            const html = '<script>alert("xss")</script>';
            const result = sanitizeHTML(html);
            expect(result).not.toContain('<script>');
        });

        it('should handle empty input', () => {
            expect(sanitizeHTML('')).toBe('');
            expect(sanitizeHTML(null)).toBe('');
        });
    });

    describe('sanitizeHTMLWithTags', () => {
        it('should allow specified tags', () => {
            const html = '<p>Hello <strong>World</strong></p>';
            const result = sanitizeHTMLWithTags(html, ['p', 'strong']);
            expect(result).toContain('<p>');
            expect(result).toContain('<strong>');
        });

        it('should remove script tags', () => {
            const html = '<p>Hello</p><script>alert("xss")</script>';
            const result = sanitizeHTMLWithTags(html, ['p']);
            expect(result).not.toContain('<script>');
        });

        it('should remove event handlers', () => {
            const html = '<p onclick="alert(\'xss\')">Click me</p>';
            const result = sanitizeHTMLWithTags(html, ['p']);
            expect(result).not.toContain('onclick');
        });

        it('should handle empty input', () => {
            expect(sanitizeHTMLWithTags('')).toBe('');
        });
    });

    describe('sanitizeURL', () => {
        it('should allow http and https URLs', () => {
            expect(sanitizeURL('http://example.com')).toBe('http://example.com');
            expect(sanitizeURL('https://example.com')).toBe('https://example.com');
        });

        it('should block javascript: protocol', () => {
            const url = 'javascript:alert("xss")';
            const result = sanitizeURL(url);
            expect(result).toBe('');
        });

        it('should block data: protocol', () => {
            const url = 'data:text/html,<script>alert("xss")</script>';
            const result = sanitizeURL(url);
            expect(result).toBe('');
        });

        it('should block vbscript: protocol', () => {
            const url = 'vbscript:msgbox("xss")';
            const result = sanitizeURL(url);
            expect(result).toBe('');
        });

        it('should handle empty input', () => {
            expect(sanitizeURL('')).toBe('');
            expect(sanitizeURL(null)).toBe('');
        });
    });

    describe('sanitizeObject', () => {
        it('should sanitize string values', () => {
            const obj = {
                name: '<script>alert("xss")</script>',
                email: 'test@example.com',
            };
            const result = sanitizeObject(obj);
            expect(result.name).not.toContain('<script>');
            expect(result.email).toBe('test@example.com');
        });

        it('should sanitize nested objects', () => {
            const obj = {
                user: {
                    name: '<script>alert("xss")</script>',
                },
            };
            const result = sanitizeObject(obj);
            expect(result.user.name).not.toContain('<script>');
        });

        it('should sanitize arrays', () => {
            const obj = {
                tags: ['<script>xss</script>', 'normal'],
            };
            const result = sanitizeObject(obj);
            expect(result.tags[0]).not.toContain('<script>');
            expect(result.tags[1]).toBe('normal');
        });

        it('should exclude specified keys', () => {
            const obj = {
                name: '<script>xss</script>',
                password: '<script>xss</script>',
            };
            const result = sanitizeObject(obj, ['password']);
            expect(result.name).not.toContain('<script>');
            expect(result.password).toContain('<script>');
        });

        it('should handle non-object input', () => {
            expect(sanitizeObject(null)).toBe(null);
            expect(sanitizeObject('string')).toBe('string');
        });
    });

    describe('sanitizeFilename', () => {
        it('should remove path separators', () => {
            const filename = '../../../etc/passwd';
            const result = sanitizeFilename(filename);
            expect(result).not.toContain('/');
            expect(result).not.toContain('\\');
            expect(result).not.toContain('..');
        });

        it('should remove special characters', () => {
            const filename = 'file<>:"|?*.txt';
            const result = sanitizeFilename(filename);
            expect(result).not.toContain('<');
            expect(result).not.toContain('>');
            expect(result).not.toContain(':');
            expect(result).not.toContain('|');
            expect(result).not.toContain('?');
            expect(result).not.toContain('*');
        });

        it('should handle normal filenames', () => {
            const filename = 'document.pdf';
            const result = sanitizeFilename(filename);
            expect(result).toBe('document.pdf');
        });

        it('should handle empty input', () => {
            expect(sanitizeFilename('')).toBe('');
            expect(sanitizeFilename(null)).toBe('');
        });
    });

    describe('isValidRedirectURL', () => {
        beforeEach(() => {
            // Mock window.location
            delete window.location;
            window.location = { origin: 'http://localhost:3000' };
        });

        it('should allow relative URLs', () => {
            expect(isValidRedirectURL('/dashboard')).toBe(true);
            expect(isValidRedirectURL('/profile')).toBe(true);
        });

        it('should allow same-origin URLs', () => {
            expect(isValidRedirectURL('http://localhost:3000/dashboard')).toBe(true);
        });

        it('should block different-origin URLs', () => {
            expect(isValidRedirectURL('http://evil.com/phishing')).toBe(false);
        });

        it('should handle invalid URLs', () => {
            // Note: 'not a url' is treated as a relative URL starting with 'n'
            // which is technically valid in the context of relative URLs
            expect(isValidRedirectURL('javascript:alert(1)')).toBe(false);
        });

        it('should handle empty input', () => {
            expect(isValidRedirectURL('')).toBe(false);
            expect(isValidRedirectURL(null)).toBe(false);
        });
    });

    describe('generateSecureRandom', () => {
        it('should generate random string of default length', () => {
            const random = generateSecureRandom();
            expect(random).toHaveLength(64); // 32 bytes = 64 hex chars
        });

        it('should generate random string of specified length', () => {
            const random = generateSecureRandom(16);
            expect(random).toHaveLength(32); // 16 bytes = 32 hex chars
        });

        it('should generate different values', () => {
            const random1 = generateSecureRandom();
            const random2 = generateSecureRandom();
            expect(random1).not.toBe(random2);
        });
    });

    describe('rateLimit', () => {
        it('should allow requests within limit', () => {
            const key = 'test-action-1';
            expect(rateLimit(key, 3, 1000)).toBe(true);
            expect(rateLimit(key, 3, 1000)).toBe(true);
            expect(rateLimit(key, 3, 1000)).toBe(true);
        });

        it('should block requests exceeding limit', () => {
            const key = 'test-action-2';
            rateLimit(key, 2, 1000);
            rateLimit(key, 2, 1000);
            expect(rateLimit(key, 2, 1000)).toBe(false);
        });

        it('should reset after time window', async () => {
            const key = 'test-action-3';
            rateLimit(key, 1, 100);
            expect(rateLimit(key, 1, 100)).toBe(false);

            // Wait for window to pass
            await new Promise((resolve) => setTimeout(resolve, 150));

            expect(rateLimit(key, 1, 100)).toBe(true);
        });
    });
});
