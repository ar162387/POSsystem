import React, { useState, useEffect } from 'react';

const EditCommissionSheetForm = ({ sheet, onSave, onCancel, loading }) => {
    const [receivedAmount, setReceivedAmount] = useState(0);
    const [dueDate, setDueDate] = useState('');
    const [pendingAmount, setPendingAmount] = useState(0);
    const [status, setStatus] = useState('not paid');

    useEffect(() => {
        if (sheet) {
            setReceivedAmount(sheet.receivedAmount || 0);
            setDueDate(sheet.dueDate || '');
            setPendingAmount(sheet.pendingAmount || 0);
            setStatus(sheet.status || 'not paid');
        }
    }, [sheet]);

    useEffect(() => {
        // Calculate pending amount based on commission price and received amount
        const calculatedPending = Math.max(0, (sheet?.commissionPrice || 0) - receivedAmount);
        setPendingAmount(calculatedPending);

        // Update status - only 'paid' or 'not paid' based on pendingAmount
        setStatus(calculatedPending <= 0 ? 'paid' : 'not paid');
    }, [receivedAmount, sheet]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            id: sheet._id,
            receivedAmount,
            dueDate,
            pendingAmount,
            status,
            commissionPrice: sheet?.commissionPrice
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    return (
        <form onSubmit={handleSubmit} className="p-4">
            <div className="grid grid-cols-1 gap-y-4">
                {/* Invoice Information (non-editable) */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Invoice Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Invoice #</p>
                            <p className="text-gray-900">{sheet?.invoiceKey}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Commissioner</p>
                            <p className="text-gray-900">{sheet?.commissioner?.name || 'Unknown'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Amount</p>
                            <p className="text-gray-900">{formatCurrency(sheet?.totalPrice)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Commission</p>
                            <p className="text-gray-900">{sheet?.tradersCommissionPercent}% ({formatCurrency(sheet?.commissionPrice)})</p>
                        </div>
                    </div>
                </div>

                {/* Editable Fields */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Received Amount
                    </label>
                    <div className="mt-1">
                        <input
                            type="number"
                            value={receivedAmount}
                            onChange={(e) => setReceivedAmount(parseFloat(e.target.value) || 0)}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Due Date
                    </label>
                    <div className="mt-1">
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Pending Amount (Calculated)
                    </label>
                    <div className="mt-1">
                        <input
                            type="text"
                            value={formatCurrency(pendingAmount)}
                            disabled
                            className="block w-full sm:text-sm border-gray-300 rounded-md p-2 border bg-gray-50"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Status (Calculated)
                    </label>
                    <div className="mt-1">
                        <input
                            type="text"
                            value={status === 'paid' ? 'Paid' : 'Not Paid'}
                            disabled
                            className={`block w-full sm:text-sm border-gray-300 rounded-md p-2 border bg-gray-50 ${status === 'paid' ? 'text-green-600' : 'text-red-600'
                                }`}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={loading}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={loading}
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
    );
};

export default EditCommissionSheetForm; 