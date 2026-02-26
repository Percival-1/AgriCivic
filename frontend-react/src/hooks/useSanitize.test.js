/**
 * useSanitize Hook Tests
 * 
 * Tests for the useSanitize custom hook
 * Requirements: 18.1-18.6
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSanitize } from './useSanitize';

describe('useSanitize Hook', () => {
    it('should provide sanitization functions', () => {
        const { result } = renderHook(() => useSanitize());

        expect(result.current.sanitizeText).toBeDefined();
        expect(result.current.sanitizeHtml).toBeDefined();
        expect(result.current.sanitizeUrl).toBeDefined();
        expect(result.current.sanitizeFormData).toBeDefined();
        expect(result.current.sanitizeFile).toBeDefined();
    });

    it('should sanitize text input', () => {
        const { result } = renderHook(() => useSanitize());
        const input = '<script>alert("xss")</script>';
        const sanitized = result.current.sanitizeText(input);

        expect(sanitized).not.toContain('<script>');
    });

    it('should sanitize HTML', () => {
        const { result } = renderHook(() => useSanitize());
        const html = '<p>Hello <script>alert("xss")</script></p>';
        const sanitized = result.current.sanitizeHtml(html);

        expect(sanitized).not.toContain('<script>');
    });

    it('should sanitize HTML with allowed tags', () => {
        const { result } = renderHook(() => useSanitize());
        const html = '<p>Hello <strong>World</strong></p>';
        const sanitized = result.current.sanitizeHtml(html, ['p', 'strong']);

        expect(sanitized).toContain('<p>');
        expect(sanitized).toContain('<strong>');
    });

    it('should sanitize URLs', () => {
        const { result } = renderHook(() => useSanitize());
        const dangerousUrl = 'javascript:alert("xss")';
        const sanitized = result.current.sanitizeUrl(dangerousUrl);

        expect(sanitized).toBe('');
    });

    it('should sanitize form data', () => {
        const { result } = renderHook(() => useSanitize());
        const formData = {
            name: '<script>xss</script>',
            email: 'test@example.com',
        };
        const sanitized = result.current.sanitizeFormData(formData);

        expect(sanitized.name).not.toContain('<script>');
        expect(sanitized.email).toBe('test@example.com');
    });

    it('should sanitize filenames', () => {
        const { result } = renderHook(() => useSanitize());
        const filename = '../../../etc/passwd';
        const sanitized = result.current.sanitizeFile(filename);

        expect(sanitized).not.toContain('/');
        expect(sanitized).not.toContain('..');
    });

    it('should maintain stable function references', () => {
        const { result, rerender } = renderHook(() => useSanitize());
        const firstRender = result.current;

        rerender();

        expect(result.current.sanitizeText).toBe(firstRender.sanitizeText);
        expect(result.current.sanitizeHtml).toBe(firstRender.sanitizeHtml);
        expect(result.current.sanitizeUrl).toBe(firstRender.sanitizeUrl);
    });
});
