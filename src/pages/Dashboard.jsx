import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import { useAuth } from '../context/AuthContext.jsx';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        inventoryCount: 0,
        pendingBrokerPayments: 0,
        pendingVendorInvoices: 0,
        pendingCustomerPayments: 0,
        pendingCommissions: 0
    });
    const [loading, setLoading] = useState(true);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [fakeInvoices, setFakeInvoices] = useState([]);
    const [invoiceData, setInvoiceData] = useState({
        name: '',
        brokerName: '',
        brokerCommission: '',
        items: [{ name: '', quantity: '', netWeight: '', packagingCost: '', price: '' }],
        labour: '',
        transport: '',
        remainingAmount: '',
        pendingAmount: ''
    });
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            // Helper function to safely execute IPC calls with fallback
            const safeInvoke = async (method, params, defaultValue = 0) => {
                try {
                    const result = await ipcRenderer.invoke(method, params);
                    return result?.total || defaultValue;
                } catch (error) {
                    console.error(`Error fetching ${method}:`, error);
                    return defaultValue;
                }
            };

            // Helper function to safely get counts for items not marked as paid
            const safeGetNotPaidCount = async (method, defaultValue = 0) => {
                try {
                    const result = await ipcRenderer.invoke(method, { status: { $ne: 'paid' } });
                    return result?.total || defaultValue;
                } catch (error) {
                    console.error(`Error fetching ${method}:`, error);
                    return defaultValue;
                }
            };

            try {
                // Fetch inventory count
                const inventoryCount = await safeInvoke('get-inventory', { page: 1, perPage: 1 });

                // For brokers, vendors, and commissions, count all items not marked as paid
                const pendingBrokerPayments = await safeGetNotPaidCount('get-broker-invoices');
                const pendingVendorInvoices = await safeGetNotPaidCount('get-vendor-invoices');
                const pendingCommissions = await safeGetNotPaidCount('get-commission-sheets');

                // Keep existing logic for customer payments (using 'pending' status)
                const pendingCustomerPayments = await safeInvoke('get-customer-invoices', { status: 'pending' });

                setStats({
                    inventoryCount,
                    pendingBrokerPayments,
                    pendingVendorInvoices,
                    pendingCustomerPayments,
                    pendingCommissions
                });
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
                // Set default values in case of error
                setStats({
                    inventoryCount: 0,
                    pendingBrokerPayments: 0,
                    pendingVendorInvoices: 0,
                    pendingCustomerPayments: 0,
                    pendingCommissions: 0
                });
            } finally {
                setLoading(false);
            }
        };

        fetchStats();

        // Load saved fake invoices from localStorage
        const savedInvoices = localStorage.getItem('fakeInvoices');
        if (savedInvoices) {
            setFakeInvoices(JSON.parse(savedInvoices));
        }
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2
        }).format(parseFloat(amount) || 0);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setInvoiceData({
            ...invoiceData,
            [name]: value
        });
    };

    const handleItemChange = (index, e) => {
        const { name, value } = e.target;
        const updatedItems = [...invoiceData.items];
        updatedItems[index] = {
            ...updatedItems[index],
            [name]: value
        };
        setInvoiceData({
            ...invoiceData,
            items: updatedItems
        });
    };

    const addItem = () => {
        setInvoiceData({
            ...invoiceData,
            items: [...invoiceData.items, { name: '', quantity: '', netWeight: '', packagingCost: '', price: '' }]
        });
    };

    const removeItem = (index) => {
        const updatedItems = invoiceData.items.filter((_, i) => i !== index);
        setInvoiceData({
            ...invoiceData,
            items: updatedItems
        });
    };

    const saveFakeInvoice = () => {
        const newInvoice = {
            id: Date.now(),
            ...invoiceData,
            date: new Date().toISOString()
        };

        const updatedInvoices = [...fakeInvoices, newInvoice];
        setFakeInvoices(updatedInvoices);

        // Save to localStorage
        localStorage.setItem('fakeInvoices', JSON.stringify(updatedInvoices));

        // Reset form and close modal
        setInvoiceData({
            name: '',
            brokerName: '',
            brokerCommission: '',
            items: [{ name: '', quantity: '', netWeight: '', packagingCost: '', price: '' }],
            labour: '',
            transport: '',
            remainingAmount: '',
            pendingAmount: ''
        });
        setShowInvoiceModal(false);
    };

    const deleteFakeInvoice = (id) => {
        const updatedInvoices = fakeInvoices.filter(invoice => invoice.id !== id);
        setFakeInvoices(updatedInvoices);
        localStorage.setItem('fakeInvoices', JSON.stringify(updatedInvoices));
    };

    const statCards = [
        {
            title: 'Inventory Items',
            value: stats.inventoryCount,
            icon: (
                <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            ),
            link: '/inventory',
            color: 'blue'
        },
        {
            title: 'Pending Broker Payments',
            value: stats.pendingBrokerPayments,
            icon: (
                <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            link: '/brokers/payments',
            color: 'amber'
        },
        {
            title: 'Pending Vendor Invoices',
            value: stats.pendingVendorInvoices,
            icon: (
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            link: '/vendors/payables',
            color: 'green'
        },
        {
            title: 'Pending Customer Payments',
            value: stats.pendingCustomerPayments,
            icon: (
                <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            ),
            link: '/customers/payables',
            color: 'purple'
        },
    ];

    return (
        <div className="container mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                <p className="text-gray-600">
                    Welcome back, {user?.username}! Here's an overview of your business metrics.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    {statCards.map((card, index) => (
                        <Link
                            key={index}
                            to={card.link}
                            className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 border-l-4 border-${card.color}-500`}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-gray-500 text-sm font-medium">{card.title}</h2>
                                    <p className={`text-2xl font-bold text-${card.color}-600 mt-2`}>{card.value}</p>
                                </div>
                                <div>{card.icon}</div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Link
                        to="/inventory"
                        className="bg-blue-100 text-blue-800 p-4 rounded-lg flex items-center hover:bg-blue-200 transition-colors duration-200"
                    >
                        <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add New Inventory Item
                    </Link>
                    <Link
                        to="/customers/list"
                        className="bg-green-100 text-green-800 p-4 rounded-lg flex items-center hover:bg-green-200 transition-colors duration-200"
                    >
                        <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Add New Customer
                    </Link>
                    <Link
                        to="/customers/invoice"
                        className="bg-purple-100 text-purple-800 p-4 rounded-lg flex items-center hover:bg-purple-200 transition-colors duration-200"
                    >
                        <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Generate New Invoice
                    </Link>
                    <button
                        onClick={() => setShowInvoiceModal(true)}
                        className="bg-red-100 text-red-800 p-4 rounded-lg flex items-center hover:bg-red-200 transition-colors duration-200"
                    >
                        <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Generate Fake Invoice
                    </button>
                </div>
            </div>

            {fakeInvoices.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Fake Invoices</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white">
                            <thead>
                                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                                    <th className="py-3 px-6 text-left">Name</th>
                                    <th className="py-3 px-6 text-left">Broker</th>
                                    <th className="py-3 px-6 text-left">Date</th>
                                    <th className="py-3 px-6 text-left">Items</th>
                                    <th className="py-3 px-6 text-right">Total</th>
                                    <th className="py-3 px-6 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-600 text-sm">
                                {fakeInvoices.map((invoice) => {
                                    // Calculate total
                                    const itemsTotal = invoice.items.reduce((sum, item) => {
                                        const price = parseFloat(item.price) || 0;
                                        const quantity = parseFloat(item.quantity) || 0;
                                        return sum + (price * quantity);
                                    }, 0);

                                    const total = itemsTotal +
                                        parseFloat(invoice.labour || 0) +
                                        parseFloat(invoice.transport || 0);

                                    return (
                                        <tr key={invoice.id} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="py-3 px-6 text-left">{invoice.name}</td>
                                            <td className="py-3 px-6 text-left">{invoice.brokerName}</td>
                                            <td className="py-3 px-6 text-left">
                                                {new Date(invoice.date).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-6 text-left">
                                                {invoice.items.length} items
                                            </td>
                                            <td className="py-3 px-6 text-right">
                                                {formatCurrency(total)}
                                            </td>
                                            <td className="py-3 px-6 text-center">
                                                <div className="flex justify-center space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedInvoice(invoice);
                                                            setShowViewModal(true);
                                                        }}
                                                        className="text-blue-500 hover:text-blue-700"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => deleteFakeInvoice(invoice.id)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Fake Invoice Modal */}
            {showInvoiceModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Generate Fake Invoice</h2>
                            <button
                                onClick={() => setShowInvoiceModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={invoiceData.name}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    placeholder="Enter customer name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Broker Name</label>
                                <input
                                    type="text"
                                    name="brokerName"
                                    value={invoiceData.brokerName}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    placeholder="Enter broker name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Broker Commission</label>
                                <input
                                    type="number"
                                    name="brokerCommission"
                                    value={invoiceData.brokerCommission}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    placeholder="Enter broker commission"
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold">Items</h3>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
                                >
                                    Add Item
                                </button>
                            </div>

                            {invoiceData.items.map((item, index) => (
                                <div key={index} className="bg-gray-50 p-3 rounded-md mb-3">
                                    <div className="flex justify-between mb-2">
                                        <h4 className="font-medium">Item #{index + 1}</h4>
                                        {invoiceData.items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Item Name</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={item.name}
                                                onChange={(e) => handleItemChange(index, e)}
                                                className="w-full p-2 border border-gray-300 rounded-md"
                                                placeholder="Item name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                                            <input
                                                type="number"
                                                name="quantity"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, e)}
                                                className="w-full p-2 border border-gray-300 rounded-md"
                                                placeholder="Quantity"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Net Weight</label>
                                            <input
                                                type="number"
                                                name="netWeight"
                                                value={item.netWeight}
                                                onChange={(e) => handleItemChange(index, e)}
                                                className="w-full p-2 border border-gray-300 rounded-md"
                                                placeholder="Net weight"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Packaging Cost</label>
                                            <input
                                                type="number"
                                                name="packagingCost"
                                                value={item.packagingCost}
                                                onChange={(e) => handleItemChange(index, e)}
                                                className="w-full p-2 border border-gray-300 rounded-md"
                                                placeholder="Packaging cost"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Price</label>
                                            <input
                                                type="number"
                                                name="price"
                                                value={item.price}
                                                onChange={(e) => handleItemChange(index, e)}
                                                className="w-full p-2 border border-gray-300 rounded-md"
                                                placeholder="Price"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Labour Cost</label>
                                <input
                                    type="number"
                                    name="labour"
                                    value={invoiceData.labour}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    placeholder="Enter labour cost"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Transport Cost</label>
                                <input
                                    type="number"
                                    name="transport"
                                    value={invoiceData.transport}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    placeholder="Enter transport cost"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Remaining Amount</label>
                                <input
                                    type="number"
                                    name="remainingAmount"
                                    value={invoiceData.remainingAmount}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    placeholder="Enter remaining amount"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pending Amount</label>
                                <input
                                    type="number"
                                    name="pendingAmount"
                                    value={invoiceData.pendingAmount}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    placeholder="Enter pending amount"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowInvoiceModal(false)}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 mr-2"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={saveFakeInvoice}
                                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                            >
                                Save Invoice
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Invoice Modal */}
            {showViewModal && selectedInvoice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">View Invoice Details</h2>
                            <button
                                onClick={() => {
                                    setShowViewModal(false);
                                    setSelectedInvoice(null);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <h3 className="font-semibold text-gray-700">Customer Information</h3>
                                <p className="mt-1">Name: {selectedInvoice.name || 'N/A'}</p>
                                <p className="mt-1">Date: {new Date(selectedInvoice.date).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-700">Broker Information</h3>
                                <p className="mt-1">Name: {selectedInvoice.brokerName || 'N/A'}</p>
                                <p className="mt-1">Commission: {formatCurrency(selectedInvoice.brokerCommission || 0)}</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-700 mb-2">Items</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white border border-gray-200">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="py-2 px-4 border-b text-left">Name</th>
                                            <th className="py-2 px-4 border-b text-right">Quantity</th>
                                            <th className="py-2 px-4 border-b text-right">Net Weight</th>
                                            <th className="py-2 px-4 border-b text-right">Packaging Cost</th>
                                            <th className="py-2 px-4 border-b text-right">Price</th>
                                            <th className="py-2 px-4 border-b text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedInvoice.items.map((item, index) => {
                                            const itemTotal = (parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 0);
                                            return (
                                                <tr key={index} className="border-b">
                                                    <td className="py-2 px-4">{item.name || 'N/A'}</td>
                                                    <td className="py-2 px-4 text-right">{item.quantity || '0'}</td>
                                                    <td className="py-2 px-4 text-right">{item.netWeight || '0'}</td>
                                                    <td className="py-2 px-4 text-right">{formatCurrency(item.packagingCost || 0)}</td>
                                                    <td className="py-2 px-4 text-right">{formatCurrency(item.price || 0)}</td>
                                                    <td className="py-2 px-4 text-right">{formatCurrency(itemTotal)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <h3 className="font-semibold text-gray-700">Additional Costs</h3>
                                <p className="mt-1">Labour Cost: {formatCurrency(selectedInvoice.labour || 0)}</p>
                                <p className="mt-1">Transport Cost: {formatCurrency(selectedInvoice.transport || 0)}</p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-700">Payment Information</h3>
                                <p className="mt-1">Remaining Amount: {formatCurrency(selectedInvoice.remainingAmount || 0)}</p>
                                <p className="mt-1">Pending Amount: {formatCurrency(selectedInvoice.pendingAmount || 0)}</p>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-gray-700">Total Amount:</span>
                                <span className="text-xl font-bold text-gray-800">
                                    {formatCurrency(
                                        selectedInvoice.items.reduce((sum, item) => {
                                            return sum + ((parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 0));
                                        }, 0) +
                                        (parseFloat(selectedInvoice.labour) || 0) +
                                        (parseFloat(selectedInvoice.transport) || 0)
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard; 