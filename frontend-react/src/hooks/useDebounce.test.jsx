import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    it('should return initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('initial', 500));

        expect(result.current).toBe('initial');
    });

    it('should debounce value changes with default delay', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: 'initial' } }
        );

        expect(result.current).toBe('initial');

        // Update the value
        rerender({ value: 'updated' });

        // Value should not change immediately
        expect(result.current).toBe('initial');

        // Fast-forward time by 500ms
        act(() => {
            vi.advanceTimersByTime(500);
        });

        // Value should now be updated
        expect(result.current).toBe('updated');
    });

    it('should debounce value changes with custom delay', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 1000),
            { initialProps: { value: 'initial' } }
        );

        expect(result.current).toBe('initial');

        // Update the value
        rerender({ value: 'updated' });

        // Value should not change after 500ms
        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(result.current).toBe('initial');

        // Value should change after 1000ms total
        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(result.current).toBe('updated');
    });

    it('should cancel previous timeout when value changes rapidly', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: 'initial' } }
        );

        // Rapid value changes
        rerender({ value: 'first' });
        act(() => {
            vi.advanceTimersByTime(200);
        });

        rerender({ value: 'second' });
        act(() => {
            vi.advanceTimersByTime(200);
        });

        rerender({ value: 'third' });
        act(() => {
            vi.advanceTimersByTime(200);
        });

        // Still should be initial value
        expect(result.current).toBe('initial');

        // Complete the delay for the last value
        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(result.current).toBe('third');
    });

    it('should handle multiple rapid changes and only apply the last one', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: 'initial' } }
        );

        // Simulate typing in a search input
        rerender({ value: 'a' });
        act(() => {
            vi.advanceTimersByTime(100);
        });

        rerender({ value: 'ab' });
        act(() => {
            vi.advanceTimersByTime(100);
        });

        rerender({ value: 'abc' });
        act(() => {
            vi.advanceTimersByTime(100);
        });

        rerender({ value: 'abcd' });
        act(() => {
            vi.advanceTimersByTime(100);
        });

        rerender({ value: 'abcde' });

        // Should still be initial
        expect(result.current).toBe('initial');

        // Complete the delay
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current).toBe('abcde');
    });

    it('should handle numeric values', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: 0 } }
        );

        expect(result.current).toBe(0);

        rerender({ value: 42 });
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current).toBe(42);
    });

    it('should handle boolean values', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: false } }
        );

        expect(result.current).toBe(false);

        rerender({ value: true });
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current).toBe(true);
    });

    it('should handle object values', () => {
        const initialObj = { name: 'John', age: 30 };
        const updatedObj = { name: 'Jane', age: 25 };

        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: initialObj } }
        );

        expect(result.current).toEqual(initialObj);

        rerender({ value: updatedObj });
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current).toEqual(updatedObj);
    });

    it('should handle array values', () => {
        const initialArray = [1, 2, 3];
        const updatedArray = [4, 5, 6];

        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: initialArray } }
        );

        expect(result.current).toEqual(initialArray);

        rerender({ value: updatedArray });
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current).toEqual(updatedArray);
    });

    it('should handle null and undefined values', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: null } }
        );

        expect(result.current).toBeNull();

        rerender({ value: undefined });
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current).toBeUndefined();
    });

    it('should update when delay changes', () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'initial', delay: 500 } }
        );

        rerender({ value: 'updated', delay: 1000 });

        // Should not update after 500ms
        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(result.current).toBe('initial');

        // Should update after 1000ms
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current).toBe('updated');
    });

    it('should cleanup timeout on unmount', () => {
        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

        const { unmount } = renderHook(() => useDebounce('test', 500));

        unmount();

        expect(clearTimeoutSpy).toHaveBeenCalled();
    });
});
