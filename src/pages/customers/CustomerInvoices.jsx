import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { useNavigate } from 'react-router-dom';
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
    Input,
    InvoiceEditForm
} from '../../components/common';

const CustomerInvoices = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [filteredInvoices, setFilteredInvoices] = useState([]);
    const [customerSearch, setCustomerSearch] = useState('');
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

    // Edit invoice modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [invoiceToEdit, setInvoiceToEdit] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editError, setEditError] = useState('');

    // Fetch data when success message changes (indicating a successful operation)
    useEffect(() => {
        fetchData();
    }, [success]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch customers
            const customerData = await ipcRenderer.invoke('get-customers', { page: 1, perPage: 1000 });
            setCustomers(customerData.customers || []);

            // Fetch all invoices with a single request (more efficient)
            const invoiceData = await ipcRenderer.invoke('get-invoices', { page: 1, perPage: 1000 });

            // Process and sort invoices once
            const processedInvoices = (invoiceData.invoices || [])
                .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));

            setInvoices(processedInvoices);
            applyFilters(processedInvoices, customerSearch, statusFilter);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = (invoiceList, search, status) => {
        let filtered = [...invoiceList];

        // Apply customer search filter
        if (search) {
            filtered = filtered.filter(invoice =>
                invoice.customerName?.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Apply status filter
        if (status !== 'all') {
            if (status === 'partially_paid') {
                filtered = filtered.filter(invoice =>
                    invoice.paidAmount > 0 && invoice.remainingAmount > 0
                );
            } else {
                filtered = filtered.filter(invoice => invoice.status === status);
            }
        }

        setFilteredInvoices(filtered);
        setTotalPages(Math.ceil(filtered.length / perPage));
        setCurrentPage(1); // Reset to first page when filters change
    };

    // Apply filters when search term or status filter changes
    useEffect(() => {
        applyFilters(invoices, customerSearch, statusFilter);
    }, [customerSearch, statusFilter, invoices]);

    const handleCustomerSearchChange = (e) => {
        setCustomerSearch(e.target.value);
    };

    const handleStatusFilterChange = (e) => {
        setStatusFilter(e.target.value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2
        }).format(parseFloat(amount) || 0);
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

    const handleEditInvoice = async (invoice) => {
        try {
            setLoading(true);

            // Fetch the complete invoice with detailed item information
            const detailedInvoice = await ipcRenderer.invoke('get-invoice', invoice._id);

            // Set the invoice to edit and show the edit modal
            setInvoiceToEdit(detailedInvoice);
            setShowEditModal(true);
            setEditError('');
        } catch (err) {
            console.error('Error fetching invoice details for editing:', err);
            setError('Could not load invoice details for editing. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleEditSubmit = async (updatedInvoiceData) => {
        try {
            setIsEditing(true);
            setEditError('');

            // Call the backend to update the invoice
            await ipcRenderer.invoke('update-invoice-payment', updatedInvoiceData);

            // Show success message
            setSuccess(`Invoice ${invoiceToEdit.invoiceNumber} updated successfully.`);

            // Close the edit modal
            setShowEditModal(false);
            setInvoiceToEdit(null);

            // Refresh will be handled by the useEffect that watches success
        } catch (err) {
            console.error('Error updating invoice:', err);
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

    const handleGoToGenerateInvoice = () => {
        navigate('/customers/invoice');
    };

    // Get current page of invoices
    const getCurrentPageInvoices = () => {
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        return filteredInvoices.slice(startIndex, endIndex);
    };

    // Configure columns for the invoice table
    const columns = [
        {
            key: 'srNo',
            label: 'Sr. No.',
            cell: (_, index) => ((currentPage - 1) * perPage) + index + 1
        },
        {
            key: 'invoiceNumber',
            label: 'Invoice #',
            cell: (row) => row.invoiceNumber
        },
        {
            key: 'customerName',
            label: 'Customer',
            cell: (row) => row.customerName
        },
        {
            key: 'brokerName',
            label: 'Broker',
            cell: (row) => row.brokerName || 'No Broker'
        },
        {
            key: 'totalAmount',
            label: 'Total',
            cell: (row) => formatCurrency(row.totalAmount || 0)
        },
        {
            key: 'paidAmount',
            label: 'Paid Amount',
            cell: (row) => formatCurrency(row.paidAmount || 0)
        },
        {
            key: 'remainingAmount',
            label: 'Remaining',
            cell: (row) => formatCurrency(row.remainingAmount || 0)
        },
        {
            key: 'commissionAmount',
            label: 'Broker Commission',
            cell: (row) => row.brokerName ? formatCurrency(row.commissionAmount || 0) : 'N/A'
        },
        {
            key: 'status',
            label: 'Status',
            cell: (row) => (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-md ${getInvoiceStatusClass(row)}`}>
                    {getInvoiceStatusLabel(row)}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            cell: (row) => (
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
                        onClick={() => handleEditInvoice(row)}
                        disabled={row.status === 'paid'}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={() => promptDeleteInvoice(row)}
                    >
                        Delete
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Customer Invoices</h1>
                <Button
                    variant="primary"
                    onClick={handleGoToGenerateInvoice}
                >
                    Generate Invoice
                </Button>
            </div>

            {/* Alert Messages */}
            {error && <Alert type="error" message={error} onClose={() => setError('')} className="mb-4" />}
            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} className="mb-4" />}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                    <div className="w-full md:w-1/2">
                        <label htmlFor="customerSearch" className="block text-sm font-medium text-gray-700 mb-1">
                            Customer Name
                        </label>
                        <Input
                            id="customerSearch"
                            type="text"
                            value={customerSearch}
                            onChange={handleCustomerSearchChange}
                            placeholder="Search by customer name..."
                            disabled={loading}
                        />
                    </div>
                    <div className="w-full md:w-1/2">
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
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <Table
                    columns={columns}
                    data={getCurrentPageInvoices()}
                    loading={loading}
                    emptyMessage="No invoices found matching your criteria."
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

            {/* Edit Invoice Modal */}
            {showEditModal && invoiceToEdit && (
                <InvoiceEditForm
                    invoice={invoiceToEdit}
                    isOpen={showEditModal}
                    onClose={handleCloseEditModal}
                    onSubmit={handleEditSubmit}
                    processing={isEditing}
                    error={editError}
                    title="Edit Invoice"
                    submitText="Update Invoice"
                    getStatusLabel={getInvoiceStatusLabel}
                    getStatusClass={getInvoiceStatusClass}
                    formatDate={formatDate}
                />
            )}
        </div>
    );
};

export default CustomerInvoices; 