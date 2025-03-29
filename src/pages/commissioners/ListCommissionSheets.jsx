import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import CommissionSheetDetail from '../../components/CommissionSheetDetail';
import Modal from '../../components/Modal';
import EditCommissionSheetForm from '../../components/EditCommissionSheetForm';
import DeleteConfirmation from '../../components/DeleteConfirmation';

const ListCommissionSheets = () => {
    const [sheets, setSheets] = useState([]);
    const [filteredSheets, setFilteredSheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modal states
    const [selectedSheet, setSelectedSheet] = useState(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [perPage] = useState(10);

    useEffect(() => {
        refreshData();
    }, []);

    // Apply filters when search or status filter changes
    useEffect(() => {
        applyFilters(sheets, search, statusFilter);
    }, [search, statusFilter, sheets]);

    const applyFilters = (allSheets, searchTerm, status) => {
        let filtered = [...allSheets];

        // Apply search filter
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(sheet =>
                (sheet.invoiceKey && sheet.invoiceKey.toLowerCase().includes(lowerSearch)) ||
                (sheet.commissioner?.name && sheet.commissioner.name.toLowerCase().includes(lowerSearch))
            );
        }

        // Apply status filter (without modifying the original status)
        if (status !== 'all') {
            filtered = filtered.filter(sheet => sheet.status === status);
        }

        setFilteredSheets(filtered);
        setTotalPages(Math.ceil(filtered.length / perPage));
        setCurrentPage(1); // Reset to first page when filters change
    };

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
    };

    const handleStatusFilterChange = (e) => {
        setStatusFilter(e.target.value);
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

    const getStatusLabel = (status) => {
        switch (status) {
            case 'paid': return 'Paid';
            case 'not paid': return 'Not Paid';
            default: return status;
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'not paid': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
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

    const handleEditSheet = async (sheet) => {
        try {
            // Fetch the latest data for this sheet to ensure we're editing the most current version
            const latestSheetData = await ipcRenderer.invoke('get-commission-sheet', sheet._id);
            setSelectedSheet(latestSheetData);
            setEditModalOpen(true);
        } catch (err) {
            console.error('Error fetching sheet details:', err);
            setError('Failed to load commission sheet details.');
        }
    };

    const handleDeleteSheet = (sheet) => {
        setSelectedSheet(sheet);
        setDeleteModalOpen(true);
    };

    const handleSaveEdit = async (updatedSheet) => {
        try {
            setActionLoading(true);

            // Ensure commission price is an integer
            if (updatedSheet.commissionPrice !== undefined) {
                updatedSheet.commissionPrice = Math.round(updatedSheet.commissionPrice);
            }

            // Ensure proper pendingAmount and status calculation
            const commissionPrice = updatedSheet.commissionPrice !== undefined
                ? updatedSheet.commissionPrice
                : selectedSheet.commissionPrice;

            const receivedAmount = updatedSheet.receivedAmount !== undefined
                ? updatedSheet.receivedAmount
                : selectedSheet.receivedAmount;

            // Calculate pending amount based on commission price
            const pendingAmount = Math.max(0, commissionPrice - receivedAmount);

            // Determine payment status - only 'paid' or 'not paid'
            let status = pendingAmount <= 0 ? 'paid' : 'not paid';

            // Send the update to the server
            await ipcRenderer.invoke('update-commission-sheet', {
                id: selectedSheet._id,
                ...updatedSheet,
                commissionPrice: updatedSheet.commissionPrice, // Ensure rounded value is sent
                pendingAmount,
                status
            });

            // Refresh all data from the server to ensure we have the latest status
            await refreshData();

            setEditModalOpen(false);
            setSelectedSheet(null);
        } catch (err) {
            console.error('Error updating commission sheet:', err);
            setError('Failed to update commission sheet.');
        } finally {
            setActionLoading(false);
        }
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
                applyFilters(result.sheets, search, statusFilter);
            }
        } catch (err) {
            console.error('Error refreshing commission sheets:', err);
            setError('Failed to refresh data. Please try again.');
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

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                    <div className="w-full md:w-2/5">
                        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                            Search
                        </label>
                        <input
                            id="search"
                            type="text"
                            value={search}
                            onChange={handleSearchChange}
                            placeholder="Search by invoice # or commissioner..."
                            className="w-full border rounded p-2"
                            disabled={loading}
                        />
                    </div>
                    <div className="w-full md:w-2/5">
                        <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
                            Payment Status
                        </label>
                        <select
                            id="statusFilter"
                            value={statusFilter}
                            onChange={handleStatusFilterChange}
                            className="w-full border rounded p-2"
                            disabled={loading}
                        >
                            <option value="all">All Statuses</option>
                            <option value="paid">Paid</option>
                            <option value="not paid">Not Paid</option>
                        </select>
                    </div>
                    <div className="w-full md:w-1/5 flex items-end">
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

            {/* Commission Sheets Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center p-8">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : filteredSheets.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">
                        No commission sheets found. {search || statusFilter !== 'all' ? 'Try adjusting your filters.' : ''}
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
                                        Commission
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="relative group">
                                            <span>Pending Commission</span>
                                            <div className="absolute hidden group-hover:block bg-gray-800 text-white p-2 rounded text-xs w-48 left-0 top-6 z-10">
                                                Amount of commission payment remaining to be paid.
                                            </div>
                                        </div>
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
                                            {formatCurrency(sheet.commissionPrice)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatCurrency(sheet.pendingAmount)}
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
                                                    onClick={() => handleEditSheet(sheet)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                    title="Edit"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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

            {/* Edit Commission Sheet Modal */}
            <Modal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                title="Edit Commission Sheet"
            >
                <EditCommissionSheetForm
                    sheet={selectedSheet}
                    onSave={handleSaveEdit}
                    loading={actionLoading}
                />
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
        </div>
    );
};

export default ListCommissionSheets; 