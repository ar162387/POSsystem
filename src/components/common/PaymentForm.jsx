import React, { useState } from 'react';
import { Modal, Alert, Input, Select, TextArea, SubmitButton } from './index';

/**
 * Reusable Payment Form Component
 * Used for recording payments against invoices for both customers and vendors
 * 
 * @param {boolean} isOpen - Whether the form modal is open
 * @param {function} onClose - Function to call when closing the form
 * @param {object} invoice - The invoice to record payment against
 * @param {function} onSubmit - Function to call with payment data when submitting
 * @param {array} paymentMethods - Available payment methods
 * @param {boolean} isLoading - Whether the form is processing
 * @param {string} entityType - Type of entity ("customer" or "vendor")
 * @param {string} error - Error message
 * @param {function} formatCurrency - Function to format currency values
 */
const PaymentForm = ({
    isOpen,
    onClose,
    invoice,
    onSubmit,
    paymentMethods = [
        { value: 'cash', label: 'Cash' },
        { value: 'bank_transfer', label: 'Bank Transfer' },
        { value: 'check', label: 'Check' },
        { value: 'credit_card', label: 'Credit Card' },
        { value: 'other', label: 'Other' }
    ],
    isLoading = false,
    entityType = 'customer',
    error = '',
    formatCurrency = (value) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2
        }).format(parseFloat(value) || 0);
    }
}) => {
    // Default to today's date in YYYY-MM-DD format
    const today = new Date().toISOString().substr(0, 10);

    // State for form fields
    const [paymentAmount, setPaymentAmount] = useState(invoice?.remainingAmount || 0);
    const [paymentDate, setPaymentDate] = useState(today);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paymentNote, setPaymentNote] = useState('');
    const [formError, setFormError] = useState('');

    // Reset the form when the invoice changes
    React.useEffect(() => {
        if (invoice) {
            setPaymentAmount(invoice.remainingAmount || 0);
        }
    }, [invoice]);

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate payment amount
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            setFormError('Please enter a valid payment amount');
            return;
        }

        if (invoice && parseFloat(paymentAmount) > invoice.remainingAmount) {
            setFormError(`Payment amount cannot exceed the remaining amount of ${formatCurrency(invoice.remainingAmount)}`);
            return;
        }

        // Clear any form errors
        setFormError('');

        // Prepare payment data
        const paymentData = {
            invoiceId: invoice._id,
            entityId: invoice.customerId || invoice.vendorId,
            amount: parseFloat(paymentAmount),
            date: paymentDate,
            method: paymentMethod,
            notes: paymentNote
        };

        // Call the parent's submit handler
        onSubmit(paymentData);
    };

    // Get the entity name based on the type
    const getEntityName = () => {
        if (!invoice) return '';

        return entityType === 'customer'
            ? invoice.customerName
            : invoice.vendorName;
    };

    // Get the appropriate title based on entity type
    const getTitle = () => {
        return `Record ${entityType === 'vendor' ? 'Payment to Vendor' : 'Payment from Customer'}`;
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={getTitle()}
            size="md"
        >
            <div>
                <div className="mb-4">
                    <p className="text-gray-600">
                        <span className="font-medium">{entityType === 'vendor' ? 'Vendor' : 'Customer'}:</span> {getEntityName()}
                    </p>
                    <p className="text-gray-600">
                        <span className="font-medium">Invoice:</span> {invoice?.invoiceNumber}
                    </p>
                    <p className="text-gray-600">
                        <span className="font-medium">Remaining Amount:</span> {formatCurrency(invoice?.remainingAmount || 0)}
                    </p>
                </div>

                {(error || formError) && (
                    <Alert
                        type="error"
                        message={error || formError}
                        onClose={() => setFormError('')}
                    />
                )}

                <form onSubmit={handleSubmit}>
                    <Input
                        type="number"
                        label="Payment Amount"
                        placeholder="Enter payment amount"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        step="0.01"
                        min="0.01"
                        required
                        id="paymentAmount"
                    />

                    <Input
                        type="date"
                        label="Payment Date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        required
                        id="paymentDate"
                    />

                    <Select
                        label="Payment Method"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        options={paymentMethods}
                        required
                        id="paymentMethod"
                    />

                    <TextArea
                        label="Notes (Optional)"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        rows={3}
                        placeholder="Enter any relevant notes about this payment"
                        id="paymentNote"
                    />

                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <SubmitButton loading={isLoading}>
                            Record Payment
                        </SubmitButton>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default PaymentForm; 