import React from 'react';

/**
 * Reusable Modal Component
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to close the modal
 * @param {string} title - Modal title
 * @param {React.ReactNode} children - Modal content
 * @param {string} size - Modal size ('sm', 'md', 'lg', 'xl')
 * @param {boolean} showCloseButton - Whether to show the close button
 * @param {React.ReactNode} footer - Modal footer content
 */
const Modal = ({
    isOpen = false,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    footer
}) => {
    if (!isOpen) return null;

    // Calculate max width class based on size
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
        full: 'max-w-full'
    };

    const maxWidthClass = sizeClasses[size] || 'max-w-md';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`bg-white rounded-lg shadow-xl p-6 w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto`}>
                {title && (
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-700"
                                aria-label="Close"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}

                <div className="mb-4">
                    {children}
                </div>

                {footer && (
                    <div className="mt-4 border-t pt-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal; 