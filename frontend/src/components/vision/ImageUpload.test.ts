import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ImageUpload from './ImageUpload.vue';
import visionService from '@/services/vision.service';

// Mock vision service
vi.mock('@/services/vision.service', () => ({
    default: {
        validateImageClientSide: vi.fn(),
        createImagePreviewUrl: vi.fn(),
        revokeImagePreviewUrl: vi.fn(),
    },
}));

// Mock Vuetify components
const mockVProgressCircular = {
    name: 'VProgressCircular',
    template: '<div class="v-progress-circular"><slot /></div>',
    props: ['modelValue', 'size', 'width', 'color'],
};

const mockVImg = {
    name: 'VImg',
    template: '<img :src="src" :alt="alt" />',
    props: ['src', 'alt', 'cover'],
};

const mockVBtn = {
    name: 'VBtn',
    template: '<button><slot /></button>',
    props: ['icon', 'size', 'color'],
};

const mockVIcon = {
    name: 'VIcon',
    template: '<i><slot /></i>',
    props: ['size', 'color'],
};

const mockVAlert = {
    name: 'VAlert',
    template: '<div class="v-alert"><slot /></div>',
    props: ['type', 'variant', 'closable'],
};

const mockVExpansionPanels = {
    name: 'VExpansionPanels',
    template: '<div class="v-expansion-panels"><slot /></div>',
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

const globalStubs = {
    VProgressCircular: mockVProgressCircular,
    VImg: mockVImg,
    VBtn: mockVBtn,
    VIcon: mockVIcon,
    VAlert: mockVAlert,
    VExpansionPanels: mockVExpansionPanels,
    VExpansionPanel: mockVExpansionPanel,
    VExpansionPanelTitle: mockVExpansionPanelTitle,
    VExpansionPanelText: mockVExpansionPanelText,
};

describe('ImageUpload', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders upload prompt by default', () => {
        const wrapper = mount(ImageUpload, {
            global: {
                stubs: globalStubs,
            },
        });

        expect(wrapper.find('.upload-prompt').exists()).toBe(true);
        expect(wrapper.text()).toContain('Upload Crop Image');
        expect(wrapper.text()).toContain('Drag and drop an image or click to browse');
    });

    it('validates file format and size', async () => {
        const wrapper = mount(ImageUpload, {
            global: {
                stubs: globalStubs,
            },
        });

        // Mock invalid file validation
        vi.mocked(visionService.validateImageClientSide).mockReturnValue({
            valid: false,
            error: 'Invalid file type',
        });

        const file = new File(['content'], 'test.txt', { type: 'text/plain' });
        const input = wrapper.find('input[type="file"]');

        Object.defineProperty(input.element, 'files', {
            value: [file],
            writable: false,
        });

        await input.trigger('change');
        await wrapper.vm.$nextTick();

        expect(wrapper.find('.v-alert').exists()).toBe(true);
        expect(wrapper.text()).toContain('Invalid file type');
    });

    it('creates preview for valid image', async () => {
        const wrapper = mount(ImageUpload, {
            global: {
                stubs: globalStubs,
            },
        });

        // Mock valid file validation
        vi.mocked(visionService.validateImageClientSide).mockReturnValue({
            valid: true,
        });
        vi.mocked(visionService.createImagePreviewUrl).mockReturnValue('blob:test-url');

        const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
        const input = wrapper.find('input[type="file"]');

        Object.defineProperty(input.element, 'files', {
            value: [file],
            writable: false,
        });

        await input.trigger('change');
        await wrapper.vm.$nextTick();

        expect(visionService.createImagePreviewUrl).toHaveBeenCalledWith(file);
        expect(wrapper.find('.preview-container').exists()).toBe(true);
    });

    it('emits file-selected event when valid file is selected', async () => {
        const wrapper = mount(ImageUpload, {
            global: {
                stubs: globalStubs,
            },
        });

        vi.mocked(visionService.validateImageClientSide).mockReturnValue({
            valid: true,
        });
        vi.mocked(visionService.createImagePreviewUrl).mockReturnValue('blob:test-url');

        const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
        const input = wrapper.find('input[type="file"]');

        Object.defineProperty(input.element, 'files', {
            value: [file],
            writable: false,
        });

        await input.trigger('change');
        await wrapper.vm.$nextTick();

        expect(wrapper.emitted('file-selected')).toBeTruthy();
        expect(wrapper.emitted('file-selected')?.[0]).toEqual([file]);
    });

    it('handles drag and drop', async () => {
        const wrapper = mount(ImageUpload, {
            global: {
                stubs: globalStubs,
            },
        });

        const dropZone = wrapper.find('.drop-zone');

        // Simulate drag over
        await dropZone.trigger('dragover');
        expect(wrapper.vm.isDragging).toBe(true);

        // Simulate drag leave
        await dropZone.trigger('dragleave');
        expect(wrapper.vm.isDragging).toBe(false);
    });

    it('clears image and preview', async () => {
        const wrapper = mount(ImageUpload, {
            global: {
                stubs: globalStubs,
            },
        });

        vi.mocked(visionService.validateImageClientSide).mockReturnValue({
            valid: true,
        });
        vi.mocked(visionService.createImagePreviewUrl).mockReturnValue('blob:test-url');

        const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
        const input = wrapper.find('input[type="file"]');

        Object.defineProperty(input.element, 'files', {
            value: [file],
            writable: false,
        });

        await input.trigger('change');
        await wrapper.vm.$nextTick();

        // Clear image
        wrapper.vm.clearImage();
        await wrapper.vm.$nextTick();

        expect(visionService.revokeImagePreviewUrl).toHaveBeenCalledWith('blob:test-url');
        expect(wrapper.vm.selectedFile).toBeNull();
        expect(wrapper.vm.previewUrl).toBeNull();
    });

    it('formats file size correctly', () => {
        const wrapper = mount(ImageUpload, {
            global: {
                stubs: globalStubs,
            },
        });

        expect(wrapper.vm.formatFileSize(0)).toBe('0 Bytes');
        expect(wrapper.vm.formatFileSize(1024)).toBe('1 KB');
        expect(wrapper.vm.formatFileSize(1048576)).toBe('1 MB');
        expect(wrapper.vm.formatFileSize(5242880)).toBe('5 MB');
    });

    it('shows upload progress when autoUpload is enabled', async () => {
        vi.useFakeTimers();

        const wrapper = mount(ImageUpload, {
            props: {
                autoUpload: true,
            },
            global: {
                stubs: globalStubs,
            },
        });

        vi.mocked(visionService.validateImageClientSide).mockReturnValue({
            valid: true,
        });
        vi.mocked(visionService.createImagePreviewUrl).mockReturnValue('blob:test-url');

        const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
        const input = wrapper.find('input[type="file"]');

        Object.defineProperty(input.element, 'files', {
            value: [file],
            writable: false,
        });

        await input.trigger('change');
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.uploading).toBe(true);
        expect(wrapper.find('.upload-progress-container').exists()).toBe(true);

        // Fast-forward timers
        vi.advanceTimersByTime(2000);
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.uploadProgress).toBe(100);
        expect(wrapper.emitted('upload-complete')).toBeTruthy();

        vi.useRealTimers();
    });

    it('emits validation-error when file is invalid', async () => {
        const wrapper = mount(ImageUpload, {
            global: {
                stubs: globalStubs,
            },
        });

        vi.mocked(visionService.validateImageClientSide).mockReturnValue({
            valid: false,
            error: 'File too large',
        });

        const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
        const input = wrapper.find('input[type="file"]');

        Object.defineProperty(input.element, 'files', {
            value: [file],
            writable: false,
        });

        await input.trigger('change');
        await wrapper.vm.$nextTick();

        expect(wrapper.emitted('validation-error')).toBeTruthy();
        expect(wrapper.emitted('validation-error')?.[0]).toEqual(['File too large']);
    });

    it('shows guidelines when showGuidelines prop is true', () => {
        const wrapper = mount(ImageUpload, {
            props: {
                showGuidelines: true,
            },
            global: {
                stubs: globalStubs,
            },
        });

        expect(wrapper.find('.v-expansion-panels').exists()).toBe(true);
        expect(wrapper.text()).toContain('Image Upload Guidelines');
    });

    it('hides guidelines when showGuidelines prop is false', () => {
        const wrapper = mount(ImageUpload, {
            props: {
                showGuidelines: false,
            },
            global: {
                stubs: globalStubs,
            },
        });

        expect(wrapper.find('.v-expansion-panels').exists()).toBe(false);
    });
});
