import React from 'react';

const Modal = ({ isOpen, onClose, title, children, size = 'default' }) => {
    if (!isOpen) return null;

    const sizeClass = {
        small: 'max-w-md',
        default: 'max-w-2xl',
        large: 'max-w-4xl',
        xl: 'max-w-6xl'
    }[size] || 'max-w-2xl';

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className={`bg-white rounded-lg shadow-xl w-full ${sizeClass} transform transition-all`}>
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal; 