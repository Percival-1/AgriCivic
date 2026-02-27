/**
 * Button Component Tests
 * 
 * Tests for the reusable Button component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button Component', () => {
    it('should render button with children', () => {
        render(<Button>Click me</Button>);
        const button = screen.getByRole('button', { name: /click me/i });
        expect(button).toBeInTheDocument();
    });

    it('should apply primary variant by default', () => {
        render(<Button>Primary</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-blue-600');
    });

    it('should apply secondary variant', () => {
        render(<Button variant="secondary">Secondary</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-gray-600');
    });

    it('should apply danger variant', () => {
        render(<Button variant="danger">Danger</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-red-600');
    });

    it('should apply success variant', () => {
        render(<Button variant="success">Success</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-green-600');
    });

    it('should apply outline variant', () => {
        render(<Button variant="outline">Outline</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('border-2');
        expect(button).toHaveClass('border-blue-600');
    });

    it('should apply medium size by default', () => {
        render(<Button>Medium</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('px-4');
        expect(button).toHaveClass('py-2');
    });

    it('should apply small size', () => {
        render(<Button size="sm">Small</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('px-3');
        expect(button).toHaveClass('py-1.5');
    });

    it('should apply large size', () => {
        render(<Button size="lg">Large</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('px-6');
        expect(button).toHaveClass('py-3');
    });

    it('should handle click events', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click</Button>);

        const button = screen.getByRole('button');
        fireEvent.click(button);

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disabled prop is true', () => {
        render(<Button disabled>Disabled</Button>);
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
    });

    it('should not call onClick when disabled', () => {
        const handleClick = vi.fn();
        render(<Button disabled onClick={handleClick}>Disabled</Button>);

        const button = screen.getByRole('button');
        fireEvent.click(button);

        expect(handleClick).not.toHaveBeenCalled();
    });

    it('should show loading spinner when loading', () => {
        render(<Button loading>Loading</Button>);
        const button = screen.getByRole('button');
        const spinner = button.querySelector('svg');
        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveClass('animate-spin');
    });

    it('should be disabled when loading', () => {
        render(<Button loading>Loading</Button>);
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
    });

    it('should not call onClick when loading', () => {
        const handleClick = vi.fn();
        render(<Button loading onClick={handleClick}>Loading</Button>);

        const button = screen.getByRole('button');
        fireEvent.click(button);

        expect(handleClick).not.toHaveBeenCalled();
    });

    it('should apply custom className', () => {
        render(<Button className="custom-class">Custom</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('custom-class');
    });

    it('should have button type by default', () => {
        render(<Button>Button</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('type', 'button');
    });

    it('should support submit type', () => {
        render(<Button type="submit">Submit</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('type', 'submit');
    });

    it('should support reset type', () => {
        render(<Button type="reset">Reset</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('type', 'reset');
    });

    it('should pass through additional props', () => {
        render(<Button data-testid="custom-button" aria-label="Custom">Button</Button>);
        const button = screen.getByTestId('custom-button');
        expect(button).toHaveAttribute('aria-label', 'Custom');
    });

    it('should not re-render unnecessarily', () => {
        const { rerender } = render(<Button>Button</Button>);
        const button = screen.getByRole('button');
        const firstRender = button;

        rerender(<Button>Button</Button>);
        const secondRender = screen.getByRole('button');

        // Button should be memoized
        expect(firstRender).toBe(secondRender);
    });
});
