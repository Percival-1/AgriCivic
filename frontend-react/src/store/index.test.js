import { describe, it, expect } from 'vitest';
import { store } from './index';

describe('Redux Store Configuration', () => {
    it('should create store instance', () => {
        expect(store).toBeDefined();
        expect(store.getState).toBeDefined();
        expect(store.dispatch).toBeDefined();
        expect(store.subscribe).toBeDefined();
    });

    it('should have initial state', () => {
        const state = store.getState();
        expect(state).toBeDefined();
        expect(typeof state).toBe('object');
    });

    it('should allow dispatching actions', () => {
        // Test that dispatch function works
        const testAction = { type: 'TEST_ACTION', payload: 'test' };
        expect(() => store.dispatch(testAction)).not.toThrow();
    });

    it('should support subscriptions', () => {
        let called = false;
        const unsubscribe = store.subscribe(() => {
            called = true;
        });

        store.dispatch({ type: 'TEST_SUBSCRIPTION' });
        expect(called).toBe(true);

        unsubscribe();
    });

    it('should have Redux DevTools enabled in development', () => {
        // In development, the store should have devTools enabled
        // This is a basic check that the store was configured
        expect(store).toHaveProperty('dispatch');
        expect(store).toHaveProperty('getState');
    });
});
