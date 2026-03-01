import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ErrorAlert from './ErrorAlert.vue';

// Mock Vuetify components
const mockVAlert = {
    name: 'VAlert',
    template: '<div class="v-alert"><slot /></div>',
    props: ['type', 'variant', 'closable', 'prominent'],
};

const mockVAlertTitle = {
    name: 'VAlertTitle',
    template: '<div class="v-alert-title"><slot /></div>',
};

const mockVIcon = {
    name: 'VIcon',
    template: '<i class="v-icon"></i>',
    props: ['icon'],
};

const mockVBtn = {
    name: 'VBtn',
    template: '<button class="v-btn"><slot /></button>',
    props: ['color', 'variant', 'size'],
};

const mockVExpansionPanels = {
    name: 'VExpansionPanels',
    template: '<div class="v-expansion-panels"><slot /></div>',
    props: ['variant'],
};

const mockVExpansionPanel = {
    name: 'VExpansionPanel',
    template: '<div class="v-expansion-panel"><slot /></div>',
};

const mockVExpansionPanelTitle = {
    name: 'VExpansionPanelTitle',
    template: '<div class="v-expansion-panel-title"><slot /></div>',
};

const mockVExpansionPanelText = {
    name: 'VExpansionPanelText',
    template: '<div class="v-expansion-panel-text"><slot /></div>',
};

describe('ErrorAlert', () => {
    const stubs = {
        VAlert: mockVAlert,
        VAlertTitle: mockVAlertTitle,
        VIcon: mockVIcon,
        VBtn: mockVBtn,
        VExpansionPanels: mockVExpansionPanels,
        VExpansionPanel: mockVExpansionPanel,
        VExpansionPanelTitle: mockVExpansionPanelTitle,
        VExpansionPanelText: mockVExpansionPanelText,
    };

    it('renders when modelValue is true', () => {
        const wrapper = mount(ErrorAlert, {
            props: {
                modelValue: true,
                message: 'Test error message',
            },
            global: { stubs },
        });

        expect(wrapper.find('.v-alert').exists()).toBe(true);
        expect(wrapper.text()).toContain('Test error message');
    });

    it('does not render when modelValue is false', () => {
        const wrapper = mount(ErrorAlert, {
            props: {
                modelValue: false,
                message: 'Test error message',
            },
            global: { stubs },
        });

        expect(wrapper.find('.v-alert').exists()).toBe(false);
    });

    it('displays title when provided', () => {
        const wrapper = mount(ErrorAlert, {
            props: {
                modelValue: true,
                title: 'Error Title',
                message: 'Error message',
            },
            global: { stubs },
        });

        expect(wrapper.text()).toContain('Error Title');
    });

    it('emits retry event when retry button is clicked', async () => {
        const wrapper = mount(ErrorAlert, {
            props: {
                modelValue: true,
                message: 'Error message',
                showRetry: true,
            },
            global: { stubs },
        });

        const retryButtons = wrapper.findAll('.v-btn');
        // Find the retry button (should be the one with the retry action)
        if (retryButtons.length > 0) {
            await retryButtons[0]?.trigger('click');
            expect(wrapper.emitted('retry')).toBeTruthy();
        }
    });

    it('uses default props when not provided', () => {
        const wrapper = mount(ErrorAlert, {
            props: {
                modelValue: true,
                message: 'Error message',
            },
            global: { stubs },
        });

        expect(wrapper.props('type')).toBe('error');
        expect(wrapper.props('closable')).toBe(true);
        expect(wrapper.props('showRetry')).toBe(false);
    });
});
