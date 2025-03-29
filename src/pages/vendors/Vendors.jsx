import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { useAuth } from '../../context/AuthContext.jsx';
import {
    Table,
    Pagination,
    Modal,
    Input,
    TextArea,
    Select,
    Button,
    Alert,
    DeleteConfirmation
} from '../../components/common';

const Vendors = () => {
    const { user } = useAuth();
    const [vendors, setVendors] = useState([]);
    const [filteredVendors, setFilteredVendors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [perPage] = useState(10);

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        notes: ''
    });

    // Initial data load
    useEffect(() => {
        fetchVendors();
    }, []);

    // Filter vendors when search term changes
    useEffect(() => {
        if (vendors.length > 0) {
            filterVendors();
        }
    }, [searchTerm, vendors]);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const response = await ipcRenderer.invoke('get-vendors', { page: 1, perPage: 1000 });

            if (response && response.vendors) {
                setVendors(response.vendors);
                setFilteredVendors(response.vendors);
                setTotalPages(Math.ceil(response.vendors.length / perPage));
            }
        } catch (err) {
            console.error('Error fetching vendors:', err);
            setError('Failed to load vendors. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const filterVendors = () => {
        if (!searchTerm.trim()) {
            setFilteredVendors(vendors);
        } else {
            const term = searchTerm.toLowerCase();
            const filtered = vendors.filter(vendor => {
                return (
                    vendor.name?.toLowerCase().includes(term) ||
                    vendor.contactPerson?.toLowerCase().includes(term) ||
                    vendor.email?.toLowerCase().includes(term) ||
                    vendor.phone?.includes(term)
                );
            });
            setFilteredVendors(filtered);
        }

        // Reset to first page when filters change
        setCurrentPage(1);
        setTotalPages(Math.max(1, Math.ceil(filteredVendors.length / perPage)));
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            contactPerson: '',
            email: '',
            phone: '',
            address: '',
            notes: ''
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const openAddModal = () => {
        resetForm();
        setShowAddModal(true);
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        resetForm();
    };

    const openEditModal = (vendor) => {
        setSelectedVendor(vendor);
        setFormData({
            name: vendor.name || '',
            contactPerson: vendor.contactPerson || '',
            email: vendor.email || '',
            phone: vendor.phone || '',
            address: vendor.address || '',
            notes: vendor.notes || ''
        });
        setShowEditModal(true);
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setSelectedVendor(null);
        resetForm();
    };

    const openDeleteModal = (vendor) => {
        setSelectedVendor(vendor);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setSelectedVendor(null);
    };

    const handleAddVendor = async (e) => {
        e.preventDefault();
        try {
            setIsProcessing(true);
            setError('');

            const newVendor = await ipcRenderer.invoke('add-vendor', formData);

            if (newVendor) {
                setVendors(prev => [...prev, newVendor]);
                setSuccess('Vendor added successfully');
                closeAddModal();
            }
        } catch (err) {
            console.error('Error adding vendor:', err);
            setError('Failed to add vendor. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdateVendor = async (e) => {
        e.preventDefault();
        if (!selectedVendor) return;

        try {
            setIsProcessing(true);
            setError('');

            const updatedVendor = await ipcRenderer.invoke('update-vendor', {
                _id: selectedVendor._id,
                ...formData
            });

            if (updatedVendor) {
                setVendors(prev =>
                    prev.map(vendor =>
                        vendor._id === selectedVendor._id ? updatedVendor : vendor
                    )
                );
                setSuccess('Vendor updated successfully');
                closeEditModal();
            }
        } catch (err) {
            console.error('Error updating vendor:', err);
            setError('Failed to update vendor. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteVendor = async () => {
        if (!selectedVendor) return;

        try {
            setIsProcessing(true);
            setError('');

            await ipcRenderer.invoke('delete-vendor', selectedVendor._id);

            setVendors(prev => prev.filter(vendor => vendor._id !== selectedVendor._id));
            setSuccess('Vendor deleted successfully');
            closeDeleteModal();
        } catch (err) {
            console.error('Error deleting vendor:', err);
            setError('Failed to delete vendor. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    // Get current page of vendors
    const getCurrentPageVendors = () => {
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        return filteredVendors.slice(startIndex, endIndex);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // Table columns configuration
    const columns = [
        { key: 'name', label: 'Vendor Name' },
        { key: 'contactPerson', label: 'Contact Person' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' }
    ];

    // Table actions configuration
    const actions = [
        {
            label: 'Edit',
            onClick: openEditModal,
            className: 'text-blue-600 hover:text-blue-900'
        },
        {
            label: 'Delete',
            onClick: openDeleteModal,
            className: 'text-red-600 hover:text-red-900'
        }
    ];

    return (
        <div className="container mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Vendors</h1>
                <p className="text-gray-600">Manage your vendors and suppliers</p>
            </div>

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}
            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
                    <Input
                        type="text"
                        placeholder="Search vendors..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="md:w-64"
                    />
                    <Button
                        onClick={openAddModal}
                        variant="primary"
                    >
                        Add New Vendor
                    </Button>
                </div>

                {loading ? (
                    <div className="text-center py-4">Loading vendors...</div>
                ) : filteredVendors.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">No vendors found</div>
                ) : (
                    <>
                        <Table
                            columns={columns}
                            data={getCurrentPageVendors()}
                            actions={actions}
                            keyField="_id"
                        />
                        <div className="mt-4">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Add Vendor Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={closeAddModal}
                title="Add New Vendor"
                size="lg"
            >
                <form onSubmit={handleAddVendor}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <Input
                            label="Vendor Name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                        />
                        <Input
                            label="Contact Person"
                            name="contactPerson"
                            value={formData.contactPerson}
                            onChange={handleInputChange}
                        />
                        <Input
                            label="Email"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                        />
                        <Input
                            label="Phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                        />
                    </div>
                    <Input
                        label="Address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="mb-4"
                    />
                    <TextArea
                        label="Notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        className="mb-6"
                        rows={3}
                    />

                    <div className="flex justify-end space-x-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={closeAddModal}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={isProcessing}
                        >
                            Add Vendor
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Vendor Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={closeEditModal}
                title="Edit Vendor"
                size="lg"
            >
                <form onSubmit={handleUpdateVendor}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <Input
                            label="Vendor Name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                        />
                        <Input
                            label="Contact Person"
                            name="contactPerson"
                            value={formData.contactPerson}
                            onChange={handleInputChange}
                        />
                        <Input
                            label="Email"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                        />
                        <Input
                            label="Phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                        />
                    </div>
                    <Input
                        label="Address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="mb-4"
                    />
                    <TextArea
                        label="Notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        className="mb-6"
                        rows={3}
                    />

                    <div className="flex justify-end space-x-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={closeEditModal}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={isProcessing}
                        >
                            Update Vendor
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmation
                isOpen={showDeleteModal}
                onClose={closeDeleteModal}
                onConfirm={handleDeleteVendor}
                title="Delete Vendor"
                message={`Are you sure you want to delete vendor "${selectedVendor?.name}"? This action cannot be undone.`}
                isDeleting={isProcessing}
            />
        </div>
    );
};

export default Vendors; 