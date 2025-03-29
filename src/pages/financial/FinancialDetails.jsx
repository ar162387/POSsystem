import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { useAuth } from '../../context/AuthContext.jsx';

// Reusable components from previous files
const Table = ({ columns, data }) => {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((item) => (
                        <tr key={item._id}>
                            {columns.map((column) => (
                                <td key={column.key} className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {column.format ? column.format(item[column.key]) : item[column.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    return (
        <div className="flex justify-between items-center mt-4">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md ${currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
            >
                Previous
            </button>
            <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
            </span>
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md ${currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
            >
                Next
            </button>
        </div>
    );
};

const FinancialDetails = () => {
    const { user } = useAuth();
    const [inventoryItems, setInventoryItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const columns = [
        { key: 'itemId', label: 'Item ID' },
        { key: 'name', label: 'Name' },
        { key: 'quantity', label: 'Stock' },
        {
            key: 'purchasePrice',
            label: 'Purchase Price',
            format: (value) => (
                <div className="text-right">
                    {new Intl.NumberFormat('en-PK', {
                        style: 'currency',
                        currency: 'PKR',
                        minimumFractionDigits: 2
                    }).format(parseFloat(value))}
                </div>
            )
        },
        {
            key: 'sellingPrice',
            label: 'Selling Price',
            format: (value) => (
                <div className="text-right">
                    {new Intl.NumberFormat('en-PK', {
                        style: 'currency',
                        currency: 'PKR',
                        minimumFractionDigits: 2
                    }).format(parseFloat(value))}
                </div>
            )
        },
        {
            key: 'profit',
            label: 'Cumulative Profit',
            format: (value) => (
                <div className="text-right">
                    {new Intl.NumberFormat('en-PK', {
                        style: 'currency',
                        currency: 'PKR',
                        minimumFractionDigits: 2
                    }).format(parseFloat(value))}
                </div>
            )
        },
        { key: 'orderCount', label: 'Order Count' }
    ];

    useEffect(() => {
        fetchInventory();
    }, [currentPage, itemsPerPage]);

    useEffect(() => {
        if (searchTerm) {
            const filtered = inventoryItems.filter(
                (item) =>
                    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.itemId.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredItems(filtered);
        } else {
            setFilteredItems(inventoryItems);
        }
    }, [searchTerm, inventoryItems]);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const result = await ipcRenderer.invoke('get-inventory', {
                page: currentPage,
                perPage: itemsPerPage,
                search: searchTerm
            });

            // Process each item to get purchase and selling price data
            const processedItems = await Promise.all(result.items.map(async item => {
                // Get purchase price history
                const purchaseHistory = await ipcRenderer.invoke('get-item-purchase-history', item.itemId);

                // Get sales history
                const salesHistory = await ipcRenderer.invoke('get-item-sales-history', item.itemId);

                // Calculate cumulative profit
                const totalPurchaseAmount = purchaseHistory.totalPurchaseAmount || 0;
                const totalSellingAmount = salesHistory.totalSellingAmount || 0;
                const cumulativeProfit = totalSellingAmount - totalPurchaseAmount;

                return {
                    ...item,
                    purchasePrice: purchaseHistory.averagePurchasePrice || item.costPrice || 0,
                    sellingPrice: salesHistory.averageSellingPrice || item.sellingPrice || 0,
                    profit: cumulativeProfit,
                    orderCount: salesHistory.orderCount || 0
                };
            }));

            setInventoryItems(processedItems);
            setFilteredItems(processedItems);
            setTotalPages(Math.ceil(result.total / itemsPerPage));
        } catch (err) {
            console.error('Error fetching inventory:', err);
            setError('Failed to load inventory data');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    return (
        <div className="container mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Financial Details</h1>
                <p className="text-gray-600">Manage pricing, costs, and profitability for inventory items</p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                    {success}
                </div>
            )}

            {/* Inventory Financial Data */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col md:flex-row justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-2 md:mb-0">Inventory Financial Data</h2>
                    <div className="flex items-center">
                        <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="10">10 per page</option>
                            <option value="25">25 per page</option>
                            <option value="50">50 per page</option>
                        </select>
                    </div>
                </div>

                {/* Real-time search bar */}
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search by item name"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                        No items found.
                    </div>
                ) : (
                    <>
                        <Table
                            columns={columns}
                            data={filteredItems}
                        />
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default FinancialDetails; 