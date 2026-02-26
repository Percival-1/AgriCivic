/**
 * SanitizedTextarea Component Tests
 * 
 * Tests for the SanitizedTextarea component
 * Requirements: 18.1-18.6
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SanitizedTextarea from './SanitizedTextarea';

describe('SanitizedTextarea Component', () => {
    it('should render textarea element', () => {
        render(<SanitizedTextarea placeholder="Enter description" />);
        const textarea = screen.getByPlaceholderText('Enter description');
        expect(textarea).toBeInTheDocument();
        expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('should sanitize input on change', () => {
        const handleChange = vi.fn();
        render(<SanitizedTextarea onChange={handleChange} />);

        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: '<script>alert("xss")</script>' } });

        expect(handleChange).toHaveBeenCalled();
        const event = handleChange.mock.calls[0][0];
        expect(event.target.value).not.toContain('<script>');
    });

    it('should sanitize input on blur', () => {
        const handleBlur = vi.fn();
        render(<SanitizedTextarea onBlur={handleBlur} />);

        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: '<img src=x onerror=alert(1)>' } });
        fireEvent.blur(textarea);

        expect(handleBlur).toHaveBeenCalled();
        const event = handleBlur.mock.calls[0][0];
        expect(event.target.value).not.toContain('<img');
    });

    it('should allow disabling sanitization', () => {
        const handleChange = vi.fn();
        render(<SanitizedTextarea onChange={handleChange} sanitize={false} />);

        const textarea = screen.getByRole('textbox');
        const dangerousValue = '<script>alert("xss")</script>';
        fireEvent.change(textarea, { target: { value: dangerousValue } });

        expect(handleChange).toHaveBeenCalled();
        const event = handleChange.mock.calls[0][0];
        expect(event.target.value).toBe(dangerousValue);
    });

    it('should pass through other props', () => {
        render(
            <SanitizedTextarea
                placeholder="Description"
                className="custom-class"
                rows={5}
                disabled
            />
        );

        const textarea = screen.getByPlaceholderText('Description');
        expect(textarea).toHaveClass('custom-class');
        expect(textarea).toHaveAttribute('rows', '5');
        expect(textarea).toBeDisabled();
    });

    it('should handle controlled textarea', () => {
        const { rerender } = render(<SanitizedTextarea value="initial" onChange={vi.fn()} />);
        const textarea = screen.getByRole('textbox');
        expect(textarea).toHaveValue('initial');

        rerender(<SanitizedTextarea value="updated" onChange={vi.fn()} />);
        expect(textarea).toHaveValue('updated');
    });

    it('should forward ref', () => {
        const ref = { current: null };
        render(<SanitizedTextarea ref={ref} />);
        expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });

    it('should handle multiline input', () => {
        const handleChange = vi.fn();
        render(<SanitizedTextarea onChange={handleChange} />);

        const textarea = screen.getByRole('textbox');
        const multilineValue = 'Line 1\n<script>xss</script>\nLine 3';
        fireEvent.change(textarea, { target: { value: multilineValue } });

        expect(handleChange).toHaveBeenCalled();
        const event = handleChange.mock.calls[0][0];
        expect(event.target.value).not.toContain('<script>');
        expect(event.target.value).toContain('Line 1');
        expect(event.target.value).toContain('Line 3');
    });
});
