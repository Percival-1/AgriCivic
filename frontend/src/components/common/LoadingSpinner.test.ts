import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import LoadingSpinner from './LoadingSpinner.vue';

// Mock Vuetify components
const mockVProgressCircular = {
    name: 'VProgressCircular',
    template: '<div class="v-progress-circular"></div>',
};

describe('LoadingSpinner', () => {
    it('renders when modelValue is true', () => {
        const wrapper = mount(LoadingSpinner, {
            props: {
                modelValue: true,
            },
            global: {
                stubs: {
                    VProgressCircular: mockVProgressCircular,
                },
            },
        });

        expect(wrapper.find('.loading-spinner-overlay').exists()).toBe(true);
    });

    it('does not render when modelValue is false', () => {
        const wrapper = mount(LoadingSpinner, {
            props: {
                modelValue: false,
            },
            global: {
                stubs: {
                    VProgressCircular: mockVProgressCircular,
                },
            },
        });

        expect(wrapper.find('.loading-spinner-overlay').exists()).toBe(false);
    });

    it('displays message when provided', () => {
        const message = 'Loading data...';
        const wrapper = mount(LoadingSpinner, {
            props: {
                modelValue: true,
                message,
            },
            global: {
                stubs: {
                    VProgressCircular: mockVProgressCircular,
                },
            },
        });

        expect(wrapper.text()).toContain(message);
    });

    it('applies fullscreen class when fullscreen prop is true', () => {
        const wrapper = mount(LoadingSpinner, {
            props: {
                modelValue: true,
                fullscreen: true,
            },
            global: {
                stubs: {
                    VProgressCircular: mockVProgressCircular,
                },
            },
        });

        expect(wrapper.find('.overlay-fullscreen').exists()).toBe(true);
    });

    it('uses default props when not provided', () => {
        const wrapper = mount(LoadingSpinner, {
            props: {
                modelValue: true,
            },
            global: {
                stubs: {
                    VProgressCircular: mockVProgressCircular,
                },
            },
        });

        expect(wrapper.props('size')).toBe(64);
        expect(wrapper.props('color')).toBe('primary');
        expect(wrapper.props('fullscreen')).toBe(false);
    });
});
