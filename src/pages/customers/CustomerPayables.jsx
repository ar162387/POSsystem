import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { useAuth } from '../../context/AuthContext.jsx';

// Import reusable components
import {
    Table,
    Pagination,
    Alert,
    Select,
    Input,
    Button,
    InvoiceEditForm,
    Modal,
    InvoiceDetail
} from '../../components/common';

const CustomerPayables = () => {
    const { user } = useAuth();
    const [customers, setCustomers] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [filteredInvoices, setFilteredInvoices] = useState([]);
    const [customerTotals, setCustomerTotals] = useState({});
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [paymentError, setPaymentError] = useState('');

    // Invoice detail modal state
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [viewInvoice, setViewInvoice] = useState(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [perPage] = useState(10);

    // Fetch data initially and whenever the success message changes
    // (which indicates a successful operation like payment update)
    useEffect(() => {
        fetchData();
    }, [success]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch customers
            const customerData = await ipcRenderer.invoke('get-customers', { page: 1, perPage: 100 });
            setCustomers(customerData.customers || []);

            // Fetch all invoices - using a single request to reduce backend calls
            const invoiceData = await ipcRenderer.invoke('get-invoices', { page: 1, perPage: 1000 });
            setInvoices(invoiceData.invoices || []);

            // Calculate the totals based on the fresh invoice data
            calculateCustomerTotals(invoiceData.invoices || []);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const calculateCustomerTotals = (invoicesList) => {
        const totals = {};

        // Create an efficient calculation that processes each invoice only once
        invoicesList.forEach(invoice => {
            const customerId = invoice.customerId;
            if (!totals[customerId]) {
                totals[customerId] = {
                    total: 0,
                    paid: 0,
                    outstanding: 0
                };
            }

            // Use the correct values directly from the invoice
            // This ensures we're using the same calculation logic everywhere
            const totalAmount = parseFloat(invoice.totalAmount) || 0;
            const paidAmount = parseFloat(invoice.paidAmount) || 0;
            const remainingAmount = parseFloat(invoice.remainingAmount) || totalAmount - paidAmount;

            totals[customerId].total += totalAmount;
            totals[customerId].paid += paidAmount;
            totals[customerId].outstanding += remainingAmount;
        });

        setCustomerTotals(totals);
    };

    // Filter invoices when selection or filters change
    useEffect(() => {
        if (selectedCustomer) {
            let filtered = invoices.filter(invoice => invoice.customerId === selectedCustomer);

            // Apply status filter
            if (statusFilter !== 'all') {
                if (statusFilter === 'partially_paid') {
                    filtered = filtered.filter(invoice =>
                        invoice.paidAmount > 0 && invoice.remainingAmount > 0
                    );
                } else {
                    filtered = filtered.filter(invoice => invoice.status === statusFilter);
                }
            }

            // Apply search term filter
            if (searchTerm) {
                filtered = filtered.filter(invoice =>
                    invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            // Sort invoices by issue date (newest first)
            filtered.sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));

            setFilteredInvoices(filtered);
            setTotalPages(Math.ceil(filtered.length / perPage));
            setCurrentPage(1); // Reset to first page when filters change
        } else {
            setFilteredInvoices([]);
            setTotalPages(1);
        }
    }, [selectedCustomer, invoices, statusFilter, searchTerm, perPage]);

    const handleCustomerChange = (e) => {
        setSelectedCustomer(e.target.value);
        setError('');
        setSuccess('');
    };

    const handleStatusFilterChange = (e) => {
        setStatusFilter(e.target.value);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
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
        }).format(parseFloat(amount) || 0);
    };

    const openPaymentModal = async (invoice) => {
        try {
            setLoading(true);
            // Fetch the complete invoice with detailed item information
            const detailedInvoice = await ipcRenderer.invoke('get-invoice', invoice._id);
            setSelectedInvoice(detailedInvoice);
            setShowPaymentModal(true);
            setPaymentError('');
        } catch (err) {
            console.error('Error fetching invoice details:', err);
            setError('Could not load invoice details. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSubmit = async (updatedInvoiceData) => {
        try {
            setProcessingPayment(true);
            setPaymentError('');

            // Call the backend to update the invoice
            await ipcRenderer.invoke('update-invoice-payment', updatedInvoiceData);

            // Show success message
            setSuccess(`Payment for invoice ${selectedInvoice.invoiceNumber} processed successfully.`);

            // Close modal
            setShowPaymentModal(false);
            setSelectedInvoice(null);

            // Refresh data is handled by the useEffect that watches success message
        } catch (err) {
            console.error('Error updating invoice:', err);
            setPaymentError('Failed to process payment. Please try again.');
        } finally {
            setProcessingPayment(false);
        }
    };

    const getInvoiceStatusLabel = (invoice) => {
        if (invoice.status === 'paid') return 'Paid';
        if (invoice.paidAmount > 0 && invoice.remainingAmount > 0) return 'Partially Paid';
        return 'Unpaid';
    };

    const getInvoiceStatusClass = (invoice) => {
        // If invoice is fully paid
        if (invoice.status === 'paid' || (invoice.paidAmount && invoice.paidAmount >= invoice.totalAmount)) {
            return 'bg-green-100 text-green-800';
        }

        // If invoice is partially paid
        if (invoice.paidAmount > 0 && invoice.remainingAmount > 0) {
            return 'bg-amber-100 text-amber-800';
        }

        // If invoice is unpaid or any other status
        return 'bg-red-100 text-red-800';
    };

    // Get current page of invoices
    const getCurrentPageInvoices = () => {
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        return filteredInvoices.slice(startIndex, endIndex);
    };

    const getPaymentOptions = () => {
        return [
            { value: 'cash', label: 'Cash' },
            { value: 'bank_transfer', label: 'Bank Transfer' },
            { value: 'check', label: 'Check' },
            { value: 'credit_card', label: 'Credit Card' },
            { value: 'other', label: 'Other' }
        ];
    };

    const handleViewInvoice = async (invoice) => {
        try {
            setLoading(true);

            // Fetch the complete invoice with detailed item information
            const detailedInvoice = await ipcRenderer.invoke('get-invoice', invoice._id);

            // Set the detailed invoice in the state
            setViewInvoice(detailedInvoice);
            setShowInvoiceModal(true);
        } catch (err) {
            console.error('Error fetching invoice details:', err);
            setError('Could not load complete invoice details. Some information might be missing.');

            // If there's an error, just use the basic invoice information
            setViewInvoice(invoice);
            setShowInvoiceModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowInvoiceModal(false);
        setViewInvoice(null);
    };

    // Configure table columns and actions
    const columns = [
        { key: 'invoiceNumber', label: 'Invoice #' },
        {
            key: 'issueDate',
            label: 'Date',
            format: (value) => formatDate(value)
        },
        {
            key: 'dueDate',
            label: 'Due Date',
            format: (value) => formatDate(value)
        },
        {
            key: 'totalAmount',
            label: 'Amount',
            format: (value) => formatCurrency(value)
        },
        {
            key: 'paidAmount',
            label: 'Paid',
            format: (value) => formatCurrency(value),
        },
        {
            key: 'remainingAmount',
            label: 'Remaining',
            format: (value) => formatCurrency(value),
        },
        {
            key: 'status',
            label: 'Status',
            format: (value, row) => (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-md ${getInvoiceStatusClass(row)}`}>
                    {getInvoiceStatusLabel(row)}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            format: (value, row) => (
                <div className="flex flex-col space-y-2">
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
                        onClick={() => openPaymentModal(row)}
                        disabled={row.status === 'paid'}
                    >
                        Record Payment
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Customer Payables</h1>

            {/* Alert messages */}
            {error && <Alert type="error" message={error} onClose={() => setError('')} className="mb-4" />}
            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} className="mb-4" />}

            {/* Customer selector and summary */}
            <div className="mb-6 p-4 bg-white rounded-lg shadow">
                <div className="mb-4">
                    <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">
                        Select Customer
                    </label>
                    <Select
                        id="customer"
                        value={selectedCustomer}
                        onChange={handleCustomerChange}
                        disabled={loading}
                        options={[
                            { value: '', label: 'Select a customer...' },
                            ...customers.map(customer => ({
                                value: customer._id,
                                label: `${customer.name} (${customer.company || 'No Company'})`
                            }))
                        ]}
                    />
                </div>

                {selectedCustomer && customerTotals[selectedCustomer] && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-blue-800">Total Invoices</h3>
                            <p className="text-xl font-bold text-blue-900">{formatCurrency(customerTotals[selectedCustomer].total)}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-green-800">Total Paid</h3>
                            <p className="text-xl font-bold text-green-900">{formatCurrency(customerTotals[selectedCustomer].paid)}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-red-800">Outstanding Balance</h3>
                            <p className="text-xl font-bold text-red-900">{formatCurrency(customerTotals[selectedCustomer].outstanding)}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Filters */}
            {selectedCustomer && (
                <div className="mb-6 flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4">
                    <div className="w-full md:w-1/4">
                        <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
                            Payment Status
                        </label>
                        <Select
                            id="statusFilter"
                            value={statusFilter}
                            onChange={handleStatusFilterChange}
                            disabled={loading}
                            options={[
                                { value: 'all', label: 'All Statuses' },
                                { value: 'unpaid', label: 'Unpaid' },
                                { value: 'partially_paid', label: 'Partially Paid' },
                                { value: 'paid', label: 'Paid' }
                            ]}
                        />
                    </div>
                    <div className="w-full md:w-1/4">
                        <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-1">
                            Invoice Number
                        </label>
                        <Input
                            id="searchTerm"
                            type="text"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            placeholder="Search by invoice number..."
                            disabled={loading}
                        />
                    </div>
                </div>
            )}

            {/* Invoices Table */}
            {selectedCustomer && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <Table
                        columns={columns}
                        data={getCurrentPageInvoices()}
                        loading={loading}
                        emptyMessage="No invoices found for this customer."
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
            )}

            {/* Payment Modal */}
            {showPaymentModal && selectedInvoice && (
                <InvoiceEditForm
                    invoice={selectedInvoice}
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    onSubmit={handlePaymentSubmit}
                    processing={processingPayment}
                    error={paymentError}
                    paymentOptions={getPaymentOptions()}
                    isPaymentOnly={true}
                    title="Record Payment"
                    submitText="Save Payment"
                    getStatusClass={getInvoiceStatusClass}
                    getStatusLabel={getInvoiceStatusLabel}
                />
            )}

            {/* Invoice Detail Modal */}
            {showInvoiceModal && viewInvoice && (
                <Modal
                    isOpen={showInvoiceModal}
                    onClose={handleCloseModal}
                    title={`Invoice #${viewInvoice.invoiceNumber}`}
                    size="4xl"
                >
                    <InvoiceDetail invoice={viewInvoice} />
                </Modal>
            )}
        </div>
    );
};

export default CustomerPayables; 