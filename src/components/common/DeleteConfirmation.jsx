import React from 'react';
import Modal from './Modal';

/**
 * Reusable Delete Confirmation Component
 * Presents a modal to confirm deletion of an item
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to call when closing without confirming
 * @param {function} onConfirm - Function to call when confirming deletion
 * @param {string} title - Modal title
 * @param {string} message - Confirmation message
 * @param {any} item - The item being deleted (optional)
 * @param {function} getItemName - Function to extract item name for display
 * @param {boolean} isProcessing - Whether the deletion is processing
 */
const DeleteConfirmation = ({
    isOpen = false,
    onClose,
    onConfirm,
    title = 'Confirm Delete',
    message = 'Are you sure you want to delete this item? This action cannot be undone.',
    item = null,
    getItemName = (item) => item?.name || 'this item',
    isProcessing = false
}) => {
    // Extract item name if item is provided
    const itemName = item ? getItemName(item) : 'this item';

    // Replace placeholders in message with actual item name
    const formattedMessage = message.replace('{itemName}', itemName);

    const footer = (
        <div className="flex justify-end space-x-3">
            <button
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
                Cancel
            </button>
            <button
                onClick={onConfirm}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400"
            >
                {isProcessing ? 'Deleting...' : 'Delete'}
            </button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            footer={footer}
            size="sm"
        >
            <p className="text-gray-600">
                {formattedMessage}
            </p>
        </Modal>
    );
};

export default DeleteConfirmation; 