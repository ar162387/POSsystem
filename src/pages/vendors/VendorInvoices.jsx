import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

// Reusable components (same ones used for customers, but we'll pass isVendorInvoice = true)
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

const VendorInvoices = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Invoices and vendor data
    const [invoices, setInvoices] = useState([]);
    const [vendors, setVendors] = useState([]);

    // Filter & search
    const [filteredInvoices, setFilteredInvoices] = useState([]);
    const [vendorSearch, setVendorSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

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

    useEffect(() => {
        fetchData();
    }, [success]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1) Fetch vendors (if needed for vendorSearch, etc.)
            const vendorData = await ipcRenderer.invoke('get-vendors', { page: 1, perPage: 1000 });
            setVendors(vendorData.vendors || []);

            // 2) Fetch vendor invoices
            const invoiceData = await ipcRenderer.invoke('get-vendor-invoices', { page: 1, perPage: 1000 });
            const rawInvoices = invoiceData.invoices || [];

            // If your data has "invoiceDate" (instead of "issueDate"), sort by that:
            const sorted = rawInvoices
                .map(inv => ({
                    ...inv,
                    items: inv.items?.map(item => ({
                        ...item,
                        total: calculateItemTotal(item)
                    })) || []
                }))
                .sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

            setInvoices(sorted);
            applyFilters(sorted, vendorSearch, statusFilter);
        } catch (err) {
            console.error('Error fetching vendor invoices:', err);
            setError('Failed to load vendor invoices. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Apply search & status filters
    const applyFilters = (allInvoices, search, status) => {
        let filtered = [...allInvoices];

        // Filter by vendor name
        if (search) {
            filtered = filtered.filter(inv =>
                inv.vendorName?.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Filter by status
        if (status !== 'all') {
            if (status === 'partially_paid') {
                filtered = filtered.filter(inv => {
                    // Check paymentStatus field first
                    if (inv.paymentStatus === 'partially_paid') return true;

                    // Then fall back to legacy calculations
                    const isPaid = inv.status === 'paid' || inv.paymentStatus === 'paid';
                    const hasRemaining = inv.remainingAmount > 0;
                    const hasSomePaid = inv.paidAmount > 0;
                    return !isPaid && hasSomePaid && hasRemaining;
                });
            } else {
                filtered = filtered.filter(inv => {
                    // Check both paymentStatus and status fields
                    return inv.paymentStatus === status || inv.status === status;
                });
            }
        }

        setFilteredInvoices(filtered);
        setTotalPages(Math.ceil(filtered.length / perPage));

        // Reset to first page if filter changes
        setCurrentPage(1);
    };

    useEffect(() => {
        applyFilters(invoices, vendorSearch, statusFilter);
    }, [vendorSearch, statusFilter, invoices]);

    const handleVendorSearchChange = (e) => {
        setVendorSearch(e.target.value);
    };

    const handleStatusFilterChange = (e) => {
        setStatusFilter(e.target.value);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    // Status label / style
    const getInvoiceStatusLabel = (inv) => {
        // First check the paymentStatus field which is set by the backend
        if (inv.paymentStatus) {
            switch (inv.paymentStatus) {
                case 'paid':
                    return 'Paid';
                case 'partially_paid':
                    return 'Partially Paid';
                case 'unpaid':
                    return 'Unpaid';
                default:
                    break; // Fall through to the next check
            }
        }

        // Fallback to the status field
        if (inv.status === 'paid') return 'Paid';

        // Fallback to calculation based on amounts
        if (inv.paidAmount > 0 && inv.remainingAmount > 0) return 'Partially Paid';
        if (inv.remainingAmount === 0 && inv.paidAmount > 0) return 'Paid';
        return 'Unpaid';
    };

    const getInvoiceStatusClass = (inv) => {
        // First check the paymentStatus field which is set by the backend
        if (inv.paymentStatus) {
            switch (inv.paymentStatus) {
                case 'paid':
                    return 'bg-green-100 text-green-800';
                case 'partially_paid':
                    return 'bg-amber-100 text-amber-800';
                case 'unpaid':
                    return 'bg-red-100 text-red-800';
                default:
                    break; // Fall through to the next check
            }
        }

        // Fallback to the status field
        if (inv.status === 'paid') return 'bg-green-100 text-green-800';

        // Fallback to calculation based on amounts
        if (inv.paidAmount > 0 && inv.remainingAmount > 0) return 'bg-amber-100 text-amber-800';
        if (inv.remainingAmount === 0 && inv.paidAmount > 0) return 'bg-green-100 text-green-800';
        return 'bg-red-100 text-red-800';
    };

    // Calculate item total for vendor invoice
    const calculateItemTotal = (item) => {
        if (!item) return 0;
        const purchasePrice = parseFloat(item.purchasePrice || item.costPrice || 0);
        const netWeight = parseFloat(item.netWeight || 0);
        const qty = parseInt(item.quantity || 0);
        const packaging = parseFloat(item.packagingCost || 0);

        // For vendors: (purchasePrice * netWeight) + (qty * packagingCost)
        return (purchasePrice * netWeight) + (qty * packaging);
    };

    // VIEW invoice
    const handleViewInvoice = async (inv) => {
        try {
            setLoading(true);

            const detailed = await ipcRenderer.invoke('get-vendor-invoice', inv._id);
            // Or fallback if error:
            setSelectedInvoice(detailed || inv);
            setShowInvoiceModal(true);
        } catch (err) {
            console.error('Error loading vendor invoice detail:', err);
            // fallback to basic invoice
            setSelectedInvoice(inv);
            setShowInvoiceModal(true);
        } finally {
            setLoading(false);
        }
    };

    // EDIT invoice payment
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

    // EDIT invoice items
    const handleEditItems = async (inv) => {
        try {
            setLoading(true);

            // Load detailed invoice
            const detailed = await ipcRenderer.invoke('get-vendor-invoice', inv._id);
            setInvoiceItemsToEdit(detailed);
            setShowItemsEditModal(true);
            setEditItemsError('');
        } catch (err) {
            console.error('Error loading vendor invoice for item editing:', err);
            setError('Could not load vendor invoice items for editing.');
        } finally {
            setLoading(false);
        }
    };

    // Submit updated payment info
    const handleEditSubmit = async (updatedData) => {
        try {
            setIsEditing(true);
            setEditError('');

            // This route might be 'update-vendor-invoice-payment' or 'update-vendor-invoice'
            // Adjust to match your actual IPC method
            await ipcRenderer.invoke('update-vendor-invoice-payment', updatedData);

            setSuccess(`Invoice updated successfully.`);

            // Close the edit form
            setShowEditModal(false);
            setInvoiceToEdit(null);

            // Refresh data
            await fetchData();

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

    // Submit updated items info
    const handleEditItemsSubmit = async (updatedInvoiceData) => {
        try {
            setIsEditingItems(true);
            setEditItemsError('');

            // Call the backend to update the invoice items
            await ipcRenderer.invoke('update-vendor-invoice-items', {
                invoiceId: updatedInvoiceData._id,
                items: updatedInvoiceData.items,
                subtotal: updatedInvoiceData.subtotal,
                labourTransportCost: updatedInvoiceData.labourTransportCost,
                totalAmount: updatedInvoiceData.totalAmount
            });

            setSuccess(`Invoice items for ${invoiceItemsToEdit.invoiceNumber} updated successfully.`);

            // Close the edit items modal
            setShowItemsEditModal(false);
            setInvoiceItemsToEdit(null);

            // Refresh data
            await fetchData();

            // If currently viewing this invoice, refetch its detail
            if (selectedInvoice && selectedInvoice._id === updatedInvoiceData._id) {
                const updatedInv = await ipcRenderer.invoke('get-vendor-invoice', updatedInvoiceData._id);
                setSelectedInvoice(updatedInv);
            }
        } catch (err) {
            console.error('Error updating vendor invoice items:', err);
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

    // DELETE invoice
    const promptDeleteInvoice = (inv) => {
        setInvoiceToDelete(inv);
        setShowDeleteModal(true);
    };

    const handleDeleteInvoice = async () => {
        if (!invoiceToDelete) return;
        try {
            setIsDeleting(true);
            setError('');

            // Call backend to delete
            await ipcRenderer.invoke('delete-vendor-invoice', invoiceToDelete._id);

            setSuccess(`Invoice #${invoiceToDelete.invoiceNumber} deleted successfully.`);

            // Remove from list
            const remaining = invoices.filter(i => i._id !== invoiceToDelete._id);
            setInvoices(remaining);
            applyFilters(remaining, vendorSearch, statusFilter);
        } catch (err) {
            console.error('Error deleting vendor invoice:', err);
            setError('Failed to delete invoice. Please try again.');
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
            setInvoiceToDelete(null);
        }
    };

    // Close detail modal
    const handleCloseModal = () => {
        setShowInvoiceModal(false);
        setSelectedInvoice(null);
    };

    // Navigate to "Generate Vendor Invoice" page
    const handleGoToGenerateInvoice = () => {
        navigate('/vendors/generate');
    };

    // Return the current page's slice of invoices
    const getCurrentPageInvoices = () => {
        const startIndex = (currentPage - 1) * perPage;
        return filteredInvoices.slice(startIndex, startIndex + perPage);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2
        }).format(parseFloat(amount) || 0);
    };

    // Table columns
    const columns = [
        { key: 'invoiceNumber', label: 'Invoice #' },
        {
            key: 'invoiceDate', // instead of issueDate
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
            format: (val) => formatCurrency(val),
        },
        {
            key: 'paidAmount',
            label: 'Paid',
            format: (val) => formatCurrency(val),
            cellClassName: 'text-green-600',
        },
        {
            key: 'remainingAmount',
            label: 'Balance',
            format: (val) => formatCurrency(val),
            cellClassName: 'text-red-600',
        },
        {
            key: 'status',
            label: 'Status',
            render: (inv) => (
                <span className={`px-2 py-1 rounded-full text-xs ${getInvoiceStatusClass(inv)}`}>
                    {getInvoiceStatusLabel(inv)}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (inv) => (
                <div className="flex flex-col space-y-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleViewInvoice(inv)}
                    >
                        View
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleEditInvoice(inv)}
                        disabled={inv.status === 'paid'}
                    >
                        Edit Payment
                    </Button>
                    <Button
                        variant="info"
                        size="sm"
                        onClick={() => handleEditItems(inv)}
                    >
                        Edit Items
                    </Button>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={() => promptDeleteInvoice(inv)}
                    >
                        Delete
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="container mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Vendor Invoices</h1>
                <p className="text-gray-600">View and manage all vendor invoices</p>
            </div>

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}
            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                {/* Filters & Create New */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
                    <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 w-full md:w-auto">
                        <Input
                            type="text"
                            placeholder="Search by vendor name"
                            value={vendorSearch}
                            onChange={handleVendorSearchChange}
                            className="md:w-64"
                        />
                        <Select
                            value={statusFilter}
                            onChange={handleStatusFilterChange}
                            options={[
                                { value: 'all', label: 'All Invoices' },
                                { value: 'paid', label: 'Paid' },
                                { value: 'partially_paid', label: 'Partially Paid' },
                                { value: 'not paid', label: 'Unpaid' },
                            ]}
                            className="md:w-48"
                        />
                    </div>

                    <Button variant="primary" onClick={handleGoToGenerateInvoice}>
                        Generate New Invoice
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
                        <p className="ml-2 text-gray-500">Loading vendor invoices...</p>
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500">No invoices found.</p>
                    </div>
                ) : (
                    <>
                        <Table
                            data={getCurrentPageInvoices()}
                            columns={columns}
                            emptyMessage="No invoices found"
                        />

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            totalItems={filteredInvoices.length}
                            itemsPerPage={perPage}
                        />
                    </>
                )}
            </div>

            {/* View Invoice Modal */}
            {showInvoiceModal && (
                <Modal
                    isOpen={showInvoiceModal}
                    onClose={handleCloseModal}
                    title="Invoice Details"
                    size="4xl"
                    footer={
                        <div className="flex justify-end space-x-3">
                            <Button onClick={handleCloseModal} variant="outline">
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

            {/* Delete Confirmation Modal */}
            <DeleteConfirmation
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteInvoice}
                title="Warning: Permanent Invoice Deletion"
                message={`Deleting invoice #${invoiceToDelete?.invoiceNumber} will remove the entire record and revert all changes to the database. This includes:

1. Removing all items from inventory that were added through this invoice
2. Deleting payment history
3. Permanently removing the invoice

This action cannot be undone.`}
                item={invoiceToDelete}
                getItemName={(inv) => inv?.invoiceNumber}
                isProcessing={isDeleting}
                confirmButtonText="Delete and Revert Changes"
            />

            {/* Edit Invoice Modal */}
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
                        isVendorInvoice={true}
                    />
                </Modal>
            )}
        </div>
    );
};

export default VendorInvoices;
