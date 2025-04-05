import React, { useState, useEffect, useMemo } from 'react';
import { ipcRenderer } from 'electron';
import { useAuth } from '../../context/AuthContext.jsx';

// Import reusable components
import {
    Table,
    Pagination,
    Modal,
    InvoiceDetail,
    DeleteConfirmation,
    Alert,
    Button,
    Select,
    Input
} from '../../components/common';

const BrokerPayments = () => {
    const { user } = useAuth();

    // State for invoices and brokers data
    const [invoices, setInvoices] = useState([]);
    const [brokers, setBrokers] = useState([]);
    const [filteredInvoices, setFilteredInvoices] = useState([]);

    // State for broker search and filtering
    const [brokerSearch, setBrokerSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedBroker, setSelectedBroker] = useState(null);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // Broker commission summary 
    const [brokerSummary, setBrokerSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);

    // UI state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [perPage] = useState(10);

    // Invoice detail modal
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // Broker payment modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState('');

    // Payment history modal
    const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);

    // Fetch data when success message changes (indicating a successful operation)
    useEffect(() => {
        fetchData();
    }, [success]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch brokers
            const brokerData = await ipcRenderer.invoke('get-brokers', { page: 1, perPage: 1000 });
            setBrokers(brokerData.brokers || []);

            // Fetch all invoices with brokers
            const invoiceData = await ipcRenderer.invoke('get-broker-invoices', { page: 1, perPage: 1000 });

            // Process and sort invoices once, filtering out invoices without brokers
            const processedInvoices = (invoiceData.invoices || [])
                .filter(invoice => invoice.brokerId && invoice.brokerName)  // Only keep invoices with brokers
                .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));

            setInvoices(processedInvoices);
            setFilteredInvoices(processedInvoices);
            setTotalPages(Math.ceil(processedInvoices.length / perPage));

            // If we have a selected broker, update the broker summary
            if (selectedBroker) {
                await fetchBrokerSummary(selectedBroker._id);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Calculate aggregated statistics for displayed invoices
    const stats = useMemo(() => {
        // If we have a broker summary for the selected broker, use that
        if (selectedBroker && brokerSummary && brokerSummary.brokerId === selectedBroker._id) {
            return {
                totalCommission: brokerSummary.totalCommission,
                totalPaid: brokerSummary.totalPaid,
                totalRemaining: brokerSummary.totalRemaining
            };
        }

        // Otherwise calculate from displayed invoices
        const displayedInvoices = selectedBroker
            ? filteredInvoices.filter(inv => inv.brokerId === selectedBroker._id)
            : filteredInvoices;

        // Calculate total commission from all invoices
        const totalCommission = displayedInvoices.reduce((acc, inv) => {
            return acc + parseFloat(inv.commissionAmount || 0);
        }, 0);

        // If a broker is selected, get their total paid amount from their record
        let totalPaid = 0;
        if (selectedBroker) {
            totalPaid = parseFloat(selectedBroker.totalPaid || 0);
        } else {
            // If no broker is selected, sum up totalPaid from all brokers
            const uniqueBrokerIds = [...new Set(displayedInvoices.map(inv => inv.brokerId))];
            const relevantBrokers = brokers.filter(broker => uniqueBrokerIds.includes(broker._id));
            totalPaid = relevantBrokers.reduce((acc, broker) => acc + parseFloat(broker.totalPaid || 0), 0);
        }

        // Calculate remaining amount
        const totalRemaining = Math.max(0, totalCommission - totalPaid);

        return {
            totalCommission,
            totalPaid,
            totalRemaining
        };
    }, [filteredInvoices, selectedBroker, brokers, brokerSummary]);

    // Handle broker search input change
    const handleBrokerSearchChange = (e) => {
        const searchTerm = e.target.value;
        setBrokerSearch(searchTerm);

        if (searchTerm.trim() === '') {
            setShowSearchResults(false);
            setSearchResults([]);
            setSelectedBroker(null);
            setBrokerSummary(null); // Clear the broker summary
            setFilteredInvoices(invoices);
        } else {
            const results = brokers.filter(broker =>
                broker.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setSearchResults(results);
            setShowSearchResults(true);
        }
    };

    // Handle selection of a broker from search results
    const handleSelectBroker = (broker) => {
        setSelectedBroker(broker);
        setBrokerSearch(broker.name);
        setShowSearchResults(false);

        // Filter invoices for the selected broker
        const filtered = invoices.filter(invoice => invoice.brokerId === broker._id);
        setFilteredInvoices(filtered);
        setTotalPages(Math.ceil(filtered.length / perPage));
        setCurrentPage(1);

        // Load the broker's commission summary
        fetchBrokerSummary(broker._id);

        // Load the broker's payment history to have it ready
        handleFetchPaymentHistory(broker._id, false);
    };

    // Fetch broker commission summary
    const fetchBrokerSummary = async (brokerId) => {
        try {
            setLoadingSummary(true);
            const summary = await ipcRenderer.invoke('get-broker-commission-summary', brokerId);
            setBrokerSummary(summary);
        } catch (err) {
            console.error('Error fetching broker summary:', err);
            setError('Failed to load broker commission summary.');
        } finally {
            setLoadingSummary(false);
        }
    };

    // Clear broker filter
    const handleClearSearch = () => {
        setBrokerSearch('');
        setShowSearchResults(false);
        setSearchResults([]);
        setSelectedBroker(null);
        setBrokerSummary(null); // Clear the broker summary
        setFilteredInvoices(invoices);
        setTotalPages(Math.ceil(invoices.length / perPage));
        setCurrentPage(1);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const handleViewInvoice = async (invoice) => {
        try {
            setLoading(true);

            // Fetch the complete invoice with detailed item information
            const detailedInvoice = await ipcRenderer.invoke('get-invoice', invoice._id);

            // Set the detailed invoice in the state
            setSelectedInvoice(detailedInvoice);
            setShowInvoiceModal(true);
        } catch (err) {
            console.error('Error fetching invoice details:', err);
            setError('Could not load complete invoice details. Some information might be missing.');

            // If there's an error, just use the basic invoice information
            setSelectedInvoice(invoice);
            setShowInvoiceModal(true);
        } finally {
            setLoading(false);
        }
    };

    // Open payment modal for the selected broker
    const handleOpenPaymentModal = () => {
        if (!selectedBroker) {
            setError('Please select a broker first');
            return;
        }

        setPaymentAmount(0);
        setPaymentMethod('cash');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentError('');
        setShowPaymentModal(true);
    };

    // Handle payment amount change
    const handlePaymentAmountChange = (e) => {
        setPaymentAmount(parseFloat(e.target.value) || 0);
    };

    // Validate payment form
    const validatePaymentForm = () => {
        if (paymentAmount <= 0) {
            setPaymentError('Payment amount must be greater than zero');
            return false;
        }

        // Get remaining amount from stats (which uses broker summary if available)
        const remainingAmount = stats.totalRemaining;

        if (paymentAmount > remainingAmount) {
            setPaymentError(`Payment amount cannot exceed total remaining commission (${formatCurrency(remainingAmount)})`);
            return false;
        }

        if (!paymentDate) {
            setPaymentError('Payment date is required');
            return false;
        }

        return true;
    };

    // Submit broker payment
    const handleSubmitPayment = async (e) => {
        e.preventDefault();

        if (!validatePaymentForm()) {
            return;
        }

        try {
            setIsUpdatingPayment(true);
            setPaymentError('');

            // Call backend to process broker payment
            const result = await ipcRenderer.invoke('update-broker-commission-payment', {
                brokerId: selectedBroker._id,
                brokerName: selectedBroker.name,
                paymentAmount: paymentAmount,
                paymentMethod: paymentMethod,
                paymentDate: paymentDate
            });

            if (result && result.success) {
                setSuccess(`Payment of ${formatCurrency(paymentAmount)} processed for ${selectedBroker.name}`);
                setShowPaymentModal(false);

                // Refresh data after payment
                await fetchData();

                // Also update broker summary after payment
                await fetchBrokerSummary(selectedBroker._id);
            } else {
                const errorMessage = result?.message || 'Failed to process payment';
                setPaymentError(errorMessage);
            }
        } catch (err) {
            console.error('Error processing broker payment:', err);
            setPaymentError('Failed to process payment. Please try again.');
        } finally {
            setIsUpdatingPayment(false);
        }
    };

    // Fetch payment history without showing modal
    const handleFetchPaymentHistory = async (brokerId, showModal = true) => {
        try {
            setLoadingPaymentHistory(true);

            // Fetch payment history for the selected broker
            const history = await ipcRenderer.invoke('get-broker-payment-history', brokerId);

            setPaymentHistory(history || []);
            if (showModal) {
                setShowPaymentHistoryModal(true);
            }
        } catch (err) {
            console.error('Error fetching payment history:', err);
            setError('Failed to load payment history. Please try again.');
        } finally {
            setLoadingPaymentHistory(false);
        }
    };

    // View payment history for the selected broker
    const handleViewPaymentHistory = () => {
        if (!selectedBroker) {
            setError('Please select a broker first');
            return;
        }

        handleFetchPaymentHistory(selectedBroker._id, true);
    };

    const handleCloseModal = () => {
        setShowInvoiceModal(false);
        setSelectedInvoice(null);
    };

    const handleClosePaymentModal = () => {
        setShowPaymentModal(false);
        setPaymentError('');
    };

    const handleClosePaymentHistoryModal = () => {
        setShowPaymentHistoryModal(false);
    };

    // Get current page of invoices
    const getCurrentPageInvoices = () => {
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        return filteredInvoices.slice(startIndex, endIndex);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2
        }).format(parseFloat(amount) || 0);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Broker Commissions</h1>
            </div>

            {/* Alert Messages */}
            {error && <Alert type="error" message={error} onClose={() => setError('')} className="mb-4" />}
            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} className="mb-4" />}

            {/* Broker Search */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow">
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search Broker
                    </label>
                    <div className="flex">
                    <Input
                        type="text"
                        placeholder="Search by broker name..."
                        value={brokerSearch}
                        onChange={handleBrokerSearchChange}
                        className="w-full"
                    />
                        {selectedBroker && (
                            <button
                                onClick={handleClearSearch}
                                className="ml-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md max-h-60 overflow-auto">
                            {searchResults.map(broker => (
                                <div
                                    key={broker._id}
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => handleSelectBroker(broker)}
                                >
                                    {broker.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Summary */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">
                            {selectedBroker ? `Broker: ${selectedBroker.name}` : 'All Brokers'}
                        </h3>
                </div>
                <div>
                        <p className="text-sm text-gray-500">Total Commission</p>
                        <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.totalCommission)}</p>
                </div>
                <div>
                        <p className="text-sm text-gray-500">Total Paid</p>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</p>
                </div>
                <div>
                        <p className="text-sm text-gray-500">Total Remaining</p>
                        <p className="text-xl font-bold text-red-600">{formatCurrency(stats.totalRemaining)}</p>
                    </div>
                </div>

                {/* Action buttons - only visible when a broker is selected */}
                {selectedBroker && (
                    <div className="mt-4 flex space-x-4">
                        <Button
                            variant="primary"
                            onClick={handleOpenPaymentModal}
                            disabled={stats.totalRemaining <= 0}
                        >
                            Pay Commission
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleViewPaymentHistory}
                        >
                            Payment History
                        </Button>
                    </div>
                )}
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <Table
                    columns={[
                        {
                            header: 'Sr. No.',
                            cell: (_, index) => ((currentPage - 1) * perPage) + index + 1,
                            key: 'srNo'
                        },
                        {
                            header: 'Invoice #',
                            cell: (row) => row.invoiceNumber,
                            key: 'invoiceNumber'
                        },
                        {
                            header: 'Customer',
                            cell: (row) => row.customerName,
                            key: 'customerName'
                        },
                        {
                            header: 'Broker',
                            cell: (row) => row.brokerName,
                            key: 'brokerName'
                        },
                        {
                            header: 'Invoice Date',
                            cell: (row) => formatDate(row.issueDate),
                            key: 'issueDate'
                        },
                        {
                            header: 'Invoice Amount',
                            cell: (row) => formatCurrency(Math.round(parseFloat(row.totalAmount || 0))),
                            key: 'totalAmount'
                        },
                        {
                            header: 'Commission %',
                            cell: (row) => `${parseFloat(row.commissionPercentage || 0).toFixed(2)}%`,
                            key: 'commissionPercentage'
                        },
                        {
                            header: 'Commission Amount',
                            cell: (row) => formatCurrency(Math.round(parseFloat(row.commissionAmount || 0))),
                            key: 'commissionAmount'
                        },
                        {
                            header: 'Actions',
                            cell: (row) => (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleViewInvoice(row)}
                                    >
                                    View Invoice
                                    </Button>
                            ),
                            key: 'actions'
                        }
                    ]}
                    data={getCurrentPageInvoices()}
                    loading={loading}
                    emptyMessage="No broker commission records found"
                />

                {filteredInvoices.length > 0 && (
                    <div className="p-4 border-t">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>

            {/* Invoice Detail Modal */}
            {showInvoiceModal && selectedInvoice && (
                <Modal
                    isOpen={showInvoiceModal}
                    onClose={handleCloseModal}
                    title={`Invoice #${selectedInvoice.invoiceNumber}`}
                    size="4xl"
                >
                    <InvoiceDetail invoice={selectedInvoice} />
                </Modal>
            )}

            {/* Broker Payment Modal */}
            {showPaymentModal && selectedBroker && (
                <Modal
                    isOpen={showPaymentModal}
                    onClose={handleClosePaymentModal}
                    title={`Pay Commission to ${selectedBroker.name}`}
                    size="md"
                >
                    {paymentError && (
                        <div className="mb-4">
                            <Alert type="error" message={paymentError} />
                        </div>
                    )}

                    <form onSubmit={handleSubmitPayment}>
                        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-600 text-sm">Total Commission</p>
                                    <p className="font-medium">{formatCurrency(stats.totalCommission)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 text-sm">Remaining Amount</p>
                                    <p className="font-medium text-red-600">{formatCurrency(stats.totalRemaining)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">
                                Payment Amount
                            </label>
                            <input
                                type="number"
                                value={paymentAmount}
                                onChange={handlePaymentAmountChange}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                step="0.01"
                                min="0"
                                max={stats.totalRemaining}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">
                                Payment Method
                            </label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="cash">Cash</option>
                                <option value="online">Online Transfer</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>

                        <div className="mb-6">
                            <label className="block text-gray-700 font-medium mb-2">
                                Payment Date
                            </label>
                            <input
                                type="date"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={handleClosePaymentModal}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                disabled={isUpdatingPayment}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isUpdatingPayment}
                            >
                                {isUpdatingPayment ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </span>
                                ) : (
                                    'Process Payment'
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Payment History Modal */}
            {showPaymentHistoryModal && selectedBroker && (
                <Modal
                    isOpen={showPaymentHistoryModal}
                    onClose={handleClosePaymentHistoryModal}
                    title={`Payment History for ${selectedBroker.name}`}
                    size="xl"
                >
                    {loadingPaymentHistory ? (
                        <div className="flex justify-center items-center py-8">
                            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    ) : paymentHistory.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">
                            No payment records found for this broker.
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Total Commission</p>
                                        <p className="text-xl font-bold">{formatCurrency(stats.totalCommission)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Total Paid</p>
                                        <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Remaining Amount</p>
                                        <p className="text-xl font-bold text-red-600">{formatCurrency(stats.totalRemaining)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Payment Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Amount
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Method
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paymentHistory.map((payment, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {formatDate(payment.date)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {formatCurrency(payment.amount)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap capitalize">
                                                    {payment.method}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <Button
                                    variant="secondary"
                                    onClick={() => handleFetchPaymentHistory(selectedBroker._id, true)}
                                >
                                    Refresh History
                                </Button>
                            </div>
                        </>
                    )}
                </Modal>
            )}
        </div>
    );
};

export default BrokerPayments; 