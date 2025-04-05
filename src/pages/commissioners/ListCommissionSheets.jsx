import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import CommissionSheetDetail from '../../components/CommissionSheetDetail';
import Modal from '../../components/Modal';
import DeleteConfirmation from '../../components/DeleteConfirmation';
import Combobox from '../../components/common/Combobox';

const ListCommissionSheets = () => {
    const [sheets, setSheets] = useState([]);
    const [filteredSheets, setFilteredSheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Commissioner search state
    const [commissioners, setCommissioners] = useState([]);
    const [selectedCommissioner, setSelectedCommissioner] = useState(null);

    // Stats
    const [totalCommission, setTotalCommission] = useState(0);
    const [totalPaid, setTotalPaid] = useState(0);
    const [remainingAmount, setRemainingAmount] = useState(0);

    // Payment state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [paymentDate, setPaymentDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    // Payment history state
    const [showPaymentHistory, setShowPaymentHistory] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState([]);

    // Modal states
    const [selectedSheet, setSelectedSheet] = useState(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [perPage] = useState(10);

    useEffect(() => {
        refreshData();
        fetchCommissioners();
    }, []);

    // Filter sheets when commissioner selection changes
    useEffect(() => {
        if (selectedCommissioner) {
            const filtered = sheets.filter(sheet => sheet.commissionerId === selectedCommissioner._id);
            setFilteredSheets(filtered);
            calculateStats(filtered);
            fetchPaymentHistory(selectedCommissioner._id);
        } else {
            setFilteredSheets(sheets);
            // For all commissioners, we need to fetch all payments
            (async () => {
                const allPayments = await fetchAllCommissionerPayments();
                setPaymentHistory(allPayments);
                calculateStats(sheets);
            })();
        }

        // Reset pagination
        setTotalPages(Math.ceil((selectedCommissioner ? filteredSheets.length : sheets.length) / perPage));
        setCurrentPage(1);
    }, [selectedCommissioner, sheets]);

    // Recalculate stats when payment history changes
    useEffect(() => {
        if (selectedCommissioner) {
            const filtered = sheets.filter(sheet => sheet.commissionerId === selectedCommissioner._id);
            calculateStats(filtered);
        } else {
            calculateStats(sheets);
        }
    }, [paymentHistory]);

    const fetchCommissioners = async () => {
        try {
            setLoading(true);
            const data = await ipcRenderer.invoke('get-commissioners', { page: 1, perPage: 1000 });
            setCommissioners(data.commissioners || []);
        } catch (err) {
            console.error('Error fetching commissioners:', err);
            setError('Failed to load commissioners.');
        } finally {
            setLoading(false);
        }
    };

    const fetchPaymentHistory = async (commissionerId) => {
        if (!commissionerId) return;

        try {
            setLoading(true);
            // The response structure is { commissioner: {...}, payments: [...] }
            const data = await ipcRenderer.invoke('get-commissioner-payments', commissionerId);
            setPaymentHistory(data.payments || []);
        } catch (err) {
            console.error('Error fetching payment history:', err);
            setError('Failed to load payment history.');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (sheetsData) => {
        // Calculate total commission from commission sheets
        const commission = sheetsData.reduce((total, sheet) => total + (sheet.commissionPrice || 0), 0);

        // Calculate what's already recorded as received in commission sheets
        const receivedFromSheets = sheetsData.reduce((total, sheet) => total + (sheet.receivedAmount || 0), 0);

        // Calculate total from payment history (if any)
        const receivedFromPayments = paymentHistory.reduce((total, payment) => total + (payment.amount || 0), 0);

        // Total paid is the sum of both payment sources
        const paid = receivedFromSheets + receivedFromPayments;

        // Remaining is commission minus all payments
        const remaining = Math.max(0, commission - paid);

        setTotalCommission(commission);
        setTotalPaid(paid);
        setRemainingAmount(remaining);
    };

    const handleCommissionerChange = (commissioner) => {
        setSelectedCommissioner(commissioner);
    };

    const getCommissionerDisplayValue = (commissioner) => {
        return commissioner?.name || '';
    };

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
        }).format(amount);
    };

    // Get current page items
    const getCurrentPageSheets = () => {
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        return filteredSheets.slice(startIndex, endIndex);
    };

    const handleViewInvoice = async (sheet) => {
        try {
            // Fetch the latest data for this sheet to ensure we're viewing the most current version
            const latestSheetData = await ipcRenderer.invoke('get-commission-sheet', sheet._id);
            setSelectedSheet(latestSheetData);
            setViewModalOpen(true);
        } catch (err) {
            console.error('Error fetching sheet details:', err);
            setError('Failed to load commission sheet details.');
        }
    };

    const handleDeleteSheet = (sheet) => {
        setSelectedSheet(sheet);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        try {
            setActionLoading(true);
            await ipcRenderer.invoke('delete-commission-sheet', selectedSheet._id);

            // Refresh data from the server
            await refreshData();

            setDeleteModalOpen(false);
            setSelectedSheet(null);
        } catch (err) {
            console.error('Error deleting commission sheet:', err);
            setError('Failed to delete commission sheet.');
        } finally {
            setActionLoading(false);
        }
    };

    const handlePaymentSubmit = async () => {
        if (!selectedCommissioner) {
            setError('Please select a commissioner first.');
            return;
        }

        if (paymentAmount <= 0) {
            setError('Payment amount must be greater than zero.');
            return;
        }

        if (paymentAmount > remainingAmount) {
            setError('Payment amount cannot exceed the remaining amount.');
            return;
        }

        try {
            setActionLoading(true);

            // Create payment object
            const payment = {
                commissionerId: selectedCommissioner._id,
                amount: paymentAmount,
                method: paymentMethod,
                date: paymentDate,
                createdAt: new Date()
            };

            // Add payment through IPC
            const newPayment = await ipcRenderer.invoke('add-commissioner-payment', payment);

            // Update local state with new payment
            setPaymentHistory(prevPayments => [...prevPayments, newPayment]);

            // Reset payment form
            setPaymentAmount(0);
            setPaymentMethod('Cash');
            const today = new Date();
            setPaymentDate(today.toISOString().split('T')[0]);

            // Close modal
            setShowPaymentModal(false);
        } catch (err) {
            console.error('Error adding payment:', err);
            setError('Failed to add payment.');
        } finally {
            setActionLoading(false);
        }
    };

    // Add a refresh function to re-fetch data from server
    const refreshData = async () => {
        try {
            setLoading(true);
            const result = await ipcRenderer.invoke('get-commission-sheets', {
                page: 1,
                perPage: 1000, // Get all sheets for client-side filtering
                search: ''
            });

            if (result && result.sheets) {
                setSheets(result.sheets);

                // If there's a selected commissioner, filter the sheets
                if (selectedCommissioner) {
                    const filtered = result.sheets.filter(sheet =>
                        sheet.commissionerId === selectedCommissioner._id
                    );
                    setFilteredSheets(filtered);
                    calculateStats(filtered);
                } else {
                    setFilteredSheets(result.sheets);
                    calculateStats(result.sheets);
                }

                setTotalPages(Math.ceil(
                    (selectedCommissioner ? filteredSheets.length : result.sheets.length) / perPage
                ));
            }
        } catch (err) {
            console.error('Error refreshing commission sheets:', err);
            setError('Failed to refresh data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Add a new function to fetch all commissioner payments
    const fetchAllCommissionerPayments = async () => {
        try {
            setLoading(true);
            // Get all commissioner payments
            const data = await ipcRenderer.invoke('get-all-commissioner-payments');
            return data.payments || [];
        } catch (err) {
            console.error('Error fetching all commissioner payments:', err);
            setError('Failed to load all commissioner payments.');
            return [];
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Commission Sheets</h1>
                <p className="text-gray-600">View and manage commission sheets for Atif Trader</p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                    {error}
                    <button
                        className="float-right"
                        onClick={() => setError('')}
                    >
                        &times;
                    </button>
                </div>
            )}

            {/* Commissioner Search */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                    <div className="w-full md:w-2/3">
                        <label htmlFor="commissioner" className="block text-sm font-medium text-gray-700 mb-1">
                            Search Commissioner
                        </label>
                        <Combobox
                            options={commissioners}
                            value={selectedCommissioner}
                            onChange={handleCommissionerChange}
                            getDisplayValue={getCommissionerDisplayValue}
                            placeholder="Search or select commissioner (leave empty for all)"
                            className="w-full"
                        />
                    </div>
                    <div className="w-full md:w-1/3 flex items-end">
                        <button
                            type="button"
                            onClick={refreshData}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded flex items-center justify-center"
                            disabled={loading}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Display */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg bg-blue-50">
                        <h3 className="text-sm font-medium text-gray-500">Total Commission</h3>
                        <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalCommission)}</p>
                    </div>
                    <div className="p-4 border rounded-lg bg-green-50">
                        <h3 className="text-sm font-medium text-gray-500">Total Paid</h3>
                        <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalPaid)}</p>
                    </div>
                    <div className="p-4 border rounded-lg bg-red-50">
                        <h3 className="text-sm font-medium text-gray-500">Remaining Amount</h3>
                        <p className="text-2xl font-bold text-gray-800">{formatCurrency(remainingAmount)}</p>
                    </div>
                </div>

                {/* Show payment options only when a commissioner is selected */}
                {selectedCommissioner && (
                    <div className="mt-4 flex justify-end space-x-4">
                        <button
                            onClick={() => setShowPaymentHistory(true)}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
                        >
                            Payment History
                        </button>
                        <button
                            onClick={() => setShowPaymentModal(true)}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                            disabled={remainingAmount <= 0}
                        >
                            Pay Commission
                        </button>
                    </div>
                )}
            </div>

            {/* Commission Sheets Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center p-8">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : filteredSheets.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">
                        No commission sheets found. {selectedCommissioner ? `for ${selectedCommissioner.name}` : ''}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Sr. No.
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Invoice #
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Commissioner
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Commission %
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Commission
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {getCurrentPageSheets().map((sheet, index) => (
                                    <tr key={sheet._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {((currentPage - 1) * perPage) + index + 1}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                            {sheet.invoiceKey}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(sheet.invoiceDate)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {sheet.commissioner?.name || 'Unknown Commissioner'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatCurrency(sheet.totalPrice)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {sheet.tradersCommissionPercent}%
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatCurrency(sheet.commissionPrice)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleViewInvoice(sheet)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="View Invoice"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSheet(sheet)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Delete"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && filteredSheets.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-200 sm:px-6">
                        <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-700">
                                Showing <span className="font-medium">{((currentPage - 1) * perPage) + 1}</span> to{' '}
                                <span className="font-medium">
                                    {Math.min(currentPage * perPage, filteredSheets.length)}
                                </span>{' '}
                                of <span className="font-medium">{filteredSheets.length}</span> results
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1 border rounded ${currentPage === 1
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`px-3 py-1 border rounded ${currentPage === totalPages
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* View Invoice Modal */}
            <Modal
                isOpen={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                title={`Invoice #${selectedSheet?.invoiceKey || ''}`}
                size="xl"
            >
                <CommissionSheetDetail sheet={selectedSheet} />
            </Modal>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmation
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Commission Sheet"
                message={`Are you sure you want to delete invoice #${selectedSheet?.invoiceKey || ''}? This action cannot be undone.`}
                loading={actionLoading}
            />

            {/* Pay Commission Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title="Pay Commission"
            >
                <div className="p-4">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Commissioner
                        </label>
                        <input
                            type="text"
                            value={selectedCommissioner?.name || ''}
                            disabled
                            className="w-full border rounded p-2 bg-gray-100"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Remaining Amount
                        </label>
                        <input
                            type="text"
                            value={formatCurrency(remainingAmount)}
                            disabled
                            className="w-full border rounded p-2 bg-gray-100"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Payment Amount
                        </label>
                        <input
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                            className="w-full border rounded p-2"
                            min="0"
                            max={remainingAmount}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Payment Method
                        </label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full border rounded p-2"
                        >
                            <option value="Cash">Cash</option>
                            <option value="Online">Online</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Payment Date
                        </label>
                        <input
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="w-full border rounded p-2"
                        />
                    </div>

                    <div className="flex justify-end mt-6">
                        <button
                            onClick={() => setShowPaymentModal(false)}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePaymentSubmit}
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                            disabled={actionLoading || paymentAmount <= 0 || paymentAmount > remainingAmount}
                        >
                            {actionLoading ? 'Processing...' : 'Submit Payment'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Payment History Modal */}
            <Modal
                isOpen={showPaymentHistory}
                onClose={() => setShowPaymentHistory(false)}
                title={`Payment History - ${selectedCommissioner?.name || ''}`}
            >
                <div className="p-4">
                    {paymentHistory.length === 0 ? (
                        <div className="text-center p-8 text-gray-500">
                            No payment history found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Payment Method
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paymentHistory.map((payment, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(payment.date)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatCurrency(payment.amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {payment.method}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default ListCommissionSheets; 