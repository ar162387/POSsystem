import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { useAuth } from '../../context/AuthContext.jsx';

// Import reusable components
import {
    Table,
    Pagination,
    Modal,
    DeleteConfirmation,
    Alert,
    Button,
    Input,
    Form,
    SubmitButton
} from '../../components/common';

const ListBrokers = () => {
    const { user } = useAuth();
    const [brokers, setBrokers] = useState([]);
    const [filteredBrokers, setFilteredBrokers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [perPage] = useState(10);

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [brokerToEdit, setBrokerToEdit] = useState(null);
    const [brokerToDelete, setBrokerToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New broker form state
    const [newBroker, setNewBroker] = useState({
        name: '',
        phone: '',
        city: ''
    });

    // Form validation state
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        fetchBrokers();
    }, [success]);

    const fetchBrokers = async () => {
        try {
            setLoading(true);
            const data = await ipcRenderer.invoke('get-brokers', { page: 1, perPage: 1000 });
            setBrokers(data.brokers || []);
            setFilteredBrokers(data.brokers || []);
            setTotalPages(Math.ceil(data.brokers.length / perPage));
        } catch (err) {
            console.error('Error fetching brokers:', err);
            setError('Failed to load brokers. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle search input change
    useEffect(() => {
        if (searchTerm) {
            const lowercasedSearch = searchTerm.toLowerCase();
            const filtered = brokers.filter(broker =>
                broker.name.toLowerCase().includes(lowercasedSearch));
            setFilteredBrokers(filtered);
            setTotalPages(Math.ceil(filtered.length / perPage));
            setCurrentPage(1);
        } else {
            setFilteredBrokers(brokers);
            setTotalPages(Math.ceil(brokers.length / perPage));
        }
    }, [searchTerm, brokers, perPage]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Modal handlers
    const openAddModal = () => {
        setNewBroker({
            name: '',
            phone: '',
            city: ''
        });
        setFormErrors({});
        setShowAddModal(true);
    };

    const closeAddModal = () => {
        setShowAddModal(false);
    };

    const openEditModal = (broker) => {
        setBrokerToEdit(broker);
        setFormErrors({});
        setShowEditModal(true);
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setBrokerToEdit(null);
    };

    const promptDeleteBroker = (broker) => {
        setBrokerToDelete(broker);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setBrokerToDelete(null);
    };

    // Handle form input changes for new broker
    const handleNewBrokerChange = (e) => {
        const { name, value } = e.target;
        setNewBroker(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle form input changes for editing broker
    const handleEditBrokerChange = (e) => {
        const { name, value } = e.target;
        setBrokerToEdit(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Validate form
    const validateForm = (data) => {
        const errors = {};
        if (!data.name.trim()) {
            errors.name = 'Name is required';
        }
        return errors;
    };

    // Handle add broker form submission
    const handleAddBroker = async (e) => {
        e.preventDefault();

        // Validate form
        const errors = validateForm(newBroker);
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        try {
            setIsSubmitting(true);

            // Call the backend to add the broker
            await ipcRenderer.invoke('add-broker', newBroker);

            // Show success message and close modal
            setSuccess(`Broker ${newBroker.name} added successfully.`);
            closeAddModal();
        } catch (err) {
            console.error('Error adding broker:', err);
            setError('Failed to add broker. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle edit broker form submission
    const handleEditBroker = async (e) => {
        e.preventDefault();

        // Validate form
        const errors = validateForm(brokerToEdit);
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        try {
            setIsSubmitting(true);

            // Call the backend to update the broker
            await ipcRenderer.invoke('update-broker', brokerToEdit);

            // Show success message and close modal
            setSuccess(`Broker ${brokerToEdit.name} updated successfully.`);
            closeEditModal();
        } catch (err) {
            console.error('Error updating broker:', err);
            setError('Failed to update broker. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete broker confirmation
    const handleDeleteBroker = async () => {
        try {
            setIsSubmitting(true);

            // Call the backend to delete the broker
            await ipcRenderer.invoke('delete-broker', brokerToDelete._id);

            // Show success message and close modal
            setSuccess(`Broker ${brokerToDelete.name} deleted successfully.`);
            closeDeleteModal();
        } catch (err) {
            console.error('Error deleting broker:', err);
            setError('Failed to delete broker. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get current page of brokers
    const getCurrentPageBrokers = () => {
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        return filteredBrokers.slice(startIndex, endIndex);
    };

    // Configure columns for the brokers table
    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'phone', label: 'Phone Number' },
        { key: 'city', label: 'City' },
        {
            key: 'actions',
            label: 'Actions',
            format: (value, row) => (
                <div className="flex space-x-2">
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openEditModal(row)}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={() => promptDeleteBroker(row)}
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
                <h1 className="text-2xl font-bold">Brokers</h1>
                <Button
                    variant="primary"
                    onClick={openAddModal}
                >
                    Add New Broker
                </Button>
            </div>

            {/* Alert Messages */}
            {error && <Alert type="error" message={error} onClose={() => setError('')} className="mb-4" />}
            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} className="mb-4" />}

            {/* Search Input */}
            <div className="mb-6">
                <Input
                    type="text"
                    id="search"
                    name="search"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder="Search brokers by name..."
                    label="Search"
                />
            </div>

            {/* Brokers Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <Table
                    columns={columns}
                    data={getCurrentPageBrokers()}
                    loading={loading}
                    emptyMessage="No brokers found."
                />

                {filteredBrokers.length > 0 && (
                    <div className="p-4 border-t">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>

            {/* Add Broker Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={closeAddModal}
                title="Add New Broker"
            >
                <Form onSubmit={handleAddBroker}>
                    <Input
                        id="name"
                        name="name"
                        label="Name"
                        value={newBroker.name}
                        onChange={handleNewBrokerChange}
                        required
                        error={formErrors.name}
                    />
                    <Input
                        id="phone"
                        name="phone"
                        label="Phone Number"
                        value={newBroker.phone}
                        onChange={handleNewBrokerChange}
                    />
                    <Input
                        id="city"
                        name="city"
                        label="City"
                        value={newBroker.city}
                        onChange={handleNewBrokerChange}
                    />
                    <div className="flex justify-end space-x-3 mt-6">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={closeAddModal}
                        >
                            Cancel
                        </Button>
                        <SubmitButton
                            loading={isSubmitting}
                            disabled={isSubmitting}
                        >
                            Add Broker
                        </SubmitButton>
                    </div>
                </Form>
            </Modal>

            {/* Edit Broker Modal */}
            {showEditModal && brokerToEdit && (
                <Modal
                    isOpen={showEditModal}
                    onClose={closeEditModal}
                    title="Edit Broker"
                >
                    <Form onSubmit={handleEditBroker}>
                        <Input
                            id="name"
                            name="name"
                            label="Name"
                            value={brokerToEdit.name}
                            onChange={handleEditBrokerChange}
                            required
                            error={formErrors.name}
                        />
                        <Input
                            id="phone"
                            name="phone"
                            label="Phone Number"
                            value={brokerToEdit.phone}
                            onChange={handleEditBrokerChange}
                        />
                        <Input
                            id="city"
                            name="city"
                            label="City"
                            value={brokerToEdit.city}
                            onChange={handleEditBrokerChange}
                        />
                        <div className="flex justify-end space-x-3 mt-6">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={closeEditModal}
                            >
                                Cancel
                            </Button>
                            <SubmitButton
                                loading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                Update Broker
                            </SubmitButton>
                        </div>
                    </Form>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && brokerToDelete && (
                <DeleteConfirmation
                    isOpen={showDeleteModal}
                    onClose={closeDeleteModal}
                    onConfirm={handleDeleteBroker}
                    title="Delete Broker"
                    message={`Are you sure you want to delete broker "${brokerToDelete.name}"? This action cannot be undone.`}
                    confirmText="Delete Broker"
                    isDeleting={isSubmitting}
                />
            )}
        </div>
    );
};

export default ListBrokers; 