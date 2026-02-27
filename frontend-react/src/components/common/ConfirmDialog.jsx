import { FaExclamationTriangle } from 'react-icons/fa';
import Button from './Button';

/**
 * ConfirmDialog Component
 * 
 * Modal dialog for confirming actions.
 * 
 * @param {boolean} isOpen - Whether dialog is open
 * @param {function} onClose - Close callback
 * @param {function} onConfirm - Confirm callback
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {string} confirmText - Confirm button text (default: 'Confirm')
 * @param {string} cancelText - Cancel button text (default: 'Cancel')
 * @param {string} variant - Dialog variant: 'danger', 'warning', 'info'
 * @param {boolean} loading - Loading state for confirm button
 */

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    loading = false,
}) {
    if (!isOpen) return null;

    const iconColor = {
        danger: 'text-red-600',
        warning: 'text-yellow-600',
        info: 'text-blue-600',
    };

    const confirmVariant = {
        danger: 'danger',
        warning: 'primary',
        info: 'primary',
    };

    const handleConfirm = () => {
        onConfirm();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-start">
                        <div className={`flex-shrink-0 ${iconColor[variant]}`}>
                            <FaExclamationTriangle size={24} />
                        </div>

                        <div className="ml-4 flex-1">
                            <h3 className="text-lg font-medium text-gray-900">
                                {title}
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-gray-500">
                                    {message}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex gap-3 justify-end">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                        >
                            {cancelText}
                        </Button>
                        <Button
                            variant={confirmVariant[variant]}
                            onClick={handleConfirm}
                            loading={loading}
                            disabled={loading}
                        >
                            {confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
