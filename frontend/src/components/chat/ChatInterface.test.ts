import { describe, it, expect, beforeEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ChatInterface from './ChatInterface.vue';
import { useChatStore } from '@/stores/chat';
import type { ChatMessage } from '@/types/chat.types';

describe('ChatInterface', () => {
    let wrapper: VueWrapper;
    let chatStore: ReturnType<typeof useChatStore>;

    beforeEach(() => {
        // Create fresh Pinia instance for each test
        setActivePinia(createPinia());
        chatStore = useChatStore();

        // Mount component with stubbed Vuetify components
        wrapper = mount(ChatInterface, {
            global: {
                stubs: {
                    VCard: true,
                    VCardText: true,
                    VCardActions: true,
                    VTextarea: true,
                    VBtn: true,
                    VIcon: true,
                    VAvatar: true,
                    VChip: true,
                    VTooltip: true,
                    VDivider: true,
                    VAlert: true,
                },
            },
        });
    });

    describe('Component Rendering', () => {
        it('should render the chat interface', () => {
            expect(wrapper.find('.chat-interface').exists()).toBe(true);
        });

        it('should display empty state when no messages', () => {
            expect(wrapper.text()).toContain('Start a conversation');
        });

        it('should display message list when messages exist', async () => {
            const mockMessage: ChatMessage = {
                id: '1',
                session_id: 'session1',
                role: 'user',
                content: 'Hello',
                timestamp: new Date().toISOString(),
            };

            chatStore.messages = [mockMessage];
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.message-wrapper').exists()).toBe(true);
            expect(wrapper.text()).toContain('Hello');
        });
    });

    describe('Message Display', () => {
        it('should display user messages with correct styling', async () => {
            const userMessage: ChatMessage = {
                id: '1',
                session_id: 'session1',
                role: 'user',
                content: 'User message',
                timestamp: new Date().toISOString(),
            };

            chatStore.messages = [userMessage];
            await wrapper.vm.$nextTick();

            const messageWrapper = wrapper.find('.user-message');
            expect(messageWrapper.exists()).toBe(true);
            expect(messageWrapper.find('.user-bubble').exists()).toBe(true);
        });

        it('should display assistant messages with correct styling', async () => {
            const assistantMessage: ChatMessage = {
                id: '2',
                session_id: 'session1',
                role: 'assistant',
                content: 'Assistant response',
                timestamp: new Date().toISOString(),
            };

            chatStore.messages = [assistantMessage];
            await wrapper.vm.$nextTick();

            const messageWrapper = wrapper.find('.assistant-message');
            expect(messageWrapper.exists()).toBe(true);
            expect(messageWrapper.find('.assistant-bubble').exists()).toBe(true);
        });

        it('should render markdown in assistant messages', async () => {
            const assistantMessage: ChatMessage = {
                id: '2',
                session_id: 'session1',
                role: 'assistant',
                content: '**Bold text** and *italic text*',
                timestamp: new Date().toISOString(),
            };

            chatStore.messages = [assistantMessage];
            await wrapper.vm.$nextTick();

            const markdownContent = wrapper.find('.markdown-content');
            expect(markdownContent.exists()).toBe(true);
            // Check that HTML is rendered (marked converts markdown to HTML)
            expect(markdownContent.html()).toContain('<strong>');
            expect(markdownContent.html()).toContain('<em>');
        });

        it('should display source citations when present', async () => {
            const messageWithSources: ChatMessage = {
                id: '2',
                session_id: 'session1',
                role: 'assistant',
                content: 'Response with sources',
                sources: [
                    {
                        title: 'Source 1',
                        url: 'https://example.com',
                        relevance_score: 0.95,
                    },
                    {
                        title: 'Source 2',
                        relevance_score: 0.85,
                    },
                ],
                timestamp: new Date().toISOString(),
            };

            chatStore.messages = [messageWithSources];
            await wrapper.vm.$nextTick();

            const sources = wrapper.find('.sources');
            expect(sources.exists()).toBe(true);
            expect(sources.text()).toContain('Sources:');
            expect(sources.text()).toContain('Source 1');
            expect(sources.text()).toContain('Source 2');
        });

        it('should not display sources section when no sources', async () => {
            const messageWithoutSources: ChatMessage = {
                id: '2',
                session_id: 'session1',
                role: 'assistant',
                content: 'Response without sources',
                timestamp: new Date().toISOString(),
            };

            chatStore.messages = [messageWithoutSources];
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.sources').exists()).toBe(false);
        });

        it('should display timestamp for each message', async () => {
            const message: ChatMessage = {
                id: '1',
                session_id: 'session1',
                role: 'user',
                content: 'Test message',
                timestamp: new Date().toISOString(),
            };

            chatStore.messages = [message];
            await wrapper.vm.$nextTick();

            const timestamp = wrapper.find('.text-caption.text-grey');
            expect(timestamp.exists()).toBe(true);
        });
    });

    describe('Typing Indicator', () => {
        it('should display typing indicator when isTyping is true', async () => {
            chatStore.isTyping = true;
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.typing-indicator').exists()).toBe(true);
            expect(wrapper.find('.typing-dots').exists()).toBe(true);
        });

        it('should hide typing indicator when isTyping is false', async () => {
            chatStore.isTyping = false;
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.typing-indicator').exists()).toBe(false);
        });
    });

    describe('Message Input', () => {
        it('should render message input textarea', () => {
            expect(wrapper.find('textarea').exists()).toBe(true);
        });

        it('should disable input when no active session', async () => {
            chatStore.currentSession = null;
            await wrapper.vm.$nextTick();

            const textarea = wrapper.find('textarea');
            expect(textarea.attributes('disabled')).toBeDefined();
        });

        it('should enable input when session is active', async () => {
            chatStore.currentSession = {
                session_id: 'session1',
                user_id: 'user1',
                created_at: new Date().toISOString(),
                last_message_at: new Date().toISOString(),
            };
            await wrapper.vm.$nextTick();

            const textarea = wrapper.find('textarea');
            expect(textarea.attributes('disabled')).toBeUndefined();
        });
    });

    describe('Error Handling', () => {
        it('should display error alert when error exists', async () => {
            chatStore.error = 'Test error message';
            await wrapper.vm.$nextTick();

            const errorAlert = wrapper.find('.v-alert');
            expect(errorAlert.exists()).toBe(true);
            expect(errorAlert.text()).toContain('Test error message');
        });

        it('should hide error alert when no error', async () => {
            chatStore.error = null;
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.v-alert').exists()).toBe(false);
        });
    });

    describe('Auto-scroll', () => {
        it('should have scrollable message list', () => {
            const messageList = wrapper.find('.message-list');
            expect(messageList.exists()).toBe(true);
            expect(messageList.attributes('style')).toContain('height');
        });
    });

    describe('Props', () => {
        it('should accept custom height prop', () => {
            const customWrapper = mount(ChatInterface, {
                props: {
                    height: '600px',
                },
                global: {
                    stubs: {
                        VCard: true,
                        VCardText: true,
                        VCardActions: true,
                        VTextarea: true,
                        VBtn: true,
                        VIcon: true,
                        VAvatar: true,
                        VChip: true,
                        VTooltip: true,
                        VDivider: true,
                        VAlert: true,
                    },
                },
            });

            const messageList = customWrapper.find('.message-list');
            expect(messageList.attributes('style')).toContain('600px');
        });

        it('should use default height when not provided', () => {
            const messageList = wrapper.find('.message-list');
            expect(messageList.attributes('style')).toContain('500px');
        });
    });

    describe('Markdown Rendering', () => {
        it('should sanitize HTML in markdown to prevent XSS', async () => {
            const maliciousMessage: ChatMessage = {
                id: '2',
                session_id: 'session1',
                role: 'assistant',
                content: '<script>alert("XSS")</script>Safe content',
                timestamp: new Date().toISOString(),
            };

            chatStore.messages = [maliciousMessage];
            await wrapper.vm.$nextTick();

            const markdownContent = wrapper.find('.markdown-content');
            // Script tags should be removed by DOMPurify
            expect(markdownContent.html()).not.toContain('<script>');
            expect(markdownContent.html()).toContain('Safe content');
        });

        it('should allow safe HTML tags in markdown', async () => {
            const safeMessage: ChatMessage = {
                id: '2',
                session_id: 'session1',
                role: 'assistant',
                content: '**Bold** and *italic* and [link](https://example.com)',
                timestamp: new Date().toISOString(),
            };

            chatStore.messages = [safeMessage];
            await wrapper.vm.$nextTick();

            const markdownContent = wrapper.find('.markdown-content');
            expect(markdownContent.html()).toContain('<strong>');
            expect(markdownContent.html()).toContain('<em>');
            expect(markdownContent.html()).toContain('<a');
        });
    });
});
