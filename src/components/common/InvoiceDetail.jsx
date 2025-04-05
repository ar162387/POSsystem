import React from 'react';

/**
 * Reusable Invoice Detail Component
 * Shows the details of an invoice, including customer info, items, and totals
 * 
 * @param {Object} invoice - The invoice object to display
 * @param {Function} formatDate - Function to format dates
 * @param {Function} calculateItemTotal - Function to calculate item total (optional)
 * @param {String} statusLabelFunction - Function to get the status label (optional)
 * @param {String} statusClassFunction - Function to get the status CSS class (optional)
 * @param {Boolean} isVendorInvoice - Flag to indicate if the invoice is a vendor invoice
 */
const InvoiceDetail = ({
    invoice,
    formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    },
    calculateItemTotal = (item) => {
        if (!item) return 0;
        const priceField = isVendorInvoice ? 'purchasePrice' : 'sellingPrice';
        const price = parseFloat(item[priceField] || 0);
        const netWeight = parseFloat(item.netWeight || 0);
        const quantity = parseInt(item.quantity || 0);
        const packagingCost = parseFloat(item.packagingCost || 0);

        return (price * netWeight) + (quantity * packagingCost);
    },
    getStatusLabel = (invoice) => {
        if (invoice.status === 'paid') return 'Paid';
        if (invoice.paidAmount > 0 && invoice.remainingAmount > 0) return 'Partially Paid';
        return 'Unpaid';
    },
    getStatusClass = (invoice) => {
        if (invoice.status === 'paid') return 'bg-green-100 text-green-800';
        if (invoice.paidAmount > 0 && invoice.remainingAmount > 0) return 'bg-amber-100 text-amber-800';
        return 'bg-red-100 text-red-800';
    },
    isVendorInvoice = false
}) => {
    if (!invoice) return <p>No invoice data available</p>;

    // Determine entity type labels
    const entityType = isVendorInvoice ? 'Vendor' : 'Customer';
    const entityNameField = isVendorInvoice ? 'vendorName' : 'customerName';
    const priceField = isVendorInvoice ? 'purchasePrice' : 'sellingPrice';

    // Function to handle printing the invoice
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-6 print:p-0 bg-white rounded-lg max-w-4xl mx-auto">
            {/* Invoice Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-6 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">#{invoice.invoiceNumber}</h1>
                </div>
                <div className="mt-4 sm:mt-0 flex flex-col items-end">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(invoice)}`}>
                        {getStatusLabel(invoice)}
                    </div>
                    <div className="mt-3 text-right">
                        <div className="flex items-center text-gray-500 mb-1">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <span className="text-sm">{isVendorInvoice ? 'Invoice Date' : 'Issue Date'}: {formatDate(isVendorInvoice ? invoice.invoiceDate : invoice.issueDate)}</span>
                        </div>
                        <div className="flex items-center text-gray-500">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span className="text-sm">Due Date: {formatDate(invoice.dueDate)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Button */}
            <div className="mb-6 flex justify-end">
                <button
                    onClick={handlePrint}
                    className="flex items-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors duration-150"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                    </svg>
                    Print Invoice
                </button>
            </div>

            {/* Customer and Payment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Customer Information */}
                <div className="bg-gray-50 p-5 rounded-lg shadow-sm">
                    <h3 className="text-gray-700 font-semibold mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        Customer Name
                    </h3>
                    <div className="border-t border-gray-200 pt-3">
                        <p className="font-medium text-gray-800 mb-1">{invoice[entityNameField]}</p>
                        {invoice.address && <p className="text-gray-600 mb-1">{invoice.address}</p>}
                        {invoice.phone && (
                            <p className="text-gray-600 flex items-center">
                                <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                </svg>
                                {invoice.phone}
                            </p>
                        )}
                    </div>
                </div>

                {/* Payment Details */}
                <div className="bg-gray-50 p-5 rounded-lg shadow-sm">
                    <h3 className="text-gray-700 font-semibold mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Payment Details
                    </h3>
                    <div className="border-t border-gray-200 pt-3">
                        <div className="grid grid-cols-2 gap-y-3">
                            <div className="col-span-2 sm:col-span-1">
                                <p className="text-gray-600 text-sm">Total Amount</p>
                                <p className="font-medium text-gray-900">Rs {parseFloat(invoice.totalAmount).toFixed(2)}</p>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <p className="text-gray-600 text-sm">Paid Amount</p>
                                <p className="font-medium text-green-600">Rs {parseFloat(invoice.paidAmount || 0).toFixed(2)}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-gray-600 text-sm">Remaining</p>
                                <p className="font-medium text-red-600">Rs {parseFloat(invoice.remainingAmount || 0).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Broker Information (if present) */}
            {invoice.brokerName && (
                <div className="bg-indigo-50 p-5 rounded-lg shadow-sm mb-8">
                    <h3 className="text-gray-700 font-semibold mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        Broker Information
                    </h3>
                    <div className="border-t border-indigo-100 pt-3">
                        <div>
                            <p className="text-gray-600 text-sm">Broker Name</p>
                            <p className="font-medium text-gray-900">{invoice.brokerName}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Items */}
            <div className="mb-8">
                <h3 className="text-gray-700 font-semibold mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                    </svg>
                    Invoice Items
                </h3>
                <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Item
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Quantity
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Gross Weight (kg)
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Net Weight (kg)
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Packaging Cost
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {isVendorInvoice ? 'Purchase Price' : 'Selling Price'}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items && invoice.items.map((item, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-medium text-gray-900">{item.name || item.itemName}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700">
                                        {item.quantity}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700">
                                        {parseFloat(item.grossWeight || 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700">
                                        {parseFloat(item.netWeight || 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700">
                                        Rs {parseFloat(item.packagingCost || 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700">
                                        Rs {parseFloat(item[isVendorInvoice ? 'purchasePrice' : 'sellingPrice'] || 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                                        Rs {calculateItemTotal(item).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invoice Summary */}
            <div className="mb-8">
                <div className="bg-gray-50 p-5 rounded-lg shadow-sm ml-auto md:w-1/2">
                    <h3 className="text-gray-700 font-semibold mb-3">Invoice Summary</h3>
                    <div className="border-t border-gray-200 pt-3">
                        <div className="flex justify-between py-2">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium">Rs {parseFloat(invoice.subtotal || invoice.totalAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-2 text-gray-600">
                            <span>Labour and Transport Cost:</span>
                            <span>Rs {parseFloat(isVendorInvoice ? invoice.labourTransportCost : invoice.laborTransportCost || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-200 text-lg font-bold">
                            <span>Total:</span>
                            <span>Rs {parseFloat(invoice.totalAmount).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment History Section */}
            {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-gray-700 font-semibold mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        Payment History
                    </h3>
                    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 md:w-1/2">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Method
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {invoice.paymentHistory.map((payment, index) => (
                                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(payment.date)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                            Rs {parseFloat(payment.amount).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 capitalize">
                                            {payment.method}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Notes Section */}
            {invoice.notes && (
                <div className="bg-yellow-50 p-5 rounded-lg shadow-sm mb-4">
                    <h3 className="text-gray-700 font-semibold mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                        Notes
                    </h3>
                    <div className="border-t border-yellow-100 pt-3">
                        <p className="text-gray-700">{invoice.notes}</p>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="text-center text-gray-500 text-sm border-t border-gray-200 pt-6 mt-8">
                <p>Thank you for your business!</p>
            </div>

            {/* Print Styles */}
            <style jsx>{`
                @media print {
                    @page { size: auto; margin: 15mm; }
                    body { background-color: white; }
                    .print\\:hidden { display: none !important; }
                    button { display: none !important; }
                    .shadow-sm, .shadow, .shadow-md, .shadow-lg { box-shadow: none !important; }
                    .border { border: 1px solid #eaeaea !important; }
                }
            `}</style>
        </div>
    );
};

export default InvoiceDetail; 