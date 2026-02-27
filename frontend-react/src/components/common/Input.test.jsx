/**
 * Input Component Tests
 * 
 * Tests for the reusable Input component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from './Input';

describe('Input Component', () => {
    it('should render input field', () => {
        render(<Input placeholder="Enter text" />);
        const input = screen.getByPlaceholderText('Enter text');
        expect(input).toBeInTheDocument();
    });

    it('should render with label', () => {
        render(<Input label="Username" />);
        const label = screen.getByText('Username');
        expect(label).toBeInTheDocument();
    });

    it('should show required indicator', () => {
        render(<Input label="Email" required />);
        const asterisk = screen.getByText('*');
        expect(asterisk).toBeInTheDocument();
        expect(asterisk).toHaveClass('text-red-500');
    });

    it('should display error message', () => {
        render(<Input error="This field is required" />);
        const error = screen.getByText('This field is required');
        expect(error).toBeInTheDocument();
        expect(error).toHaveClass('text-red-600');
    });

    it('should apply error styling to input', () => {
        render(<Input error="Error" />);
        const input = screen.getByRole('textbox');
        expect(input).toHaveClass('border-red-500');
    });

    it('should display helper text', () => {
        render(<Input helperText="Enter your email address" />);
        const helper = screen.getByText('Enter your email address');
        expect(helper).toBeInTheDocument();
        expect(helper).toHaveClass('text-gray-500');
    });

    it('should not show helper text when error is present', () => {
        render(<Input helperText="Helper" error="Error" />);
        expect(screen.queryByText('Helper')).not.toBeInTheDocument();
        expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should handle different input types', () => {
        const { rerender } = render(<Input type="email" />);
        let input = screen.getByRole('textbox');
        expect(input).toHaveAttribute('type', 'email');

        rerender(<Input type="password" />);
        input = document.querySelector('input[type="password"]');
        expect(input).toHaveAttribute('type', 'password');

        rerender(<Input type="number" />);
        input = screen.getByRole('spinbutton');
        expect(input).toHaveAttribute('type', 'number');
    });

    it('should be disabled when disabled prop is true', () => {
        render(<Input disabled />);
        const input = screen.getByRole('textbox');
        expect(input).toBeDisabled();
        expect(input).toHaveClass('disabled:bg-gray-100');
    });

    it('should handle onChange events', () => {
        const handleChange = vi.fn();
        render(<Input onChange={handleChange} />);

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'test' } });

        expect(handleChange).toHaveBeenCalled();
    });

    it('should handle controlled input', () => {
        const { rerender } = render(<Input value="initial" onChange={vi.fn()} />);
        const input = screen.getByRole('textbox');
        expect(input).toHaveValue('initial');

        rerender(<Input value="updated" onChange={vi.fn()} />);
        expect(input).toHaveValue('updated');
    });

    it('should forward ref', () => {
        const ref = { current: null };
        render(<Input ref={ref} />);
        expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('should apply custom className', () => {
        render(<Input className="custom-class" />);
        const input = screen.getByRole('textbox');
        expect(input).toHaveClass('custom-class');
    });

    it('should render with icon', () => {
        const icon = <span data-testid="icon">🔍</span>;
        render(<Input icon={icon} />);
        const iconElement = screen.getByTestId('icon');
        expect(iconElement).toBeInTheDocument();
    });

    it('should apply left padding when icon is present', () => {
        const icon = <span>🔍</span>;
        render(<Input icon={icon} />);
        const input = screen.getByRole('textbox');
        expect(input).toHaveClass('pl-10');
    });

    it('should pass through additional props', () => {
        render(<Input data-testid="custom-input" maxLength={10} />);
        const input = screen.getByTestId('custom-input');
        expect(input).toHaveAttribute('maxLength', '10');
    });

    it('should handle placeholder', () => {
        render(<Input placeholder="Search..." />);
        const input = screen.getByPlaceholderText('Search...');
        expect(input).toBeInTheDocument();
    });

    it('should have default text type', () => {
        render(<Input />);
        const input = screen.getByRole('textbox');
        expect(input).toHaveAttribute('type', 'text');
    });
});
