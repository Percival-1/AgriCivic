import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
    // Clear localStorage before each test
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('should return initial value when localStorage is empty', () => {
        const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));
        const [value] = result.current;

        expect(value).toBe('initialValue');
    });

    it('should return stored value from localStorage', () => {
        localStorage.setItem('testKey', JSON.stringify('storedValue'));

        const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));
        const [value] = result.current;

        expect(value).toBe('storedValue');
    });

    it('should set value to localStorage', () => {
        const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));

        act(() => {
            const [, setValue] = result.current;
            setValue('newValue');
        });

        const [value] = result.current;
        expect(value).toBe('newValue');
        expect(localStorage.getItem('testKey')).toBe(JSON.stringify('newValue'));
    });

    it('should handle function updates like useState', () => {
        const { result } = renderHook(() => useLocalStorage('testKey', 0));

        act(() => {
            const [, setValue] = result.current;
            setValue((prev) => prev + 1);
        });

        const [value] = result.current;
        expect(value).toBe(1);
    });

    it('should remove value from localStorage', () => {
        localStorage.setItem('testKey', JSON.stringify('storedValue'));

        const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));

        act(() => {
            const [, , removeValue] = result.current;
            removeValue();
        });

        const [value] = result.current;
        expect(value).toBe('initialValue');
        expect(localStorage.getItem('testKey')).toBeNull();
    });

    it('should get current value from localStorage', () => {
        localStorage.setItem('testKey', JSON.stringify('storedValue'));

        const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));
        const [, , , getValue] = result.current;

        expect(getValue()).toBe('storedValue');
    });

    it('should handle complex objects', () => {
        const complexObject = {
            name: 'Test User',
            age: 30,
            preferences: {
                theme: 'dark',
                language: 'en',
            },
        };

        const { result } = renderHook(() => useLocalStorage('testKey', null));

        act(() => {
            const [, setValue] = result.current;
            setValue(complexObject);
        });

        const [value] = result.current;
        expect(value).toEqual(complexObject);
        expect(JSON.parse(localStorage.getItem('testKey'))).toEqual(complexObject);
    });

    it('should handle arrays', () => {
        const testArray = [1, 2, 3, 4, 5];

        const { result } = renderHook(() => useLocalStorage('testKey', []));

        act(() => {
            const [, setValue] = result.current;
            setValue(testArray);
        });

        const [value] = result.current;
        expect(value).toEqual(testArray);
    });

    it('should handle invalid JSON gracefully', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        localStorage.setItem('testKey', 'invalid json {');

        const { result } = renderHook(() => useLocalStorage('testKey', 'fallback'));
        const [value] = result.current;

        expect(value).toBe('fallback');
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });

    it('should sync across multiple hook instances with same key', () => {
        const { result: result1 } = renderHook(() => useLocalStorage('sharedKey', 'initial'));
        const { result: result2 } = renderHook(() => useLocalStorage('sharedKey', 'initial'));

        act(() => {
            const [, setValue] = result1.current;
            setValue('updated');
        });

        // Both hooks should have the updated value
        expect(result1.current[0]).toBe('updated');
        expect(result2.current[0]).toBe('updated');
    });

    it('should handle storage events from other tabs', () => {
        const { result } = renderHook(() => useLocalStorage('testKey', 'initial'));

        // Simulate storage event from another tab
        act(() => {
            const storageEvent = new StorageEvent('storage', {
                key: 'testKey',
                newValue: JSON.stringify('fromOtherTab'),
                oldValue: JSON.stringify('initial'),
            });
            window.dispatchEvent(storageEvent);
        });

        const [value] = result.current;
        expect(value).toBe('fromOtherTab');
    });

    it('should handle null values', () => {
        const { result } = renderHook(() => useLocalStorage('testKey', null));

        act(() => {
            const [, setValue] = result.current;
            setValue(null);
        });

        const [value] = result.current;
        expect(value).toBeNull();
        expect(localStorage.getItem('testKey')).toBe('null');
    });

    it('should handle boolean values', () => {
        const { result } = renderHook(() => useLocalStorage('testKey', false));

        act(() => {
            const [, setValue] = result.current;
            setValue(true);
        });

        const [value] = result.current;
        expect(value).toBe(true);
    });

    it('should handle number values', () => {
        const { result } = renderHook(() => useLocalStorage('testKey', 0));

        act(() => {
            const [, setValue] = result.current;
            setValue(42);
        });

        const [value] = result.current;
        expect(value).toBe(42);
    });
});
