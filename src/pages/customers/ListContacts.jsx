import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { useAuth } from '../../context/AuthContext.jsx';

// Reusable components (similar to previous files)
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
                                    {column.format ? column.format(item[column.key]) : item[column.key]}
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

const ListContacts = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    // State for customers
    const [customers, setCustomers] = useState([]);
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
    const [currentCustomer, setCurrentCustomer] = useState(null);

    // Form state
    const [customerForm, setCustomerForm] = useState({
        name: '',
        city: '',
        phone: ''
    });

    // Fetch customers
    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await ipcRenderer.invoke('get-customers', {
                page: currentPage,
                perPage,
                filter
            });

            setCustomers(response.customers || []);
            setTotalPages(response.totalPages || 1);
            setTotalItems(response.total || 0);
        } catch (err) {
            console.error('Error fetching customers:', err);
            setError('Failed to load customers.');
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchCustomers();
    }, [currentPage, filter]);

    // Handle page change
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // Handle filter change
    const handleFilterChange = (e) => {
        setFilter(e.target.value);
        setCurrentPage(1);
    };

    // Handle form input change
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCustomerForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle adding new customer
    const handleAddCustomer = async () => {
        if (!customerForm.name.trim() || !customerForm.city.trim()) {
            setError('Customer name and city are required.');
            return;
        }

        try {
            await ipcRenderer.invoke('add-customer', customerForm);

            // Clear form and close modal
            setCustomerForm({ name: '', city: '', phone: '' });
            setAddModalOpen(false);
            fetchCustomers();
        } catch (err) {
            console.error('Error adding customer:', err);
            setError('Failed to add new customer.');
        }
    };

    // Handle updating customer
    const handleUpdateCustomer = async () => {
        if (!customerForm.name.trim() || !customerForm.city.trim()) {
            setError('Customer name and city are required.');
            return;
        }

        try {
            await ipcRenderer.invoke('update-customer', {
                _id: currentCustomer._id,
                ...customerForm
            });

            // Clear current customer and close modal
            setCurrentCustomer(null);
            setUpdateModalOpen(false);
            fetchCustomers();
        } catch (err) {
            console.error('Error updating customer:', err);
            setError('Failed to update customer.');
        }
    };

    // Handle deleting customer
    const handleDeleteCustomer = async (customerId) => {
        if (!window.confirm('Are you sure you want to delete this customer?')) {
            return;
        }

        try {
            await ipcRenderer.invoke('delete-customer', customerId);
            fetchCustomers();
        } catch (err) {
            console.error('Error deleting customer:', err);
            setError('Failed to delete customer.');
        }
    };

    // Open add modal
    const openAddModal = () => {
        setCustomerForm({ name: '', city: '', phone: '' });
        setAddModalOpen(true);
    };

    // Open update modal
    const openUpdateModal = (customer) => {
        setCurrentCustomer(customer);
        setCustomerForm({
            name: customer.name,
            city: customer.city,
            phone: customer.phone || ''
        });
        setUpdateModalOpen(true);
    };

    // Table columns
    const columns = [
        { key: 'srNo', title: 'Sr. No.' },
        { key: 'name', title: 'Customer Name' },
        { key: 'city', title: 'City' },
        { key: 'phone', title: 'Phone Number' }
    ];

    // Add sr no to customers
    const customersWithSrNo = customers.map((customer, index) => ({
        ...customer,
        srNo: (currentPage - 1) * perPage + index + 1
    }));

    return (
        <div className="container mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Customer List</h1>
                <p className="text-gray-600">Manage your customer contacts</p>
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
                            placeholder="Filter by name, city or phone..."
                            value={filter}
                            onChange={handleFilterChange}
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="ml-0 sm:ml-4">
                        <button
                            onClick={openAddModal}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add New Customer
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
                ) : customers.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">
                        No customers found. {filter && 'Try adjusting your filter or add a new customer.'}
                    </div>
                ) : (
                    <>
                        <Table
                            data={customersWithSrNo}
                            columns={columns}
                            onUpdate={openUpdateModal}
                            onDelete={handleDeleteCustomer}
                            isAdmin={isAdmin}
                        />
                        <div className="p-4 border-t">
                            <div className="flex justify-between items-center">
                                <div className="text-sm text-gray-600">
                                    Showing {customers.length} of {totalItems} customers
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

            {/* Add Customer Modal */}
            <Modal
                isOpen={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                title="Add New Customer"
            >
                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Customer Name *
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={customerForm.name}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter customer name"
                        />
                    </div>
                    <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                            City *
                        </label>
                        <input
                            type="text"
                            id="city"
                            name="city"
                            value={customerForm.city}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter city"
                        />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number (Optional)
                        </label>
                        <input
                            type="text"
                            id="phone"
                            name="phone"
                            value={customerForm.phone}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter phone number"
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                            onClick={() => setAddModalOpen(false)}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddCustomer}
                            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Update Customer Modal */}
            <Modal
                isOpen={updateModalOpen}
                onClose={() => setUpdateModalOpen(false)}
                title="Update Customer"
            >
                <div className="space-y-4">
                    <div>
                        <label htmlFor="update-name" className="block text-sm font-medium text-gray-700 mb-1">
                            Customer Name *
                        </label>
                        <input
                            type="text"
                            id="update-name"
                            name="name"
                            value={customerForm.name}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="update-city" className="block text-sm font-medium text-gray-700 mb-1">
                            City *
                        </label>
                        <input
                            type="text"
                            id="update-city"
                            name="city"
                            value={customerForm.city}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="update-phone" className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number (Optional)
                        </label>
                        <input
                            type="text"
                            id="update-phone"
                            name="phone"
                            value={customerForm.phone}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                            onClick={() => setUpdateModalOpen(false)}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpdateCustomer}
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

export default ListContacts; 