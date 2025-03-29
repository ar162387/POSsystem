import React, { useState, useEffect } from 'react';
import { Modal, Alert, Input, Select, TextArea, SubmitButton } from './index';
import InvoiceDetail from './InvoiceDetail';

/**
 * Invoice Edit Form Component
 * Used for editing invoice details and updating payment information
 * 
 * @param {boolean} isOpen - Whether the form modal is open
 * @param {function} onClose - Function to call when closing the form
 * @param {object} invoice - The invoice to edit
 * @param {function} onSubmit - Function to call with updated invoice data when submitting
 * @param {boolean} isLoading - Whether the form is processing
 * @param {string} error - Error message
 * @param {function} formatCurrency - Function to format currency values
 * @param {function} formatDate - Function to format dates
 */
const InvoiceEditForm = ({
    isOpen,
    onClose,
    invoice,
    onSubmit,
    isLoading = false,
    error = '',
    formatCurrency = (value) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2
        }).format(parseFloat(value) || 0);
    },
    formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    },
    getStatusLabel = (invoice) => {
        if (invoice.status === 'paid') return 'Paid';
        if (invoice.paidAmount > 0 && invoice.remainingAmount > 0) return 'Partially Paid';
        return 'Unpaid';
    },
    getStatusClass = (invoice) => {
        if (invoice.status === 'paid' || (invoice.paidAmount && invoice.paidAmount >= invoice.totalAmount)) {
            return 'bg-green-100 text-green-800';
        }
        if (invoice.paidAmount > 0 && invoice.remainingAmount > 0) {
            return 'bg-amber-100 text-amber-800';
        }
        return 'bg-red-100 text-red-800';
    },
    calculateItemTotal,
    isVendorInvoice = false,
    isPaymentOnly = false,
    title = "Edit Invoice",
    submitText = "Update Invoice"
}) => {
    // Form state
    const [paidAmount, setPaidAmount] = useState(0);
    const [dueDate, setDueDate] = useState('');
    const [remainingAmount, setRemainingAmount] = useState(0);
    const [formErrors, setFormErrors] = useState({});

    // Invoice detail modal state
    const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);

    // Reset the form when the invoice changes
    useEffect(() => {
        if (invoice) {
            setPaidAmount(invoice.paidAmount || 0);
            setDueDate(invoice.dueDate || '');
            setRemainingAmount(invoice.remainingAmount || invoice.totalAmount || 0);
        }
    }, [invoice]);

    // Update remaining amount when payment amount changes
    useEffect(() => {
        if (invoice) {
            const total = parseFloat(invoice.totalAmount || 0);
            const paid = parseFloat(paidAmount || 0);
            const remaining = Math.max(0, total - paid).toFixed(2);
            setRemainingAmount(remaining);
        }
    }, [paidAmount, invoice]);

    const handlePaymentChange = (e) => {
        const value = e.target.value;
        setPaidAmount(value);
    };

    const handleDueDateChange = (e) => {
        setDueDate(e.target.value);
    };

    const validateForm = () => {
        const errors = {};
        const totalAmount = parseFloat(invoice.totalAmount || 0);
        const paid = parseFloat(paidAmount || 0);

        if (paid < 0) {
            errors.paidAmount = 'Payment amount cannot be negative';
        }

        if (paid > totalAmount) {
            errors.paidAmount = 'Payment amount cannot exceed total amount';
        }

        if (!dueDate) {
            errors.dueDate = 'Due date is required';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        const isFullyPaid = parseFloat(remainingAmount) <= 0;
        const updatedInvoice = {
            invoiceId: invoice._id,
            paidAmount: parseFloat(paidAmount),
            remainingAmount: parseFloat(remainingAmount),
            status: isFullyPaid ? 'paid' : 'not paid',
            dueDate
        };

        onSubmit(updatedInvoice);
    };

    // Handle invoice ID click to open details
    const handleShowInvoiceDetail = () => {
        setShowInvoiceDetail(true);
    };

    // Close invoice detail modal
    const handleCloseInvoiceDetail = () => {
        setShowInvoiceDetail(false);
    };

    // Determine entity type labels
    const entityType = isVendorInvoice ? 'Vendor' : 'Customer';
    const entityNameField = isVendorInvoice ? 'vendorName' : 'customerName';

    if (!invoice) return null;

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={`Edit ${isVendorInvoice ? 'Vendor ' : ''}Invoice Payment`}
                size="lg"
            >
                {error && (
                    <div className="mb-4">
                        <Alert type="error" message={error} />
                    </div>
                )}

                {invoice && (
                    <form onSubmit={handleSubmit}>
                        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-600 text-sm">Invoice Number</p>
                                    <div className="flex items-center">
                                        <p className="font-medium text-blue-600 mr-2">
                                            <a
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleShowInvoiceDetail();
                                                }}
                                                className="hover:underline"
                                            >
                                                {invoice.invoiceNumber}
                                            </a>
                                        </p>
                                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusClass(invoice)}`}>
                                            {getStatusLabel(invoice)}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-600 text-sm">{entityType}</p>
                                    <p className="font-medium">{invoice[entityNameField]}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <p className="text-gray-600 text-sm">Total Amount</p>
                                    <p className="font-medium">{formatCurrency(invoice.totalAmount)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 text-sm">Issue Date</p>
                                    <p className="font-medium">{formatDate(invoice.issueDate)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">
                                Payment Amount
                            </label>
                            <input
                                type="number"
                                value={paidAmount}
                                onChange={handlePaymentChange}
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.paidAmount ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                step="0.01"
                                min="0"
                                max={invoice.totalAmount}
                            />
                            {formErrors.paidAmount && (
                                <p className="text-red-500 text-sm mt-1">{formErrors.paidAmount}</p>
                            )}
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">
                                Remaining Amount
                            </label>
                            <input
                                type="text"
                                value={`${formatCurrency(remainingAmount)}`}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-gray-700 font-medium mb-2">
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={handleDueDateChange}
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.dueDate ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            />
                            {formErrors.dueDate && (
                                <p className="text-red-500 text-sm mt-1">{formErrors.dueDate}</p>
                            )}
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Updating...
                                    </span>
                                ) : (
                                    'Update Payment'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Invoice Detail Modal */}
            <Modal
                isOpen={showInvoiceDetail}
                onClose={handleCloseInvoiceDetail}
                title="Invoice Details"
                size="3xl"
            >
                <InvoiceDetail
                    invoice={invoice}
                    formatDate={formatDate}
                    calculateItemTotal={calculateItemTotal}
                    getStatusLabel={getStatusLabel}
                    getStatusClass={getStatusClass}
                    isVendorInvoice={isVendorInvoice}
                />
                <div className="flex justify-end mt-4">
                    <button
                        onClick={handleCloseInvoiceDetail}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                        Close
                    </button>
                </div>
            </Modal>
        </>
    );
};

export default InvoiceEditForm; 