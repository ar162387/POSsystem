import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { useAuth } from '../../context/AuthContext.jsx';

// Reusable Table Component
const Table = ({ data, columns, onUpdate, onDelete, isAdmin }) => {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                {column.title}
                            </th>
                        ))}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {data.map((item, index) => (
                        <tr key={item._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            {columns.map((column) => (
                                <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {column.render ? column.render(item) : item[column.key]}
                                </td>
                            ))}
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-y-1">
                                <button
                                    onClick={() => onUpdate(item)}
                                    className="text-indigo-600 hover:text-indigo-900 block"
                                >
                                    Update
                                </button>
                                {isAdmin && (
                                    <button
                                        onClick={() => onDelete(item._id)}
                                        className="text-red-600 hover:text-red-900 block"
                                    >
                                        Delete
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <div className="flex justify-center items-center space-x-2 mt-4">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md ${currentPage === 1
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
            >
                Previous
            </button>

            {pages.map(page => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`px-3 py-1 rounded-md ${currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    {page}
                </button>
            ))}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md ${currentPage === totalPages
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
            >
                Next
            </button>
        </div>
    );
};

// Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
};

const AddUpdateInventory = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    // State for inventory items
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const perPage = 10;

    // Filter state
    const [filter, setFilter] = useState('');

    // Modal states
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);

    // Form state for new item
    const [newItemName, setNewItemName] = useState('');
    const [newInColdStorage, setNewInColdStorage] = useState(false);
    const [newColdStorageDate, setNewColdStorageDate] = useState('');
    const [newColdStorageAddress, setNewColdStorageAddress] = useState('');

    // Form state for updating item
    const [updateForm, setUpdateForm] = useState({
        itemId: '',
        name: '',
        quantity: 0,
        netWeight: 0,
        grossWeight: 0,
        inColdStorage: false,
        coldStorageDate: '',
        coldStorageAddress: ''
    });

    // Fetch inventory items
    const fetchItems = async () => {
        try {
            setLoading(true);
            const response = await ipcRenderer.invoke('get-inventory', {
                page: currentPage,
                perPage,
                filter
            });

            setItems(response.items || []);
            setTotalPages(response.totalPages || 1);
            setTotalItems(response.total || 0);
        } catch (err) {
            console.error('Error fetching inventory:', err);
            setError('Failed to load inventory items.');
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchItems();
    }, [currentPage, filter]);

    // Handle page change
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // Handle filter change
    const handleFilterChange = (e) => {
        setFilter(e.target.value);
        setCurrentPage(1); // Reset to first page when filtering
    };

    // Handle adding new item
    const handleAddItem = async () => {
        if (!newItemName.trim()) {
            setError('Item name is required.');
            return;
        }

        // If cold storage is selected, validate the required fields
        if (newInColdStorage) {
            if (!newColdStorageDate) {
                setError('Cold storage date is required when an item is in cold storage.');
                return;
            }
            if (!newColdStorageAddress.trim()) {
                setError('Cold storage address is required when an item is in cold storage.');
                return;
            }
        }

        try {
            // Generate a unique 4-digit ID
            const itemId = await ipcRenderer.invoke('generate-item-id');

            // Create new inventory item
            await ipcRenderer.invoke('add-inventory-item', {
                itemId,
                name: newItemName,
                quantity: 0,
                netWeight: 0,
                grossWeight: 0,
                inColdStorage: newInColdStorage,
                coldStorageDate: newColdStorageDate,
                coldStorageAddress: newColdStorageAddress
            });

            // Close modal and refresh data
            setAddModalOpen(false);
            setNewItemName('');
            setNewInColdStorage(false);
            setNewColdStorageDate('');
            setNewColdStorageAddress('');
            fetchItems();
        } catch (err) {
            console.error('Error adding item:', err);
            setError('Failed to add new item.');
        }
    };

    // Handle updating item
    const handleUpdateItem = async () => {
        try {
            // Validate inputs
            if (updateForm.quantity < 0 || updateForm.netWeight < 0 || updateForm.grossWeight < 0) {
                setError('Values cannot be negative.');
                return;
            }

            // Validate cold storage fields if enabled
            if (updateForm.inColdStorage) {
                if (!updateForm.coldStorageDate) {
                    setError('Cold storage date is required when an item is in cold storage.');
                    return;
                }
                if (!updateForm.coldStorageAddress.trim()) {
                    setError('Cold storage address is required when an item is in cold storage.');
                    return;
                }
            }

            // Update inventory item
            await ipcRenderer.invoke('update-inventory-item', {
                _id: currentItem._id,
                ...updateForm
            });

            // Close modal and refresh data
            setUpdateModalOpen(false);
            setCurrentItem(null);
            fetchItems();
        } catch (err) {
            console.error('Error updating item:', err);
            setError('Failed to update item.');
        }
    };

    // Handle deleting item
    const handleDeleteItem = async (itemId) => {
        if (!window.confirm('Are you sure you want to delete this item? This will also delete any associated financial details.')) {
            return;
        }

        try {
            await ipcRenderer.invoke('delete-inventory-item', itemId);
            fetchItems();
        } catch (err) {
            console.error('Error deleting item:', err);
            setError('Failed to delete item.');
        }
    };

    // Open update modal with selected item
    const openUpdateModal = (item) => {
        setCurrentItem(item);
        setUpdateForm({
            itemId: item.itemId,
            name: item.name,
            quantity: item.quantity || 0,
            netWeight: item.netWeight || 0,
            grossWeight: item.grossWeight || 0,
            inColdStorage: item.inColdStorage || false,
            coldStorageDate: item.coldStorageDate || '',
            coldStorageAddress: item.coldStorageAddress || ''
        });
        setUpdateModalOpen(true);
    };

    // Table columns
    const columns = [
        { key: 'srNo', title: 'Sr. No.' },
        { key: 'itemId', title: 'Item ID' },
        { key: 'name', title: 'Item Name' },
        { key: 'quantity', title: 'Quantity' },
        { key: 'netWeight', title: 'Net Weight (kg)' },
        { key: 'grossWeight', title: 'Gross Weight (kg)' },
        {
            key: 'inColdStorage',
            title: 'Cold Storage',
            render: (item) => {
                if (!item.inColdStorage) return 'No';

                // Format the date
                const date = item.coldStorageDate ? new Date(item.coldStorageDate).toLocaleDateString() : 'N/A';

                return (
                    <div className="relative group">
                        <span className="text-blue-600 cursor-pointer">Yes</span>
                        <div className="absolute z-10 hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 w-48 bottom-full mb-1 left-0">
                            <p><strong>Date:</strong> {date}</p>
                            <p><strong>Address:</strong> {item.coldStorageAddress || 'N/A'}</p>
                        </div>
                    </div>
                );
            }
        }
    ];

    // Add sr no to items
    const itemsWithSrNo = items.map((item, index) => ({
        ...item,
        srNo: (currentPage - 1) * perPage + index + 1
    }));

    return (
        <div className="container mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
                <p className="text-gray-600">Add or update inventory items</p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                    {error}
                    <button
                        className="float-right"
                        onClick={() => setError('')}
                    >
                        &times;
                    </button>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 flex flex-col sm:flex-row justify-between items-center border-b">
                    <div className="flex-1 mb-3 sm:mb-0">
                        <input
                            type="text"
                            placeholder="Filter by ID or name..."
                            value={filter}
                            onChange={handleFilterChange}
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="ml-0 sm:ml-4">
                        <button
                            onClick={() => setAddModalOpen(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add New Item
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">
                        No inventory items found. {filter && 'Try adjusting your filter.'}
                    </div>
                ) : (
                    <>
                        <Table
                            data={itemsWithSrNo}
                            columns={columns}
                            onUpdate={openUpdateModal}
                            onDelete={handleDeleteItem}
                            isAdmin={isAdmin}
                        />
                        <div className="p-4 border-t">
                            <div className="flex justify-between items-center">
                                <div className="text-sm text-gray-600">
                                    Showing {items.length} of {totalItems} items
                                </div>
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={handlePageChange}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Add Item Modal */}
            <Modal
                isOpen={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                title="Add New Item"
            >
                <div className="space-y-4">
                    <div>
                        <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">
                            Item Name
                        </label>
                        <input
                            type="text"
                            id="itemName"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter item name"
                        />
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="inColdStorage"
                            checked={newInColdStorage}
                            onChange={(e) => setNewInColdStorage(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="inColdStorage" className="ml-2 block text-sm text-gray-700">
                            In Cold Storage
                        </label>
                    </div>

                    {newInColdStorage && (
                        <>
                            <div>
                                <label htmlFor="coldStorageDate" className="block text-sm font-medium text-gray-700 mb-1">
                                    Cold Storage Date
                                </label>
                                <input
                                    type="date"
                                    id="coldStorageDate"
                                    value={newColdStorageDate}
                                    onChange={(e) => setNewColdStorageDate(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="coldStorageAddress" className="block text-sm font-medium text-gray-700 mb-1">
                                    Cold Storage Address
                                </label>
                                <input
                                    type="text"
                                    id="coldStorageAddress"
                                    value={newColdStorageAddress}
                                    onChange={(e) => setNewColdStorageAddress(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter cold storage address"
                                />
                            </div>
                        </>
                    )}

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                            onClick={() => setAddModalOpen(false)}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddItem}
                            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Update Item Modal */}
            <Modal
                isOpen={updateModalOpen}
                onClose={() => setUpdateModalOpen(false)}
                title="Update Inventory Item"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Item ID
                            </label>
                            <input
                                type="text"
                                value={updateForm.itemId}
                                disabled
                                className="w-full px-3 py-2 border rounded-md bg-gray-100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Item Name
                            </label>
                            <input
                                type="text"
                                value={updateForm.name}
                                onChange={(e) => setUpdateForm({ ...updateForm, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity
                            </label>
                            <input
                                type="number"
                                value={updateForm.quantity}
                                onChange={(e) => setUpdateForm({ ...updateForm, quantity: parseFloat(e.target.value) || 0 })}
                                min="0"
                                step="0.01"
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Net Weight (kg)
                            </label>
                            <input
                                type="number"
                                value={updateForm.netWeight}
                                onChange={(e) => setUpdateForm({ ...updateForm, netWeight: parseFloat(e.target.value) || 0 })}
                                min="0"
                                step="0.01"
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Gross Weight (kg)
                            </label>
                            <input
                                type="number"
                                value={updateForm.grossWeight}
                                onChange={(e) => setUpdateForm({ ...updateForm, grossWeight: parseFloat(e.target.value) || 0 })}
                                min="0"
                                step="0.01"
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="updateInColdStorage"
                            checked={updateForm.inColdStorage}
                            onChange={(e) => setUpdateForm({ ...updateForm, inColdStorage: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="updateInColdStorage" className="ml-2 block text-sm text-gray-700">
                            In Cold Storage
                        </label>
                    </div>

                    {updateForm.inColdStorage && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cold Storage Date
                                </label>
                                <input
                                    type="date"
                                    value={updateForm.coldStorageDate || ''}
                                    onChange={(e) => setUpdateForm({ ...updateForm, coldStorageDate: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cold Storage Address
                                </label>
                                <input
                                    type="text"
                                    value={updateForm.coldStorageAddress || ''}
                                    onChange={(e) => setUpdateForm({ ...updateForm, coldStorageAddress: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter cold storage address"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                            onClick={() => setUpdateModalOpen(false)}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpdateItem}
                            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                            Update
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AddUpdateInventory; 