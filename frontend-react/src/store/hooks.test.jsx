import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from './index';
import { useAppDispatch, useAppSelector, useRedux } from './hooks';

// Wrapper component for testing hooks with Redux
const wrapper = ({ children }) => (
    <Provider store={store}>{children}</Provider>
);

describe('Redux Hooks', () => {
    describe('useAppDispatch', () => {
        it('should return dispatch function', () => {
            const { result } = renderHook(() => useAppDispatch(), { wrapper });

            expect(result.current).toBeDefined();
            expect(typeof result.current).toBe('function');
        });

        it('should allow dispatching actions', () => {
            const { result } = renderHook(() => useAppDispatch(), { wrapper });

            const testAction = { type: 'TEST_ACTION', payload: 'test' };
            expect(() => result.current(testAction)).not.toThrow();
        });
    });

    describe('useAppSelector', () => {
        it('should return selected state', () => {
            const { result } = renderHook(
                () => useAppSelector((state) => state),
                { wrapper }
            );

            expect(result.current).toBeDefined();
            expect(typeof result.current).toBe('object');
        });

        it('should select specific state slice', () => {
            const { result } = renderHook(
                () => useAppSelector((state) => state),
                { wrapper }
            );

            // Since we have an empty reducer, state should be an empty object
            expect(result.current).toEqual({});
        });
    });

    describe('useRedux', () => {
        it('should return both dispatch and select', () => {
            const { result } = renderHook(() => useRedux(), { wrapper });

            expect(result.current).toHaveProperty('dispatch');
            expect(result.current).toHaveProperty('select');
            expect(typeof result.current.dispatch).toBe('function');
            expect(typeof result.current.select).toBe('function');
        });

        it('should allow using dispatch and select together', () => {
            const { result } = renderHook(() => {
                const { dispatch, select } = useRedux();
                const state = select((state) => state);
                return { dispatch, state };
            }, { wrapper });

            const { dispatch, state } = result.current;

            // Test dispatch
            const testAction = { type: 'TEST_ACTION' };
            expect(() => dispatch(testAction)).not.toThrow();

            // Test state
            expect(state).toBeDefined();
        });
    });
});
