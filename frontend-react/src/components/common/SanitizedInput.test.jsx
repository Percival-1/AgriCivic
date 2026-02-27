/**
 * SanitizedInput Component Tests
 * 
 * Tests for the SanitizedInput component
 * Requirements: 18.1-18.6
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SanitizedInput from './SanitizedInput';

describe('SanitizedInput Component', () => {
    it('should render input element', () => {
        render(<SanitizedInput placeholder="Enter text" />);
        const input = screen.getByPlaceholderText('Enter text');
        expect(input).toBeInTheDocument();
    });

    it('should sanitize input on change', () => {
        const handleChange = vi.fn();
        render(<SanitizedInput onChange={handleChange} />);

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: '<script>alert("xss")</script>' } });

        expect(handleChange).toHaveBeenCalled();
        const event = handleChange.mock.calls[0][0];
        expect(event.target.value).not.toContain('<script>');
    });

    it('should sanitize input on blur', () => {
        const handleBlur = vi.fn();
        render(<SanitizedInput onBlur={handleBlur} />);

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: '<img src=x onerror=alert(1)>' } });
        fireEvent.blur(input);

        expect(handleBlur).toHaveBeenCalled();
        const event = handleBlur.mock.calls[0][0];
        expect(event.target.value).not.toContain('<img');
    });

    it('should allow disabling sanitization', () => {
        const handleChange = vi.fn();
        render(<SanitizedInput onChange={handleChange} sanitize={false} />);

        const input = screen.getByRole('textbox');
        const dangerousValue = '<script>alert("xss")</script>';
        fireEvent.change(input, { target: { value: dangerousValue } });

        expect(handleChange).toHaveBeenCalled();
        const event = handleChange.mock.calls[0][0];
        expect(event.target.value).toBe(dangerousValue);
    });

    it('should pass through other props', () => {
        render(
            <SanitizedInput
                type="email"
                placeholder="Email"
                className="custom-class"
                disabled
            />
        );

        const input = screen.getByPlaceholderText('Email');
        expect(input).toHaveAttribute('type', 'email');
        expect(input).toHaveClass('custom-class');
        expect(input).toBeDisabled();
    });

    it('should handle controlled input', () => {
        const { rerender } = render(<SanitizedInput value="initial" onChange={vi.fn()} />);
        const input = screen.getByRole('textbox');
        expect(input).toHaveValue('initial');

        rerender(<SanitizedInput value="updated" onChange={vi.fn()} />);
        expect(input).toHaveValue('updated');
    });

    it('should forward ref', () => {
        const ref = { current: null };
        render(<SanitizedInput ref={ref} />);
        expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('should handle special characters', () => {
        const handleChange = vi.fn();
        render(<SanitizedInput onChange={handleChange} />);

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'Tom & Jerry "quotes"' } });

        expect(handleChange).toHaveBeenCalled();
        const event = handleChange.mock.calls[0][0];
        expect(event.target.value).toContain('&amp;');
        expect(event.target.value).toContain('&quot;');
    });
});
