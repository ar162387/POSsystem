import React from 'react';

const CommissionSheetDetail = ({ sheet }) => {
    // Helper functions
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'paid': return 'text-green-600';
            case 'not paid': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');

        // Create print-friendly HTML content
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice #${sheet.invoiceKey}</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 20px;
                    }
                    .invoice-header {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 30px;
                    }
                    .invoice-title {
                        font-size: 24px;
                        font-weight: bold;
                        color: #333;
                        margin-bottom: 5px;
                    }
                    .invoice-subtitle {
                        font-size: 16px;
                        color: #666;
                    }
                    .invoice-details {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        margin-bottom: 30px;
                    }
                    .detail-label {
                        font-size: 14px;
                        color: #666;
                        margin-bottom: 4px;
                    }
                    .detail-value {
                        font-size: 16px;
                        font-weight: 500;
                        color: #333;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 30px;
                    }
                    th {
                        background-color: #f3f4f6;
                        text-align: left;
                        padding: 10px;
                        font-weight: 600;
                        border-bottom: 1px solid #e5e7eb;
                    }
                    td {
                        padding: 10px;
                        border-bottom: 1px solid #e5e7eb;
                    }
                    .summary {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                    }
                    .status-paid {
                        color: #059669;
                    }
                    .status-not-paid {
                        color: #dc2626;
                    }
                    .footer {
                        margin-top: 40px;
                        text-align: center;
                        font-size: 14px;
                        color: #666;
                    }
                    @media print {
                        body {
                            padding: 0;
                            margin: 15mm;
                        }
                        button {
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="invoice-header">
                    <div>
                        <div class="invoice-title">Atif Trader Commission</div>
                        <div class="invoice-subtitle">Invoice #${sheet.invoiceKey}</div>
                    </div>
                    <div>
                        <div class="detail-label">Date:</div>
                        <div class="detail-value">${formatDate(sheet.invoiceDate)}</div>
                        ${sheet.dueDate ? `<div class="detail-label">Due Date:</div><div class="detail-value">${formatDate(sheet.dueDate)}</div>` : ''}
                    </div>
                </div>

                <div class="invoice-details">
                    <div>
                        <div class="detail-label">Commissioner:</div>
                        <div class="detail-value">${sheet.commissioner?.name || 'Unknown Commissioner'}</div>
                        ${sheet.buyerName ? `<div class="detail-label">Buyer:</div><div class="detail-value">${sheet.buyerName}</div>` : ''}
                    </div>
                    <div>
                        ${sheet.customerName ? `<div class="detail-label">Customer:</div><div class="detail-value">${sheet.customerName}</div>` : ''}
                        <div class="detail-label">Status:</div>
                        <div class="detail-value ${sheet.status === 'paid' ? 'status-paid' : 'status-not-paid'}">
                            ${sheet.status === 'paid' ? 'Paid' : 'Not Paid'}
                        </div>
                    </div>
                </div>

                <h3 style="margin-bottom: 10px; font-size: 18px;">Items</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Quantity</th>
                            <th>Net Weight (kg/unit)</th>
                            <th>Price (per kg)</th>
                            <th>Packaging Cost</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sheet.items && sheet.items.map((item, index) => `
                            <tr>
                                <td>${item.name || 'Unknown Item'}</td>
                                <td>${item.quantity}</td>
                                <td>${item.netWeight}</td>
                                <td>${item.price}</td>
                                <td>${item.packagingCost}</td>
                                <td>${formatCurrency(item.total)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="summary">
                    <div>
                        <div class="detail-label">Total Price:</div>
                        <div class="detail-value">${formatCurrency(sheet.totalPrice)}</div>
                        <div class="detail-label">Trader's Commission:</div>
                        <div class="detail-value">${sheet.tradersCommissionPercent}%</div>
                        <div class="detail-label">Commission Amount:</div>
                        <div class="detail-value">${formatCurrency(sheet.commissionPrice)}</div>
                    </div>
                    <div>
                        <div class="detail-label">Received Amount:</div>
                        <div class="detail-value">${formatCurrency(sheet.receivedAmount)}</div>
                        <div class="detail-label">Pending Amount:</div>
                        <div class="detail-value">${formatCurrency(sheet.pendingAmount)}</div>
                    </div>
                </div>

                <div class="footer">
                    <p>Thank you for your business</p>
                    <p>Atif Trader Commission Sheet</p>
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    if (!sheet) return <div className="p-4 text-center">No invoice data to display</div>;

    return (
        <div className="p-4">
            <div className="mb-4 flex justify-end">
                <button
                    onClick={handlePrint}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Invoice
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <p className="text-gray-600">Invoice #: <span className="font-semibold">{sheet.invoiceKey}</span></p>
                    <p className="text-gray-600">Date: <span className="font-semibold">{formatDate(sheet.invoiceDate)}</span></p>
                    {sheet.dueDate && (
                        <p className="text-gray-600">Due Date: <span className="font-semibold">{formatDate(sheet.dueDate)}</span></p>
                    )}
                </div>
                <div>
                    <p className="text-gray-600">Commissioner: <span className="font-semibold">{sheet.commissioner?.name || 'Unknown Commissioner'}</span></p>
                    {sheet.buyerName && (
                        <p className="text-gray-600">Buyer: <span className="font-semibold">{sheet.buyerName}</span></p>
                    )}
                    {sheet.customerName && (
                        <p className="text-gray-600">Customer: <span className="font-semibold">{sheet.customerName}</span></p>
                    )}
                    <p className="text-gray-600">Status: <span className={`font-semibold ${getStatusClass(sheet.status)}`}>
                        {sheet.status === 'paid' ? 'Paid' : 'Not Paid'}
                    </span></p>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Items</h3>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="p-2 text-left">Item</th>
                            <th className="p-2 text-left">Quantity</th>
                            <th className="p-2 text-left">Net Weight (kg/unit)</th>
                            <th className="p-2 text-left">Price (per kg)</th>
                            <th className="p-2 text-left">Packaging Cost (per unit)</th>
                            <th className="p-2 text-left">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sheet.items && sheet.items.map((item, index) => (
                            <tr key={index} className="border-b">
                                <td className="p-2">{item.name || 'Unknown Item'}</td>
                                <td className="p-2">{item.quantity}</td>
                                <td className="p-2">{item.netWeight}</td>
                                <td className="p-2">{item.price}</td>
                                <td className="p-2">{item.packagingCost}</td>
                                <td className="p-2">{formatCurrency(item.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <p className="text-gray-600">Total Price: <span className="font-semibold">{formatCurrency(sheet.totalPrice)}</span></p>
                    <p className="text-gray-600">Trader's Commission: <span className="font-semibold">{sheet.tradersCommissionPercent}%</span></p>
                    <p className="text-gray-600">Commission Amount: <span className="font-semibold">{formatCurrency(sheet.commissionPrice)}</span></p>
                </div>
                <div>
                    <p className="text-gray-600">Received Amount: <span className="font-semibold">{formatCurrency(sheet.receivedAmount)}</span></p>
                    <p className="text-gray-600">Pending Amount: <span className="font-semibold">{formatCurrency(sheet.pendingAmount)}</span></p>
                </div>
            </div>
        </div>
    );
};

export default CommissionSheetDetail; 