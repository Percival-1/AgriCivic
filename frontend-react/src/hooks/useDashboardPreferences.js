import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    selectDashboardPreferences,
    selectDashboardWidgets,
    selectDashboardLayout,
    selectShowWelcome,
    setDashboardPreferences,
    setDashboardWidgets,
    setDashboardLayout,
    toggleWelcomeMessage,
} from '../store/slices/userSlice';

/**
 * Custom hook for managing dashboard preferences
 * 
 * Provides:
 * - Dashboard preferences state
 * - Functions to update preferences
 * - Automatic persistence to localStorage
 * 
 * Requirements: 20.7
 */
export const useDashboardPreferences = () => {
    const dispatch = useDispatch();

    // Select dashboard preferences from Redux store
    const dashboardPreferences = useSelector(selectDashboardPreferences);
    const widgets = useSelector(selectDashboardWidgets);
    const layout = useSelector(selectDashboardLayout);
    const showWelcome = useSelector(selectShowWelcome);

    /**
     * Update all dashboard preferences
     * Requirement 20.7: Save dashboard preferences to localStorage
     */
    const updatePreferences = useCallback((preferences) => {
        dispatch(setDashboardPreferences(preferences));
    }, [dispatch]);

    /**
     * Update dashboard widgets
     * Requirement 20.7: Persist dashboard preferences
     */
    const updateWidgets = useCallback((newWidgets) => {
        dispatch(setDashboardWidgets(newWidgets));
    }, [dispatch]);

    /**
     * Add a widget to dashboard
     */
    const addWidget = useCallback((widgetName) => {
        if (!widgets.includes(widgetName)) {
            dispatch(setDashboardWidgets([...widgets, widgetName]));
        }
    }, [dispatch, widgets]);

    /**
     * Remove a widget from dashboard
     */
    const removeWidget = useCallback((widgetName) => {
        dispatch(setDashboardWidgets(widgets.filter(w => w !== widgetName)));
    }, [dispatch, widgets]);

    /**
     * Update dashboard layout
     * Requirement 20.7: Restore preferences on load
     */
    const updateLayout = useCallback((newLayout) => {
        dispatch(setDashboardLayout(newLayout));
    }, [dispatch]);

    /**
     * Toggle welcome message visibility
     */
    const toggleWelcome = useCallback(() => {
        dispatch(toggleWelcomeMessage());
    }, [dispatch]);

    /**
     * Reset dashboard preferences to defaults
     */
    const resetPreferences = useCallback(() => {
        const defaultPreferences = {
            widgets: ['weather', 'market', 'schemes', 'notifications'],
            layout: 'grid',
            showWelcome: true,
        };
        dispatch(setDashboardPreferences(defaultPreferences));
    }, [dispatch]);

    /**
     * Check if a widget is enabled
     */
    const isWidgetEnabled = useCallback((widgetName) => {
        return widgets.includes(widgetName);
    }, [widgets]);

    /**
     * Reorder widgets
     */
    const reorderWidgets = useCallback((startIndex, endIndex) => {
        const result = Array.from(widgets);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        dispatch(setDashboardWidgets(result));
    }, [dispatch, widgets]);

    return {
        // State
        dashboardPreferences,
        widgets,
        layout,
        showWelcome,

        // Functions
        updatePreferences,
        updateWidgets,
        addWidget,
        removeWidget,
        updateLayout,
        toggleWelcome,
        resetPreferences,
        isWidgetEnabled,
        reorderWidgets,

        // Available widgets
        availableWidgets: ['weather', 'market', 'schemes', 'notifications'],
        availableLayouts: ['grid', 'list'],
    };
};

export default useDashboardPreferences;
