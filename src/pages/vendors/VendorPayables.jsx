import React, { useState, useEffect, useCallback } from 'react';
import { ipcRenderer } from 'electron';
import { useAuth } from '../../context/AuthContext.jsx';
import InvoiceEditForm from '../../components/common/InvoiceEditForm';
import {
    Table,
    Pagination,
    Alert,
    Select,
    Input,
    Modal,
    InvoiceDetail,
    Button
} from '../../components/common';

const VendorPayables = () => {
    const { user } = useAuth();
    const [vendors, setVendors] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState('');
    const [filteredInvoices, setFilteredInvoices] = useState([]);
    const [vendorTotals, setVendorTotals] = useState({});
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [paymentError, setPaymentError] = useState('');
    const [showEditForm, setShowEditForm] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [editError, setEditError] = useState('');
    const [invoiceToEdit, setInvoiceToEdit] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const perPage = 10;

    // Memoized calculation functions
    const calculateVendorTotals = useCallback((invoiceList) => {
        const totals = {};

        invoiceList.forEach(invoice => {
            if (!invoice.vendorId) return;

            if (!totals[invoice.vendorId]) {
                totals[invoice.vendorId] = {
                    totalAmount: 0,
                    paidAmount: 0,
                    remainingAmount: 0,
                    invoiceCount: 0,
                    unpaidCount: 0
                };
            }

            totals[invoice.vendorId].totalAmount += parseFloat(invoice.totalAmount || 0);
            totals[invoice.vendorId].paidAmount += parseFloat(invoice.paidAmount || 0);
            totals[invoice.vendorId].remainingAmount += parseFloat(invoice.remainingAmount || 0);
            totals[invoice.vendorId].invoiceCount += 1;

            if (invoice.status !== 'paid') {
                totals[invoice.vendorId].unpaidCount += 1;
            }
        });

        setVendorTotals(totals);
    }, []);

    const filterInvoices = useCallback(() => {
        let filtered = [...invoices];

        if (selectedVendor) {
            filtered = filtered.filter(invoice => invoice.vendorId === selectedVendor);
        }

        if (statusFilter !== 'all') {
            if (statusFilter === 'partially_paid') {
                filtered = filtered.filter(invoice => {
                    const isPaid = invoice.status === 'paid';
                    const hasRemaining = parseFloat(invoice.remainingAmount) > 0;
                    const hasPaid = parseFloat(invoice.paidAmount) > 0;
                    return !isPaid && hasPaid && hasRemaining;
                });
            } else {
                filtered = filtered.filter(invoice => invoice.status === statusFilter);
            }
        }

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(invoice =>
                invoice.invoiceNumber?.toLowerCase().includes(term) ||
                invoice.vendorName?.toLowerCase().includes(term)
            );
        }

        filtered.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));
        setFilteredInvoices(filtered);
        setTotalPages(Math.ceil(filtered.length / perPage));
        setCurrentPage(1);
    }, [invoices, selectedVendor, statusFilter, searchTerm, perPage]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [vendorData, invoiceData] = await Promise.all([
                    ipcRenderer.invoke('get-vendors', { page: 1, perPage: 100 }),
                    ipcRenderer.invoke('get-vendor-invoices', { page: 1, perPage: 1000 })
                ]);

                setVendors(vendorData.vendors || []);
                setInvoices(invoiceData.invoices || []);
                calculateVendorTotals(invoiceData.invoices || []);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [calculateVendorTotals]);

    useEffect(() => {
        filterInvoices();
    }, [filterInvoices]);

    // Helper functions
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2
        }).format(parseFloat(amount) || 0);
    };

    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';

    const getInvoiceStatusLabel = (invoice) => {
        if (invoice.status === 'paid') return 'Paid';
        if (invoice.paidAmount > 0 && invoice.remainingAmount > 0) return 'Partially Paid';
        return 'Unpaid';
    };

    const getInvoiceStatusClass = (invoice) => {
        if (invoice.status === 'paid') return 'bg-green-100 text-green-800';
        if (invoice.paidAmount > 0 && invoice.remainingAmount > 0) return 'bg-amber-100 text-amber-800';
        return 'bg-red-100 text-red-800';
    };

    const calculateItemTotal = (item) => {
        if (!item) return 0;
        const purchasePrice = parseFloat(item.purchasePrice || 0);
        const netWeight = parseFloat(item.netWeight || 0);
        const quantity = parseInt(item.quantity || 0);
        const packagingCost = parseFloat(item.packagingCost || 0);
        return (purchasePrice * netWeight) + (quantity * packagingCost);
    };

    // Handlers
    const handleViewInvoice = async (invoice) => {
        try {
            setLoading(true);
            const detailedInvoice = await ipcRenderer.invoke('get-vendor-invoice', invoice._id);
            setSelectedInvoice(detailedInvoice || invoice);
            setShowInvoiceModal(true);
        } catch (err) {
            console.error('Error fetching invoice details:', err);
            setError('Could not load invoice details. Please try again.');
            setSelectedInvoice(invoice);
            setShowInvoiceModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseInvoiceModal = () => {
        setShowInvoiceModal(false);
        setSelectedInvoice(null);
    };

    const handlePaymentSubmit = async (paymentData) => {
        try {
            setProcessingPayment(true);
            setPaymentError('');
            await ipcRenderer.invoke('update-vendor-invoice-payment', paymentData);

            setSuccess(`Payment of ${formatCurrency(paymentData.amount)} recorded successfully.`);
            const invoiceData = await ipcRenderer.invoke('get-vendor-invoices', { page: 1, perPage: 1000 });
            setInvoices(invoiceData.invoices || []);
            calculateVendorTotals(invoiceData.invoices || []);
            setShowEditForm(false);
        } catch (err) {
            console.error('Error recording payment:', err);
            setPaymentError('Failed to record payment. Please try again.');
        } finally {
            setProcessingPayment(false);
        }
    };

    // EDIT invoice
    const handleEditInvoice = async (inv) => {
        try {
            setLoading(true);

            // Load detailed invoice
            const detailed = await ipcRenderer.invoke('get-vendor-invoice', inv._id);
            setInvoiceToEdit(detailed);
            setShowEditModal(true);
            setEditError('');
        } catch (err) {
            console.error('Error loading vendor invoice for edit:', err);
            setError('Could not load vendor invoice for editing.');
        } finally {
            setLoading(false);
        }
    };

    // Submit updated payment info
    const handleEditSubmit = async (updatedData) => {
        try {
            setIsEditing(true);
            setEditError('');

            await ipcRenderer.invoke('update-vendor-invoice-payment', updatedData);

            setSuccess(`Invoice updated successfully.`);

            // Close the edit form
            setShowEditModal(false);
            setInvoiceToEdit(null);

            // Refresh data
            const invoiceData = await ipcRenderer.invoke('get-vendor-invoices', { page: 1, perPage: 1000 });
            setInvoices(invoiceData.invoices || []);
            calculateVendorTotals(invoiceData.invoices || []);

            // If currently viewing this invoice, refetch its detail
            if (selectedInvoice && selectedInvoice._id === updatedData.invoiceId) {
                const updatedInv = await ipcRenderer.invoke('get-vendor-invoice', updatedData.invoiceId);
                setSelectedInvoice(updatedInv);
            }
        } catch (err) {
            console.error('Error updating vendor invoice:', err);
            setEditError('Failed to update invoice. Please try again.');
        } finally {
            setIsEditing(false);
        }
    };

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setInvoiceToEdit(null);
        setEditError('');
    };

    // Table configuration
    const columns = [
        { key: 'invoiceNumber', label: 'Invoice #' },
        {
            key: 'invoiceDate',
            label: 'Invoice Date',
            format: (val) => formatDate(val),
        },
        {
            key: 'dueDate',
            label: 'Due Date',
            format: (val) => formatDate(val),
        },
        {
            key: 'totalAmount',
            label: 'Amount',
            format: (val) => `$${parseFloat(val).toFixed(2)}`,
        },
        {
            key: 'paidAmount',
            label: 'Paid',
            format: (val) => `$${parseFloat(val).toFixed(2)}`,
            cellClassName: 'text-green-600',
        },
        {
            key: 'remainingAmount',
            label: 'Balance',
            format: (val) => `$${parseFloat(val).toFixed(2)}`,
            cellClassName: 'text-red-600',
        },
        {
            key: 'status',
            label: 'Status',
            render: (invoice) => (
                <span className={`px-2 py-1 rounded-full text-xs ${getInvoiceStatusClass(invoice)}`}>
                    {getInvoiceStatusLabel(invoice)}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (invoice) => (
                <div className="flex space-x-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleViewInvoice(invoice)}
                    >
                        View
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleEditInvoice(invoice)}
                        disabled={invoice.status === 'paid'}
                    >
                        Update Payment
                    </Button>
                </div>
            )
        }
    ];

    const getCurrentPageInvoices = () => {
        const startIndex = (currentPage - 1) * perPage;
        return filteredInvoices.slice(startIndex, startIndex + perPage);
    };

    return (
        <div className="container mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Vendor Payables</h1>
                <p className="text-gray-600">Manage payments to vendors</p>
            </div>

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}
            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
                    <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 w-full md:w-auto">
                        <Select
                            value={selectedVendor}
                            onChange={(e) => setSelectedVendor(e.target.value)}
                            options={[
                                { value: '', label: 'All Vendors' },
                                ...vendors.map(vendor => ({
                                    value: vendor._id,
                                    label: vendor.name
                                }))
                            ]}
                            className="md:w-64"
                        />
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            options={[
                                { value: 'all', label: 'All Invoices' },
                                { value: 'paid', label: 'Paid' },
                                { value: 'partially_paid', label: 'Partially Paid' },
                                { value: 'not paid', label: 'Unpaid' }
                            ]}
                            className="md:w-48"
                        />
                        <Input
                            type="text"
                            placeholder="Search by invoice # or vendor"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="md:w-64"
                        />
                    </div>
                </div>

                {selectedVendor && vendorTotals[selectedVendor] && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                        <h3 className="text-lg font-semibold mb-2">
                            {vendors.find(v => v._id === selectedVendor)?.name} - Summary
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Total Invoices</p>
                                <p className="font-semibold">{vendorTotals[selectedVendor].invoiceCount}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Amount</p>
                                <p className="font-semibold">{formatCurrency(vendorTotals[selectedVendor].totalAmount)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Paid Amount</p>
                                <p className="font-semibold text-green-600">{formatCurrency(vendorTotals[selectedVendor].paidAmount)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Remaining Amount</p>
                                <p className="font-semibold text-red-600">{formatCurrency(vendorTotals[selectedVendor].remainingAmount)}</p>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        <p className="mt-2 text-gray-500">Loading invoice data...</p>
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500">No matching invoices found.</p>
                    </div>
                ) : (
                    <>
                        <Table
                            columns={columns}
                            data={getCurrentPageInvoices()}
                            keyField="_id"
                        />
                        <div className="mt-4">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    </>
                )}
            </div>

            {showInvoiceModal && selectedInvoice && (
                <Modal
                    isOpen={showInvoiceModal}
                    onClose={handleCloseInvoiceModal}
                    title="Invoice Details"
                    size="4xl"
                    footer={
                        <div className="flex justify-end space-x-3">
                            <Button onClick={handleCloseInvoiceModal} variant="outline">
                                Close
                            </Button>
                            <Button onClick={() => window.print()} variant="primary">
                                Print Invoice
                            </Button>
                        </div>
                    }
                >
                    <InvoiceDetail
                        invoice={selectedInvoice}
                        formatDate={formatDate}
                        calculateItemTotal={calculateItemTotal}
                        getStatusLabel={getInvoiceStatusLabel}
                        getStatusClass={getInvoiceStatusClass}
                        isVendorInvoice={true}
                    />
                </Modal>
            )}

            {showEditForm && (
                <InvoiceEditForm
                    isOpen={showEditForm}
                    onClose={() => {
                        setShowEditForm(false);
                        setSelectedInvoice(null);
                    }}
                    invoice={selectedInvoice}
                    onSubmit={handlePaymentSubmit}
                    isLoading={processingPayment}
                    error={paymentError}
                    formatDate={formatDate}
                    getStatusLabel={getInvoiceStatusLabel}
                    getStatusClass={getInvoiceStatusClass}
                    calculateItemTotal={calculateItemTotal}
                    isVendorInvoice={true}
                />
            )}

            {/* Edit Invoice Modal */}
            {showEditModal && (
                <InvoiceEditForm
                    isOpen={showEditModal}
                    onClose={handleCloseEditModal}
                    invoice={invoiceToEdit}
                    onSubmit={handleEditSubmit}
                    isLoading={isEditing}
                    error={editError}
                    formatDate={formatDate}
                    getStatusLabel={getInvoiceStatusLabel}
                    getStatusClass={getInvoiceStatusClass}
                    calculateItemTotal={calculateItemTotal}
                    isVendorInvoice={true}
                />
            )}
        </div>
    );
};

export default VendorPayables;