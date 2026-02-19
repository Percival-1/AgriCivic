import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ConfirmDialog from './ConfirmDialog.vue';

// Mock Vuetify components
const mockVDialog = {
    name: 'VDialog',
    template: '<div class="v-dialog" v-if="modelValue"><slot /></div>',
    props: ['modelValue', 'maxWidth', 'persistent'],
};

const mockVCard = {
    name: 'VCard',
    template: '<div class="v-card"><slot /></div>',
};

const mockVCardTitle = {
    name: 'VCardTitle',
    template: '<div class="v-card-title"><slot /></div>',
};

const mockVCardText = {
    name: 'VCardText',
    template: '<div class="v-card-text"><slot /></div>',
};

const mockVCardActions = {
    name: 'VCardActions',
    template: '<div class="v-card-actions"><slot /></div>',
};

const mockVIcon = {
    name: 'VIcon',
    template: '<i class="v-icon"></i>',
    props: ['color'],
};

const mockVBtn = {
    name: 'VBtn',
    template: '<button class="v-btn" :data-action="color"><slot /></button>',
    props: ['color', 'variant', 'loading', 'disabled'],
};

const mockVSpacer = {
    name: 'VSpacer',
    template: '<div class="v-spacer"></div>',
};

const mockVAlert = {
    name: 'VAlert',
    template: '<div class="v-alert"><slot /></div>',
    props: ['type', 'variant', 'density'],
};

describe('ConfirmDialog', () => {
    const stubs = {
        VDialog: mockVDialog,
        VCard: mockVCard,
        VCardTitle: mockVCardTitle,
        VCardText: mockVCardText,
        VCardActions: mockVCardActions,
        VIcon: mockVIcon,
        VBtn: mockVBtn,
        VSpacer: mockVSpacer,
        VAlert: mockVAlert,
    };

    it('renders when modelValue is true', () => {
        const wrapper = mount(ConfirmDialog, {
            props: {
                modelValue: true,
                message: 'Are you sure?',
            },
            global: { stubs },
        });

        expect(wrapper.find('.v-dialog').exists()).toBe(true);
        expect(wrapper.text()).toContain('Are you sure?');
    });

    it('displays custom title', () => {
        const wrapper = mount(ConfirmDialog, {
            props: {
                modelValue: true,
                title: 'Delete Item',
                message: 'Are you sure?',
            },
            global: { stubs },
        });

        expect(wrapper.text()).toContain('Delete Item');
    });

    it('displays warning message when provided', () => {
        const wrapper = mount(ConfirmDialog, {
            props: {
                modelValue: true,
                message: 'Are you sure?',
                warningMessage: 'This action cannot be undone',
            },
            global: { stubs },
        });

        expect(wrapper.text()).toContain('This action cannot be undone');
    });

    it('emits confirm event when confirm button is clicked', async () => {
        const wrapper = mount(ConfirmDialog, {
            props: {
                modelValue: true,
                message: 'Are you sure?',
            },
            global: { stubs },
        });

        const buttons = wrapper.findAll('.v-btn');
        const confirmButton = buttons.find(btn => btn.attributes('data-action') === 'primary');
        await confirmButton?.trigger('click');

        expect(wrapper.emitted('confirm')).toBeTruthy();
    });

    it('emits cancel event when cancel button is clicked', async () => {
        const wrapper = mount(ConfirmDialog, {
            props: {
                modelValue: true,
                message: 'Are you sure?',
            },
            global: { stubs },
        });

        const buttons = wrapper.findAll('.v-btn');
        const cancelButton = buttons.find(btn => btn.attributes('data-action') === 'grey');
        await cancelButton?.trigger('click');

        expect(wrapper.emitted('cancel')).toBeTruthy();
    });

    it('displays custom button text', () => {
        const wrapper = mount(ConfirmDialog, {
            props: {
                modelValue: true,
                message: 'Are you sure?',
                confirmText: 'Delete',
                cancelText: 'Keep',
            },
            global: { stubs },
        });

        expect(wrapper.text()).toContain('Delete');
        expect(wrapper.text()).toContain('Keep');
    });

    it('uses default props when not provided', () => {
        const wrapper = mount(ConfirmDialog, {
            props: {
                modelValue: true,
                message: 'Are you sure?',
            },
            global: { stubs },
        });

        expect(wrapper.props('title')).toBe('Confirm Action');
        expect(wrapper.props('confirmText')).toBe('Confirm');
        expect(wrapper.props('cancelText')).toBe('Cancel');
    });
});
