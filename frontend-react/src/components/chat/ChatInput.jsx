import { useState, useRef } from 'react';
import { FaPaperPlane, FaImage, FaTimes } from 'react-icons/fa';
import Button from '../common/Button';
import VoiceMessageButton from './VoiceMessageButton';

/**
 * ChatInput Component
 * 
 * Chat input with send button, image upload, and voice message support
 * 
 * Requirement: 5.2, 21.13
 */
export default function ChatInput({ onSendMessage, disabled = false, language = 'en' }) {
    const [message, setMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    const handleMessageChange = (e) => {
        const value = e.target.value;
        setMessage(value);
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate image
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                alert('Invalid image format. Please select JPEG, PNG, or WebP.');
                return;
            }

            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                alert('Image size exceeds 10MB limit.');
                return;
            }

            setSelectedImage(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!message.trim() && !selectedImage) {
            return;
        }

        // Send message
        onSendMessage({
            message: message.trim(),
            image: selectedImage
        });

        // Reset form
        setMessage('');
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleKeyPress = (e) => {
        // Send on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    /**
     * Handle voice message transcription ready
     * Requirement: 21.13 - Integrate speech in chat
     */
    const handleTranscriptionReady = (transcribedText) => {
        console.log('Transcription ready:', transcribedText);
        // Populate the text input with transcription
        setMessage(transcribedText);
    };

    /**
     * Handle voice message send
     * Requirement: 21.13 - Integrate speech in chat
     */
    const handleSendVoiceMessage = ({ audio, transcription }) => {
        console.log('Sending voice message with transcription:', transcription);
        // Send voice message with transcription as text
        onSendMessage({
            message: transcription || '[Voice Message]',
            image: null,
            audio: audio,
        });

        // Clear the message input after sending
        setMessage('');
    };

    return (
        <div className="border-t border-gray-200 bg-white p-4">
            {/* Image Preview */}
            {imagePreview && (
                <div className="mb-3 relative inline-block">
                    <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-32 rounded border border-gray-300"
                    />
                    <button
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                        <FaTimes size={12} />
                    </button>
                </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="flex gap-2">
                {/* Voice Message Button */}
                <VoiceMessageButton
                    onSendVoiceMessage={handleSendVoiceMessage}
                    onTranscriptionReady={handleTranscriptionReady}
                    disabled={disabled}
                    language={language}
                />

                {/* Image Upload Button */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageSelect}
                    className="hidden"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    className="flex-shrink-0 p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Upload image"
                >
                    <FaImage size={20} />
                </button>

                {/* Text Input */}
                <textarea
                    value={message}
                    onChange={handleMessageChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message... (Shift+Enter for new line)"
                    disabled={disabled}
                    rows={1}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                />

                {/* Send Button */}
                <Button
                    type="submit"
                    variant="primary"
                    disabled={disabled || (!message.trim() && !selectedImage)}
                    className="flex-shrink-0"
                >
                    <FaPaperPlane size={16} />
                </Button>
            </form>

            <div className="mt-2 text-xs text-gray-500">
                Press Enter to send, Shift+Enter for new line
            </div>
        </div>
    );
}
