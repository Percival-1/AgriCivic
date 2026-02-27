/**
 * Pre-configured Redux hooks for use throughout the application
 * 
 * These hooks are typed versions of the standard useDispatch and useSelector hooks
 * that work with our store's specific types.
 * 
 * Usage:
 * import { useAppDispatch, useAppSelector } from '../store/hooks';
 * 
 * const dispatch = useAppDispatch();
 * const user = useAppSelector((state) => state.user);
 */

import { useDispatch, useSelector } from 'react-redux';

/**
 * Use throughout your app instead of plain `useDispatch`
 * This ensures the dispatch function is properly typed
 */
export const useAppDispatch = () => useDispatch();

/**
 * Use throughout your app instead of plain `useSelector`
 * This ensures the selector function receives the correct state type
 */
export const useAppSelector = useSelector;

/**
 * Helper hook to get both dispatch and selector in one call
 * Useful for components that need both
 * 
 * @example
 * const { dispatch, select } = useRedux();
 * const user = select((state) => state.user);
 * dispatch(someAction());
 */
export const useRedux = () => ({
    dispatch: useAppDispatch(),
    select: useAppSelector,
});
