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
    InvoiceEditForm,
    InvoiceItemsEditor
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

    // Edit invoice items modal
    const [showItemsEditModal, setShowItemsEditModal] = useState(false);
    const [invoiceItemsToEdit, setInvoiceItemsToEdit] = useState(null);
    const [isEditingItems, setIsEditingItems] = useState(false);
    const [editItemsError, setEditItemsError] = useState('');

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
            filtered = filtered.filter(invoice => {
                // Prefer using paymentStatus field directly
                if (invoice.paymentStatus) {
                    return invoice.paymentStatus === status;
                }

                // Fallback to universal status logic
                if (status === 'paid') {
                    return invoice.remainingAmount === 0;
                } else if (status === 'partially_paid') {
                    return invoice.remainingAmount < invoice.totalAmount && invoice.remainingAmount > 0;
                } else if (status === 'unpaid') {
                    return invoice.remainingAmount === invoice.totalAmount;
                }

                return true;
            });
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
        // Use paymentStatus field directly from DB
        if (invoice.paymentStatus) {
            switch (invoice.paymentStatus) {
                case 'paid':
                    return 'Paid';
                case 'partially_paid':
                    return 'Partially Paid';
                case 'unpaid':
                    return 'Unpaid';
                default:
                    return 'Unpaid';
            }
        }

        // Fallback to calculating from amounts using universal logic
        if (invoice.remainingAmount === 0) {
            return 'Paid';
        } else if (invoice.remainingAmount < invoice.totalAmount && invoice.remainingAmount > 0) {
            return 'Partially Paid';
        } else {
            return 'Unpaid';
        }
    };

    const getInvoiceStatusClass = (invoice) => {
        // Use paymentStatus field directly from DB
        if (invoice.paymentStatus) {
            switch (invoice.paymentStatus) {
                case 'paid':
                    return 'bg-green-100 text-green-800';
                case 'partially_paid':
                    return 'bg-amber-100 text-amber-800';
                case 'unpaid':
                    return 'bg-red-100 text-red-800';
                default:
                    return 'bg-red-100 text-red-800';
            }
        }

        // Fallback to calculating from amounts using universal logic
        if (invoice.remainingAmount === 0) {
            return 'bg-green-100 text-green-800';
        } else if (invoice.remainingAmount < invoice.totalAmount && invoice.remainingAmount > 0) {
            return 'bg-amber-100 text-amber-800';
        } else {
            return 'bg-red-100 text-red-800';
        }
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

    const handleEditItems = async (invoice) => {
        try {
            setLoading(true);

            // Fetch the complete invoice with detailed item information
            const detailedInvoice = await ipcRenderer.invoke('get-invoice', invoice._id);

            // Set the invoice items to edit and show the edit items modal
            setInvoiceItemsToEdit(detailedInvoice);
            setShowItemsEditModal(true);
            setEditItemsError('');
        } catch (err) {
            console.error('Error fetching invoice details for editing items:', err);
            setError('Could not load invoice details for editing items. Please try again.');
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

            // Close the edit modal
            setShowEditModal(false);
            setInvoiceToEdit(null);

            // Show success message and refresh data
            setSuccess(`Invoice ${invoiceToEdit.invoiceNumber} updated successfully.`);

            // Explicitly fetch fresh data
            await fetchData();
        } catch (err) {
            console.error('Error updating invoice:', err);
            setEditError('Failed to update invoice. Please try again.');
        } finally {
            setIsEditing(false);
        }
    };

    const handleEditItemsSubmit = async (updatedInvoiceData) => {
        try {
            setIsEditingItems(true);
            setEditItemsError('');

            // Log the data being sent to the backend
            console.log('Sending updated invoice data to backend:', {
                invoiceId: updatedInvoiceData._id,
                items: updatedInvoiceData.items.length,
                totalAmount: updatedInvoiceData.totalAmount,
                commissionAmount: updatedInvoiceData.commissionAmount,
                commissionPercentage: updatedInvoiceData.commissionPercentage,
                brokerName: updatedInvoiceData.brokerName
            });

            // Call the backend to update the invoice items
            const result = await ipcRenderer.invoke('update-invoice-items', {
                invoiceId: updatedInvoiceData._id,
                items: updatedInvoiceData.items,
                originalItems: updatedInvoiceData.originalItems,
                subtotal: updatedInvoiceData.subtotal,
                laborTransportCost: updatedInvoiceData.laborTransportCost,
                totalAmount: updatedInvoiceData.totalAmount,
                remainingAmount: updatedInvoiceData.remainingAmount,
                paidAmount: updatedInvoiceData.paidAmount,
                status: updatedInvoiceData.status,
                commissionAmount: updatedInvoiceData.commissionAmount,
                commissionPercentage: updatedInvoiceData.commissionPercentage,
                brokerName: updatedInvoiceData.brokerName
            });

            // Log the result from the backend
            console.log('Backend response:', result);

            // Show success message
            setSuccess(`Invoice items for ${invoiceItemsToEdit.invoiceNumber} updated successfully.`);

            // Close the edit items modal
            setShowItemsEditModal(false);
            setInvoiceItemsToEdit(null);

            // Refresh data to show updated values from the database
            await fetchData();
        } catch (err) {
            console.error('Error updating invoice items:', err);
            setEditItemsError('Failed to update invoice items. Please try again.');
        } finally {
            setIsEditingItems(false);
        }
    };

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setInvoiceToEdit(null);
        setEditError('');
    };

    const handleCloseItemsEditModal = () => {
        setShowItemsEditModal(false);
        setInvoiceItemsToEdit(null);
        setEditItemsError('');
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
                        disabled={row.paymentStatus === 'paid'}
                    >
                        Edit Payment
                    </Button>
                    <Button
                        variant="info"
                        size="sm"
                        onClick={() => handleEditItems(row)}
                    >
                        Edit Items
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

    // Update the status filter options
    const statusFilterOptions = [
        { value: 'all', label: 'All Statuses' },
        { value: 'unpaid', label: 'Unpaid' },
        { value: 'partially_paid', label: 'Partially Paid' },
        { value: 'paid', label: 'Paid' }
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
                            options={statusFilterOptions}
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
                    title="Warning: Permanent Invoice Deletion"
                    message={`Deleting invoice #${invoiceToDelete?.invoiceNumber} will remove the entire record and revert all changes to the database. This includes:

1. Returning all items back to inventory
2. Removing broker commission records
3. Deleting payment history
4. Permanently removing the invoice

This action cannot be undone.`}
                    item={invoiceToDelete}
                    getItemName={(inv) => inv?.invoiceNumber}
                    isProcessing={isDeleting}
                    confirmButtonText="Delete and Revert Changes"
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

            {/* Edit Invoice Items Modal */}
            {showItemsEditModal && invoiceItemsToEdit && (
                <Modal
                    isOpen={showItemsEditModal}
                    onClose={handleCloseItemsEditModal}
                    title={`Edit Items for Invoice #${invoiceItemsToEdit.invoiceNumber}`}
                    size="5xl"
                >
                    <InvoiceItemsEditor
                        invoice={invoiceItemsToEdit}
                        onSave={handleEditItemsSubmit}
                        onCancel={handleCloseItemsEditModal}
                        isLoading={isEditingItems}
                        error={editItemsError}
                        isVendorInvoice={false}
                    />
                </Modal>
            )}
        </div>
    );
};

export default CustomerInvoices; 