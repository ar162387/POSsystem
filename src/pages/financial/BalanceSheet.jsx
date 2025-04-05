import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const BalanceSheet = () => {
    const [totalBalance, setTotalBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filter states
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [remarksFilter, setRemarksFilter] = useState('');

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSubtractModal, setShowSubtractModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Form states
    const [currentTransaction, setCurrentTransaction] = useState({
        id: null,
        date: new Date(),
        amount: '',
        remarks: '',
        type: 'add'
    });

    // Loading state
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransactions();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [transactions, startDate, endDate, remarksFilter]);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const savedTransactions = localStorage.getItem('balanceTransactions');
            let transactions = savedTransactions ? JSON.parse(savedTransactions) : [];

            // Sort transactions by date in descending order (newest first)
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

            setTransactions(transactions);

            // Calculate total balance
            const total = transactions.reduce((acc, tx) => {
                return tx.type === 'add' ? acc + tx.amount : acc - tx.amount;
            }, 0);
            setTotalBalance(total);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...transactions];

        // Apply date range filter
        if (startDate && endDate) {
            filtered = filtered.filter(tx => {
                const txDate = new Date(tx.date);
                return txDate >= startDate && txDate <= endDate;
            });
        }

        // Apply remarks filter
        if (remarksFilter) {
            filtered = filtered.filter(tx =>
                tx.remarks.toLowerCase().includes(remarksFilter.toLowerCase())
            );
        }

        setFilteredTransactions(filtered);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentTransaction(prev => ({
            ...prev,
            [name]: name === 'amount' ? parseFloat(value) || '' : value
        }));
    };

    const handleDateChange = (date) => {
        setCurrentTransaction(prev => ({
            ...prev,
            date
        }));
    };

    const saveTransaction = () => {
        const newTransaction = {
            ...currentTransaction,
            id: currentTransaction.id || Date.now(),
            date: currentTransaction.date.toISOString()
        };

        let newTransactions;

        if (currentTransaction.id) {
            newTransactions = transactions.map(tx =>
                tx.id === currentTransaction.id ? newTransaction : tx
            );
        } else {
            newTransactions = [newTransaction, ...transactions]; // Add new transaction at the beginning
        }

        // Sort transactions by date in descending order
        newTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        setTransactions(newTransactions);
        localStorage.setItem('balanceTransactions', JSON.stringify(newTransactions));

        // Update total balance
        if (currentTransaction.id) {
            const oldTransaction = transactions.find(tx => tx.id === currentTransaction.id);
            if (oldTransaction.type === 'add') {
                setTotalBalance(prev => prev - oldTransaction.amount);
            } else {
                setTotalBalance(prev => prev + oldTransaction.amount);
            }
        }
        if (newTransaction.type === 'add') {
            setTotalBalance(prev => prev + newTransaction.amount);
        } else {
            setTotalBalance(prev => prev - newTransaction.amount);
        }

        // Reset and close modals
        resetForm();
        setShowAddModal(false);
        setShowSubtractModal(false);
        setShowEditModal(false);
        setCurrentPage(1); // Reset to first page when adding new transaction
    };

    const deleteTransaction = () => {
        // Find the transaction to delete
        const txToDelete = transactions.find(tx => tx.id === currentTransaction.id);

        // Adjust the total balance
        if (txToDelete.type === 'add') {
            setTotalBalance(prev => prev - txToDelete.amount);
        } else {
            setTotalBalance(prev => prev + txToDelete.amount);
        }

        // Remove the transaction from the list
        const newTransactions = transactions.filter(tx => tx.id !== currentTransaction.id);
        setTransactions(newTransactions);
        localStorage.setItem('balanceTransactions', JSON.stringify(newTransactions));

        // Reset and close modal
        resetForm();
        setShowDeleteModal(false);
    };

    const resetForm = () => {
        setCurrentTransaction({
            id: null,
            date: new Date(),
            amount: '',
            remarks: '',
            type: 'add'
        });
    };

    const handleEditClick = (transaction) => {
        setCurrentTransaction({
            ...transaction,
            date: new Date(transaction.date),
            amount: parseFloat(transaction.amount)
        });
        setShowEditModal(true);
    };

    const handleDeleteClick = (transaction) => {
        setCurrentTransaction({
            ...transaction,
            date: new Date(transaction.date)
        });
        setShowDeleteModal(true);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2
        }).format(parseFloat(amount) || 0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-PK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Pagination logic
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    return (
        <div className="container mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Balance Sheet</h1>
                <p className="text-gray-600">
                    Track and manage all financial transactions
                </p>
            </div>

            {/* Balance Summary */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Total Balance</h2>
                <div className={`text-4xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totalBalance)}
                </div>
            </div>

            {/* Filters and Actions */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-6">
                    <div className="w-full mb-4 md:mb-0 md:w-2/3 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <DatePicker
                                selected={startDate}
                                onChange={date => setStartDate(date)}
                                selectsStart
                                startDate={startDate}
                                endDate={endDate}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                placeholderText="Start Date"
                                isClearable
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <DatePicker
                                selected={endDate}
                                onChange={date => setEndDate(date)}
                                selectsEnd
                                startDate={startDate}
                                endDate={endDate}
                                minDate={startDate}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                placeholderText="End Date"
                                isClearable
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Search Remarks</label>
                            <input
                                type="text"
                                value={remarksFilter}
                                onChange={e => setRemarksFilter(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                placeholder="Search in remarks..."
                            />
                        </div>
                    </div>
                    <div className="flex space-x-4">
                        <button
                            onClick={() => {
                                resetForm();
                                setCurrentTransaction(prev => ({ ...prev, type: 'add' }));
                                setShowAddModal(true);
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                        >
                            Add Payment
                        </button>
                        <button
                            onClick={() => {
                                resetForm();
                                setCurrentTransaction(prev => ({ ...prev, type: 'subtract' }));
                                setShowSubtractModal(true);
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                        >
                            Subtract Payment
                        </button>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center p-8">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : filteredTransactions.length > 0 ? (
                    <>
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
                                            Remarks
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {currentItems.map(transaction => (
                                        <tr key={transaction.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(transaction.date)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                {formatCurrency(transaction.amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {transaction.remarks}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${transaction.type === 'add' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {transaction.type === 'add' ? 'Added' : 'Subtracted'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleEditClick(transaction)}
                                                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(transaction)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
                                <div className="flex-1 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                                            <span className="font-medium">
                                                {Math.min(indexOfLastItem, filteredTransactions.length)}
                                            </span>{' '}
                                            of <span className="font-medium">{filteredTransactions.length}</span> results
                                        </p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className={`px-3 py-1 rounded-md ${currentPage === 1
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                                }`}
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className={`px-3 py-1 rounded-md ${currentPage === totalPages
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                                }`}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center p-8 text-gray-500">
                        No transactions found. Add some payments to get started.
                    </div>
                )}
            </div>

            {/* Add Payment Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Add Payment</h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <DatePicker
                                selected={currentTransaction.date}
                                onChange={handleDateChange}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                dateFormat="MMMM d, yyyy"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                            <input
                                type="number"
                                name="amount"
                                value={currentTransaction.amount}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                placeholder="Enter amount"
                                min="0"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                            <textarea
                                name="remarks"
                                value={currentTransaction.remarks}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                placeholder="Enter remarks"
                                rows="3"
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveTransaction}
                                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                                disabled={!currentTransaction.amount}
                            >
                                Add Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Subtract Payment Modal */}
            {showSubtractModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Subtract Payment</h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <DatePicker
                                selected={currentTransaction.date}
                                onChange={handleDateChange}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                dateFormat="MMMM d, yyyy"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                            <input
                                type="number"
                                name="amount"
                                value={currentTransaction.amount}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                placeholder="Enter amount"
                                min="0"
                                max={totalBalance}
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                Available balance: {formatCurrency(totalBalance)}
                            </p>
                            {currentTransaction.amount > totalBalance && (
                                <p className="mt-1 text-sm text-red-500">
                                    Amount exceeds available balance
                                </p>
                            )}
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                            <textarea
                                name="remarks"
                                value={currentTransaction.remarks}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                placeholder="Enter remarks"
                                rows="3"
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowSubtractModal(false)}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveTransaction}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                                disabled={!currentTransaction.amount || currentTransaction.amount > totalBalance}
                            >
                                Subtract Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Transaction Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Edit Transaction</h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <DatePicker
                                selected={currentTransaction.date}
                                onChange={handleDateChange}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                dateFormat="MMMM d, yyyy"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                            <input
                                type="number"
                                name="amount"
                                value={currentTransaction.amount}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                placeholder="Enter amount"
                                min="0"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                            <textarea
                                name="remarks"
                                value={currentTransaction.remarks}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                placeholder="Enter remarks"
                                rows="3"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                name="type"
                                value={currentTransaction.type}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            >
                                <option value="add">Add Payment</option>
                                <option value="subtract">Subtract Payment</option>
                            </select>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveTransaction}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                                disabled={!currentTransaction.amount}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Delete Transaction</h2>
                        <p className="mb-4">
                            Are you sure you want to delete this transaction? This action cannot be undone.
                        </p>
                        <div className="mb-4">
                            <p><strong>Date:</strong> {formatDate(currentTransaction.date)}</p>
                            <p><strong>Amount:</strong> {formatCurrency(currentTransaction.amount)}</p>
                            <p><strong>Type:</strong> {currentTransaction.type === 'add' ? 'Add Payment' : 'Subtract Payment'}</p>
                            <p><strong>Remarks:</strong> {currentTransaction.remarks}</p>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={deleteTransaction}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BalanceSheet; 