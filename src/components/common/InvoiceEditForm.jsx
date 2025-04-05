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
        // Use paymentStatus field directly if available
        if (invoice.paymentStatus) {
            switch (invoice.paymentStatus) {
                case 'Paid':
                case 'paid':
                    return 'Paid';
                case 'Partially Paid':
                case 'partially_paid':
                    return 'Partially Paid';
                case 'Unpaid':
                case 'unpaid':
                    return 'Unpaid';
                default:
                    return 'Unpaid';
            }
        }

        // Fall back to universal status logic
        if (invoice.remainingAmount === 0) {
            return 'Paid';
        } else if (invoice.remainingAmount < invoice.totalAmount && invoice.remainingAmount > 0) {
            return 'Partially Paid';
        } else {
            return 'Unpaid';
        }
    },
    getStatusClass = (invoice) => {
        // Use paymentStatus field directly if available
        if (invoice.paymentStatus) {
            switch (invoice.paymentStatus) {
                case 'Paid':
                case 'paid':
                    return 'bg-green-100 text-green-800';
                case 'Partially Paid':
                case 'partially_paid':
                    return 'bg-amber-100 text-amber-800';
                case 'Unpaid':
                case 'unpaid':
                    return 'bg-red-100 text-red-800';
                default:
                    return 'bg-red-100 text-red-800';
            }
        }

        // Fall back to universal status logic
        if (invoice.remainingAmount === 0) {
            return 'bg-green-100 text-green-800';
        } else if (invoice.remainingAmount < invoice.totalAmount && invoice.remainingAmount > 0) {
            return 'bg-amber-100 text-amber-800';
        } else {
            return 'bg-red-100 text-red-800';
        }
    },
    calculateItemTotal,
    isVendorInvoice = false,
    isPaymentOnly = false,
    title = "Edit Invoice",
    submitText = "Update Invoice"
}) => {
    // Form state
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [dueDate, setDueDate] = useState('');
    const [formErrors, setFormErrors] = useState({});
    const [status, setStatus] = useState(invoice?.paymentStatus || 'pending');
    const [labourTransportCost, setLabourTransportCost] = useState(0);

    // Invoice detail modal state
    const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);

    // Show payment history
    const [showPaymentHistory, setShowPaymentHistory] = useState(false);

    // Reset the form when the invoice changes
    useEffect(() => {
        if (invoice) {
            setPaymentAmount('');
            setPaymentMethod('cash');
            setDueDate(invoice.dueDate || '');
            setStatus(invoice.paymentStatus || 'pending');
            setLabourTransportCost(parseFloat(isVendorInvoice ? invoice.labourTransportCost : invoice.laborTransportCost || 0));
        }
    }, [invoice, isVendorInvoice]);

    // Handle labor/transport cost change
    const handleLabourTransportCostChange = (e) => {
        setLabourTransportCost(parseFloat(e.target.value) || 0);
    };

    // Update status in real-time when payment amount or labour transport cost changes
    useEffect(() => {
        if (invoice) {
            const payment = parseFloat(paymentAmount || 0);
            const transportCost = parseFloat(labourTransportCost || 0);
            // Recalculate total with updated transport cost
            const newTotal = parseFloat(invoice.subtotal || 0) + transportCost;
            const totalPaid = parseFloat(invoice.paidAmount || 0) + payment;
            const remaining = Math.max(0, newTotal - totalPaid);

            // Update status based on remaining amount
            if (remaining === 0) {
                setStatus('paid');
            } else if (remaining < newTotal) {
                setStatus('partially_paid');
            } else {
                setStatus('unpaid');
            }
        }
    }, [paymentAmount, labourTransportCost, invoice]);

    const handlePaymentChange = (e) => {
        const value = e.target.value;
        setPaymentAmount(value);
    };

    const handlePaymentMethodChange = (e) => {
        setPaymentMethod(e.target.value);
    };

    const handleDueDateChange = (e) => {
        setDueDate(e.target.value);
    };

    const validateForm = () => {
        const errors = {};
        const transportCost = parseFloat(labourTransportCost);
        const newTotal = parseFloat(invoice.subtotal || 0) + transportCost;
        const payment = parseFloat(paymentAmount || 0);
        const totalPaid = parseFloat(invoice.paidAmount || 0);
        const remaining = Math.max(0, newTotal - totalPaid);

        // Only validate that payment is positive
        if (payment <= 0) {
            errors.paymentAmount = 'Payment amount must be greater than zero';
        }

        // Only show an error if payment exceeds remaining amount
        if (payment > remaining) {
            errors.paymentAmount = `Payment amount cannot exceed remaining amount (Rs ${remaining.toFixed(2)})`;
        }

        if (!paymentMethod) {
            errors.paymentMethod = 'Payment method is required';
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

        const payment = parseFloat(paymentAmount);
        const transportCost = parseFloat(labourTransportCost);

        // Recalculate total with updated transport cost
        const newTotal = parseFloat(invoice.subtotal || 0) + transportCost;
        const totalPaid = parseFloat(invoice.paidAmount || 0) + payment;
        const remaining = Math.max(0, newTotal - totalPaid);

        // Double-check status based on the remaining amount
        let paymentStatus = status;
        if (remaining === 0) {
            paymentStatus = 'paid';
        } else if (remaining < newTotal) {
            paymentStatus = 'partially_paid';
        } else {
            paymentStatus = 'unpaid';
        }

        const paymentData = {
            amount: payment,
            method: paymentMethod,
            date: new Date().toISOString(),
        };

        const updatedInvoice = {
            invoiceId: invoice._id,
            payment: paymentData,
            paidAmount: totalPaid,
            remainingAmount: remaining,
            status: paymentStatus,
            dueDate,
            [isVendorInvoice ? 'labourTransportCost' : 'laborTransportCost']: transportCost,
            totalAmount: newTotal
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

    // Toggle payment history
    const togglePaymentHistory = () => {
        setShowPaymentHistory(!showPaymentHistory);
    };

    // Determine entity type labels
    const entityType = isVendorInvoice ? 'Vendor' : 'Customer';
    const entityNameField = isVendorInvoice ? 'vendorName' : 'customerName';
    const dateFieldLabel = isVendorInvoice ? 'Invoice Date' : 'Issue Date';
    const dateFieldName = isVendorInvoice ? 'invoiceDate' : 'issueDate';

    if (!invoice) return null;

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={`Add Payment for ${isVendorInvoice ? 'Vendor ' : ''}Invoice`}
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
                            <div className="grid grid-cols-3 gap-4 mt-4">
                                <div>
                                    <p className="text-gray-600 text-sm">Total Amount</p>
                                    <p className="font-medium">{formatCurrency(invoice.totalAmount)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 text-sm">Paid Amount</p>
                                    <p className="font-medium text-green-600">{formatCurrency(invoice.paidAmount || 0)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 text-sm">Remaining Amount</p>
                                    <p className="font-medium text-red-600">{formatCurrency(invoice.remainingAmount || 0)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 text-sm">{dateFieldLabel}</p>
                                    <p className="font-medium">{formatDate(invoice[dateFieldName])}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 text-sm">Labour & Transport Cost</p>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={labourTransportCost}
                                        onChange={handleLabourTransportCostChange}
                                        className="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={togglePaymentHistory}
                                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                        </svg>
                                        {showPaymentHistory ? 'Hide Payment History' : 'Show Payment History'}
                                    </button>

                                    {showPaymentHistory && (
                                        <div className="mt-3 border rounded-lg overflow-hidden">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {invoice.paymentHistory.map((payment, index) => (
                                                        <tr key={index}>
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatDate(payment.date)}</td>
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(payment.amount)}</td>
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 capitalize">{payment.method}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">
                                New Payment Amount
                            </label>
                            <input
                                type="number"
                                value={paymentAmount}
                                onChange={handlePaymentChange}
                                placeholder="Enter payment amount"
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.paymentAmount ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                step="0.01"
                                min="0.01"
                            />
                            {formErrors.paymentAmount && (
                                <p className="text-red-500 text-sm mt-1">{formErrors.paymentAmount}</p>
                            )}
                            <p className="text-sm text-gray-500 mt-1">
                                Remaining amount: {formatCurrency(Math.max(0,
                                    (parseFloat(invoice.subtotal || 0) + parseFloat(labourTransportCost || 0)) -
                                    parseFloat(invoice.paidAmount || 0)
                                ))}
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">
                                Payment Method
                            </label>
                            <select
                                value={paymentMethod}
                                onChange={handlePaymentMethodChange}
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.paymentMethod ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            >
                                <option value="cash">Cash</option>
                                <option value="bank transfer">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                            </select>
                            {formErrors.paymentMethod && (
                                <p className="text-red-500 text-sm mt-1">{formErrors.paymentMethod}</p>
                            )}
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
                                        Adding Payment...
                                    </span>
                                ) : (
                                    'Add Payment'
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