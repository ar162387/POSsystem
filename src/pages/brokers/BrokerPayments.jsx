import React, { useState, useEffect } from 'react';
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
    const [invoices, setInvoices] = useState([]);
    const [brokers, setBrokers] = useState([]);
    const [filteredInvoices, setFilteredInvoices] = useState([]);
    const [brokerSearch, setBrokerSearch] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [brokerFilter, setBrokerFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
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

    // Delete confirmation modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Broker payment modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedBrokerInvoice, setSelectedBrokerInvoice] = useState(null);
    const [brokerPaidAmount, setBrokerPaidAmount] = useState(0);
    const [brokerPaymentDate, setBrokerPaymentDate] = useState('');
    const [brokerRemainingAmount, setBrokerRemainingAmount] = useState(0);
    const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState('');

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
            applyFilters(processedInvoices, brokerSearch, customerSearch, brokerFilter, statusFilter);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = (invoiceList, brokerSearchTerm, customerSearchTerm, brokerId, status) => {
        let filtered = [...invoiceList];

        // Apply broker search filter
        if (brokerSearchTerm) {
            filtered = filtered.filter(invoice =>
                invoice.brokerName?.toLowerCase().includes(brokerSearchTerm.toLowerCase())
            );
        }

        // Apply customer search filter
        if (customerSearchTerm) {
            filtered = filtered.filter(invoice =>
                invoice.customerName?.toLowerCase().includes(customerSearchTerm.toLowerCase())
            );
        }

        // Apply broker ID filter
        if (brokerId && brokerId !== 'all') {
            filtered = filtered.filter(invoice => invoice.brokerId === brokerId);
        }

        // Apply status filter
        if (status !== 'all') {
            if (status === 'partially_paid') {
                filtered = filtered.filter(invoice =>
                    invoice.brokerPaidAmount > 0 && invoice.brokerRemainingAmount > 0
                );
            } else if (status === 'paid') {
                filtered = filtered.filter(invoice => invoice.brokerPaymentStatus === 'paid');
            } else if (status === 'not_paid') {
                filtered = filtered.filter(invoice =>
                    invoice.brokerPaymentStatus === 'not paid' && invoice.brokerPaidAmount === 0
                );
            }
        }

        setFilteredInvoices(filtered);
        setTotalPages(Math.ceil(filtered.length / perPage));
        setCurrentPage(1); // Reset to first page when filters change
    };

    // Apply filters when search terms or status filter changes
    useEffect(() => {
        applyFilters(invoices, brokerSearch, customerSearch, brokerFilter, statusFilter);
    }, [brokerSearch, customerSearch, brokerFilter, statusFilter, invoices]);

    const handleBrokerSearchChange = (e) => {
        setBrokerSearch(e.target.value);
    };

    const handleCustomerSearchChange = (e) => {
        setCustomerSearch(e.target.value);
    };

    const handleBrokerFilterChange = (e) => {
        setBrokerFilter(e.target.value);
    };

    const handleStatusFilterChange = (e) => {
        setStatusFilter(e.target.value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const getBrokerPaymentStatusLabel = (invoice) => {
        if (invoice.brokerPaymentStatus === 'paid') return 'Paid';
        if (invoice.brokerPaidAmount > 0 && invoice.brokerRemainingAmount > 0) return 'Partially Paid';
        return 'Not Paid';
    };

    const getBrokerPaymentStatusClass = (invoice) => {
        if (invoice.brokerPaymentStatus === 'paid') return 'bg-green-100 text-green-800';
        if (invoice.brokerPaidAmount > 0 && invoice.brokerRemainingAmount > 0) return 'bg-amber-100 text-amber-800';
        return 'bg-red-100 text-red-800';
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

    const handleUpdatePayment = (invoice) => {
        setSelectedBrokerInvoice(invoice);
        setBrokerPaidAmount(invoice.brokerPaidAmount || 0);
        setBrokerRemainingAmount(invoice.brokerRemainingAmount || invoice.commissionAmount || 0);
        setBrokerPaymentDate(invoice.brokerPaymentDate ? new Date(invoice.brokerPaymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setShowPaymentModal(true);
        setPaymentError('');
    };

    const handleBrokerPaidAmountChange = (e) => {
        const value = parseFloat(e.target.value) || 0;
        setBrokerPaidAmount(value);

        if (selectedBrokerInvoice) {
            const total = parseFloat(selectedBrokerInvoice.commissionAmount || 0);
            const remaining = Math.max(0, total - value);
            setBrokerRemainingAmount(remaining);
        }
    };

    const validatePaymentForm = () => {
        const commissionAmount = parseFloat(selectedBrokerInvoice?.commissionAmount || 0);
        const paid = parseFloat(brokerPaidAmount || 0);

        if (paid < 0) {
            setPaymentError('Payment amount cannot be negative');
            return false;
        }

        if (paid > commissionAmount) {
            setPaymentError('Payment amount cannot exceed commission amount');
            return false;
        }

        if (!brokerPaymentDate && paid === commissionAmount) {
            setPaymentError('Payment date is required for fully paid commissions');
            return false;
        }

        return true;
    };

    const handleSubmitPayment = async (e) => {
        e.preventDefault();

        if (!validatePaymentForm()) {
            return;
        }

        try {
            setIsUpdatingPayment(true);
            setPaymentError('');

            const commissionAmount = parseFloat(selectedBrokerInvoice.commissionAmount);
            const paidAmount = parseFloat(brokerPaidAmount);

            // Mark payment status based on amount
            // If paid amount is less than or equal to 1, mark as paid
            // If paid amount is greater than 1, leave as not paid or partially paid
            let paymentStatus;
            if (paidAmount <= 1) {
                paymentStatus = 'paid';
            } else if (paidAmount >= commissionAmount) {
                paymentStatus = 'partially_paid';
            } else if (paidAmount > 0) {
                paymentStatus = 'partially_paid';
            } else {
                paymentStatus = 'not_paid';
            }

            // Call the backend to update the broker payment
            await ipcRenderer.invoke('update-broker-payment', {
                invoiceId: selectedBrokerInvoice._id,
                brokerPaidAmount: paidAmount,
                brokerPaymentDate: paymentStatus === 'paid' ? brokerPaymentDate : null,
                brokerPaymentStatus: paymentStatus,
                commissionAmount: commissionAmount
            });

            // Show success message
            setSuccess(`Broker payment for invoice ${selectedBrokerInvoice.invoiceNumber} updated successfully.`);

            // Close the payment modal
            setShowPaymentModal(false);
            setSelectedBrokerInvoice(null);

            // Refresh will be handled by the useEffect that watches success
        } catch (err) {
            console.error('Error updating broker payment:', err);
            setPaymentError('Failed to update broker payment. Please try again.');
        } finally {
            setIsUpdatingPayment(false);
        }
    };

    const handleClosePaymentModal = () => {
        setShowPaymentModal(false);
        setSelectedBrokerInvoice(null);
        setPaymentError('');
    };

    const promptDeleteInvoice = (invoice) => {
        setInvoiceToDelete(invoice);
        setShowDeleteModal(true);
    };

    const handleDeleteInvoice = async () => {
        if (!invoiceToDelete) return;

        try {
            setIsDeleting(true);
            setError('');

            // Call the backend to delete the invoice
            await ipcRenderer.invoke('delete-invoice', invoiceToDelete._id);

            // Show success message
            setSuccess(`Invoice ${invoiceToDelete.invoiceNumber} deleted successfully.`);

            // Close the delete modal
            setShowDeleteModal(false);
            setInvoiceToDelete(null);

            // Data refresh is handled by the useEffect that watches success message
        } catch (err) {
            console.error('Error deleting invoice:', err);
            setError('Failed to delete invoice. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCloseModal = () => {
        setShowInvoiceModal(false);
        setSelectedInvoice(null);
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
                <h1 className="text-2xl font-bold">Broker Payments</h1>
            </div>

            {/* Alert Messages */}
            {error && <Alert type="error" message={error} onClose={() => setError('')} className="mb-4" />}
            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} className="mb-4" />}

            {/* Filters and Search */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                    <Input
                        type="text"
                        placeholder="Search by broker name..."
                        value={brokerSearch}
                        onChange={handleBrokerSearchChange}
                        className="w-full"
                    />
                </div>
                <div>
                    <Input
                        type="text"
                        placeholder="Search by customer name..."
                        value={customerSearch}
                        onChange={handleCustomerSearchChange}
                        className="w-full"
                    />
                </div>
                <div>
                    <Select
                        value={brokerFilter}
                        onChange={handleBrokerFilterChange}
                        className="w-full"
                    >
                        <option value="all">All Brokers</option>
                        {brokers.map(broker => (
                            <option key={broker._id} value={broker._id}>
                                {broker.name}
                            </option>
                        ))}
                    </Select>
                </div>
                <div>
                    <Select
                        value={statusFilter}
                        onChange={handleStatusFilterChange}
                        className="w-full"
                    >
                        <option value="all">All Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="partially_paid">Partially Paid</option>
                        <option value="not_paid">Not Paid</option>
                    </Select>
                </div>
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
                            header: 'Total Amount',
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
                            header: 'Paid Amount',
                            cell: (row) => formatCurrency(Math.round(parseFloat(row.brokerPaidAmount || 0))),
                            key: 'paidAmount'
                        },
                        {
                            header: 'Remaining',
                            cell: (row) => formatCurrency(Math.round(parseFloat(row.brokerRemainingAmount || 0))),
                            key: 'remainingAmount'
                        },
                        {
                            header: 'Payment Date',
                            cell: (row) => formatDate(row.brokerPaymentDate),
                            key: 'paymentDate'
                        },
                        {
                            header: 'Status',
                            cell: (row) => (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBrokerPaymentStatusClass(row)}`}>
                                    {getBrokerPaymentStatusLabel(row)}
                                </span>
                            ),
                            key: 'status'
                        },
                        {
                            header: 'Actions',
                            cell: (row) => (
                                <div className="flex space-x-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleViewInvoice(row)}
                                    >
                                        View
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => handleUpdatePayment(row)}
                                    >
                                        Update Payment
                                    </Button>
                                </div>
                            ),
                            key: 'actions'
                        }
                    ]}
                    data={getCurrentPageInvoices()}
                    loading={loading}
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
            {showPaymentModal && selectedBrokerInvoice && (
                <Modal
                    isOpen={showPaymentModal}
                    onClose={handleClosePaymentModal}
                    title={`Update Broker Payment - ${selectedBrokerInvoice.brokerName}`}
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
                                    <p className="text-gray-600 text-sm">Invoice Number</p>
                                    <p className="font-medium">{selectedBrokerInvoice.invoiceNumber}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 text-sm">Customer</p>
                                    <p className="font-medium">{selectedBrokerInvoice.customerName}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 text-sm">Total Amount</p>
                                    <p className="font-medium">{formatCurrency(Math.round(parseFloat(selectedBrokerInvoice.totalAmount || 0)))}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 text-sm">Commission</p>
                                    <p className="font-medium">{formatCurrency(Math.round(parseFloat(selectedBrokerInvoice.commissionAmount || 0)))} ({parseFloat(selectedBrokerInvoice.commissionPercentage || 0).toFixed(2)}%)</p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">
                                Payment Amount
                            </label>
                            <input
                                type="number"
                                value={brokerPaidAmount}
                                onChange={handleBrokerPaidAmountChange}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                step="0.01"
                                min="0"
                                max={selectedBrokerInvoice.commissionAmount}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">
                                Remaining Amount
                            </label>
                            <input
                                type="text"
                                value={formatCurrency(brokerRemainingAmount)}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-gray-700 font-medium mb-2">
                                Payment Date
                            </label>
                            <input
                                type="date"
                                value={brokerPaymentDate}
                                onChange={(e) => setBrokerPaymentDate(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                Only required for fully paid commissions
                            </p>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={handleClosePaymentModal}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
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
                                        Updating...
                                    </span>
                                ) : (
                                    'Update Payment'
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && invoiceToDelete && (
                <DeleteConfirmation
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleDeleteInvoice}
                    title="Delete Invoice"
                    message={`Are you sure you want to delete invoice #${invoiceToDelete.invoiceNumber}? This action cannot be undone.`}
                    confirmText="Delete Invoice"
                    isDeleting={isDeleting}
                />
            )}
        </div>
    );
};

export default BrokerPayments; 