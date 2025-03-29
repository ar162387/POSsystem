import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import {
    Table,
    Pagination,
    Alert,
    Button,
    Input,
    Modal
} from '../../components/common';

const ListCommissioners = () => {
    // State
    const [commissioners, setCommissioners] = useState([]);
    const [filteredCommissioners, setFilteredCommissioners] = useState([]);
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
    const [currentCommissioner, setCurrentCommissioner] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        city: '',
        phone: ''
    });
    const [processing, setProcessing] = useState(false);

    // Fetch commissioners on component mount
    useEffect(() => {
        fetchCommissioners();
    }, []);

    // Filter commissioners based on search term
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredCommissioners(commissioners);
        } else {
            const term = searchTerm.toLowerCase();
            const filtered = commissioners.filter(
                commissioner =>
                    commissioner.name.toLowerCase().includes(term) ||
                    commissioner.city.toLowerCase().includes(term) ||
                    commissioner.phone.toLowerCase().includes(term)
            );
            setFilteredCommissioners(filtered);
        }
        setTotalPages(Math.ceil(filteredCommissioners.length / perPage));
        setCurrentPage(1);
    }, [searchTerm, commissioners, perPage]);

    // Fetch commissioners from the backend
    const fetchCommissioners = async () => {
        try {
            setLoading(true);
            const data = await ipcRenderer.invoke('get-commissioners', { page: 1, perPage: 1000 });
            setCommissioners(data.commissioners || []);
            setFilteredCommissioners(data.commissioners || []);
            setTotalPages(Math.ceil((data.commissioners || []).length / perPage));
        } catch (err) {
            console.error('Error fetching commissioners:', err);
            setError('Failed to load commissioners. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle input change for form fields
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Open add modal
    const handleAddClick = () => {
        setFormData({
            name: '',
            city: '',
            phone: ''
        });
        setShowAddModal(true);
    };

    // Open edit modal
    const handleEditClick = (commissioner) => {
        setCurrentCommissioner(commissioner);
        setFormData({
            name: commissioner.name || '',
            city: commissioner.city || '',
            phone: commissioner.phone || ''
        });
        setShowEditModal(true);
    };

    // Open delete modal
    const handleDeleteClick = (commissioner) => {
        setCurrentCommissioner(commissioner);
        setShowDeleteModal(true);
    };

    // Submit add form
    const handleAddSubmit = async () => {
        if (!formData.name.trim()) {
            setError('Commissioner name is required.');
            return;
        }

        try {
            setProcessing(true);
            setError('');

            const newCommissioner = await ipcRenderer.invoke('create-commissioner', formData);

            setCommissioners(prev => [...prev, newCommissioner]);
            setSuccess('Commissioner added successfully.');
            setShowAddModal(false);
            setFormData({
                name: '',
                city: '',
                phone: ''
            });
        } catch (err) {
            console.error('Error adding commissioner:', err);
            setError('Failed to add commissioner. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    // Submit edit form
    const handleEditSubmit = async () => {
        if (!formData.name.trim()) {
            setError('Commissioner name is required.');
            return;
        }

        try {
            setProcessing(true);
            setError('');

            await ipcRenderer.invoke('update-commissioner', {
                id: currentCommissioner._id,
                ...formData
            });

            setCommissioners(prev =>
                prev.map(item =>
                    item._id === currentCommissioner._id
                        ? { ...item, ...formData }
                        : item
                )
            );

            setSuccess('Commissioner updated successfully.');
            setShowEditModal(false);
            setCurrentCommissioner(null);
        } catch (err) {
            console.error('Error updating commissioner:', err);
            setError('Failed to update commissioner. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    // Submit delete
    const handleDeleteSubmit = async () => {
        try {
            setProcessing(true);
            setError('');

            await ipcRenderer.invoke('delete-commissioner', currentCommissioner._id);

            setCommissioners(prev =>
                prev.filter(item => item._id !== currentCommissioner._id)
            );

            setSuccess('Commissioner deleted successfully.');
            setShowDeleteModal(false);
            setCurrentCommissioner(null);
        } catch (err) {
            console.error('Error deleting commissioner:', err);
            setError('Failed to delete commissioner. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    // Get the current page's data
    const getCurrentPageData = () => {
        const startIndex = (currentPage - 1) * perPage;
        return filteredCommissioners.slice(startIndex, startIndex + perPage);
    };

    // Table columns configuration
    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'city', label: 'City' },
        { key: 'phone', label: 'Phone' }
    ];

    // Table actions configuration
    const actions = [
        {
            label: 'Edit',
            onClick: handleEditClick,
            className: 'text-blue-600 hover:text-blue-900'
        },
        {
            label: 'Delete',
            onClick: handleDeleteClick,
            className: 'text-red-600 hover:text-red-900'
        }
    ];

    return (
        <div className="container mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Atif Trader Commissioners</h1>
                <p className="text-gray-600">Manage commissioners for Atif Trader</p>
            </div>

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}
            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
                    <div className="w-full md:w-1/2">
                        <Input
                            type="text"
                            placeholder="Search commissioners by name, city or phone"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="w-full"
                        />
                    </div>
                    <Button variant="primary" onClick={handleAddClick}>
                        Add New Commissioner
                    </Button>
                </div>

                {loading ? (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        <p className="mt-2 text-gray-500">Loading commissioners...</p>
                    </div>
                ) : filteredCommissioners.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500">No commissioners found.</p>
                    </div>
                ) : (
                    <>
                        <Table
                            columns={columns}
                            data={getCurrentPageData()}
                            actions={actions}
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

            {/* Add Commissioner Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add New Commissioner"
                size="md"
                footer={
                    <div className="flex justify-end space-x-3">
                        <Button onClick={() => setShowAddModal(false)} variant="outline" disabled={processing}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddSubmit} variant="primary" isLoading={processing}>
                            Add Commissioner
                        </Button>
                    </div>
                }
            >
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">
                            Name*
                        </label>
                        <Input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Enter commissioner name"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">
                            City
                        </label>
                        <Input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            placeholder="Enter city"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">
                            Phone
                        </label>
                        <Input
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="Enter phone number"
                        />
                    </div>
                </div>
            </Modal>

            {/* Edit Commissioner Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Edit Commissioner"
                size="md"
                footer={
                    <div className="flex justify-end space-x-3">
                        <Button onClick={() => setShowEditModal(false)} variant="outline" disabled={processing}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditSubmit} variant="primary" isLoading={processing}>
                            Update Commissioner
                        </Button>
                    </div>
                }
            >
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">
                            Name*
                        </label>
                        <Input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Enter commissioner name"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">
                            City
                        </label>
                        <Input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            placeholder="Enter city"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">
                            Phone
                        </label>
                        <Input
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="Enter phone number"
                        />
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Confirm Delete"
                size="sm"
                footer={
                    <div className="flex justify-end space-x-3">
                        <Button onClick={() => setShowDeleteModal(false)} variant="outline" disabled={processing}>
                            Cancel
                        </Button>
                        <Button onClick={handleDeleteSubmit} variant="danger" isLoading={processing}>
                            Delete
                        </Button>
                    </div>
                }
            >
                <p>
                    Are you sure you want to delete commissioner <strong>{currentCommissioner?.name}</strong>? This action cannot be undone.
                </p>
            </Modal>
        </div>
    );
};

export default ListCommissioners; 