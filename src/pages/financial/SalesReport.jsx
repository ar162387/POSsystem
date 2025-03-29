import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

const SalesReport = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Filters state
    const [dateRange, setDateRange] = useState({
        startDate: (() => {
            const date = new Date();
            date.setMonth(date.getMonth() - 1);
            return date.toISOString().split('T')[0];
        })(),
        endDate: new Date().toISOString().split('T')[0]
    });
    const [searchFilters, setSearchFilters] = useState({
        itemName: '',
        customer: ''
    });

    // Add a state for the item dropdown
    const [itemOptions, setItemOptions] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);

    // Sales data state
    const [salesData, setSalesData] = useState({
        items: [],
        topSellingItems: [],
        leastSellingItems: [],
        totalSales: 0,
        totalQuantity: 0,
        totalNetWeight: 0
    });

    // Chart data state
    const [chartData, setChartData] = useState({
        monthlySales: { labels: [], datasets: [] },
        topItemsRevenue: { labels: [], datasets: [] }
    });

    // Quick date presets
    const datePresets = {
        lastWeek: () => {
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 7);
            const newDateRange = {
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0]
            };
            console.log('Setting preset date range:', newDateRange);
            setDateRange(newDateRange);

            // Fetch data immediately after setting the date preset
            setTimeout(() => fetchSalesData(), 100);
        },
        lastMonth: () => {
            const end = new Date();
            const start = new Date();
            start.setMonth(end.getMonth() - 1);
            const newDateRange = {
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0]
            };
            console.log('Setting preset date range:', newDateRange);
            setDateRange(newDateRange);

            // Fetch data immediately after setting the date preset
            setTimeout(() => fetchSalesData(), 100);
        },
        yearToDate: () => {
            const end = new Date();
            const start = new Date(end.getFullYear(), 0, 1);
            const newDateRange = {
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0]
            };
            console.log('Setting preset date range:', newDateRange);
            setDateRange(newDateRange);

            // Fetch data immediately after setting the date preset
            setTimeout(() => fetchSalesData(), 100);
        }
    };

    // Fetch sales data
    const fetchSalesData = async () => {
        try {
            setLoading(true);
            setError('');
            console.log(`Fetching sales data from ${dateRange.startDate} to ${dateRange.endDate}`);

            // Fetch all customer invoices for the period
            const response = await ipcRenderer.invoke('get-invoices', {
                filter: searchFilters.customer,
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                perPage: 1000 // High number to get all invoices
            });

            console.log('Received response:', response);

            // Check if response exists and has invoices property
            if (!response || !response.invoices) {
                console.warn('Invalid response structure', response);
                setError('Invalid response format received from server');
                setLoading(false);
                return;
            }

            const invoices = response.invoices;

            if (invoices.length === 0) {
                console.log('No invoices found for the selected period');
                setSalesData({
                    items: [],
                    topSellingItems: [],
                    leastSellingItems: [],
                    totalSales: 0,
                    totalQuantity: 0,
                    totalNetWeight: 0
                });

                // Set empty chart data
                setChartData({
                    monthlySales: {
                        labels: [],
                        datasets: [{
                            label: 'Monthly Sales',
                            data: [],
                            backgroundColor: 'rgba(53, 162, 235, 0.5)',
                            borderColor: 'rgb(53, 162, 235)',
                            borderWidth: 1
                        }]
                    },
                    topItemsRevenue: {
                        labels: [],
                        datasets: [{
                            label: 'Revenue',
                            data: [],
                            backgroundColor: 'rgba(75, 192, 192, 0.7)',
                            borderColor: 'rgb(75, 192, 192)',
                            borderWidth: 1
                        }]
                    }
                });

                setLoading(false);
                return;
            }

            // Process the invoice data to extract sales information
            const itemMap = new Map();
            const customerSales = new Map();
            const monthlySales = new Map();

            // Process each invoice and its items
            invoices.forEach(invoice => {
                if (!invoice) return;

                // Get the month for monthly sales chart
                const invoiceDate = new Date(invoice.invoiceDate || new Date());
                const monthYear = `${invoiceDate.toLocaleString('default', { month: 'short' })} ${invoiceDate.getFullYear()}`;

                // Add to monthly sales total
                if (!monthlySales.has(monthYear)) {
                    monthlySales.set(monthYear, 0);
                }
                monthlySales.set(monthYear, monthlySales.get(monthYear) + parseFloat(invoice.totalAmount || 0));

                // Add to customer sales
                if (invoice.customerName && !customerSales.has(invoice.customerName)) {
                    customerSales.set(invoice.customerName, 0);
                }

                if (invoice.customerName) {
                    customerSales.set(invoice.customerName,
                        customerSales.get(invoice.customerName) + parseFloat(invoice.totalAmount || 0));
                }

                // Process each item in the invoice
                if (invoice.items && Array.isArray(invoice.items)) {
                    invoice.items.forEach(item => {
                        if (!item || !item.itemId) return;

                        // Skip items that don't match the name filter if it's set
                        const itemName = item.name || item.itemName || '';
                        if (searchFilters.itemName &&
                            !itemName.toLowerCase().includes(searchFilters.itemName.toLowerCase())) {
                            return;
                        }

                        // Update or create item in the map
                        const key = item.itemId;
                        if (!itemMap.has(key)) {
                            itemMap.set(key, {
                                itemId: item.itemId,
                                name: itemName || 'Unknown Item',
                                quantitySold: 0,
                                netWeightSold: 0,
                                totalRevenue: 0,
                                averagePrice: 0,
                                salesCount: 0
                            });
                        }

                        // Update item sales data
                        const itemData = itemMap.get(key);
                        const quantity = parseFloat(item.quantity || 0);
                        const netWeight = parseFloat(item.netWeight || 0);
                        const revenue = parseFloat(item.sellingPrice || 0) * quantity;

                        itemData.quantitySold += quantity;
                        itemData.netWeightSold += netWeight;
                        itemData.totalRevenue += revenue;
                        itemData.salesCount += 1;
                        itemData.averagePrice = itemData.quantitySold > 0
                            ? itemData.totalRevenue / itemData.quantitySold
                            : 0;
                    });
                }
            });

            // Convert item map to array
            const itemsArray = Array.from(itemMap.values());

            // Sort items by revenue for top/least selling items
            const sortedByRevenue = [...itemsArray].sort((a, b) => b.totalRevenue - a.totalRevenue);
            const topItems = sortedByRevenue.slice(0, 5);
            const leastItems = [...sortedByRevenue].reverse().slice(0, 5);

            // Calculate totals
            const totalSales = itemsArray.reduce((total, item) => total + item.totalRevenue, 0);
            const totalQuantity = itemsArray.reduce((total, item) => total + item.quantitySold, 0);
            const totalNetWeight = itemsArray.reduce((total, item) => total + item.netWeightSold, 0);

            // Prepare chart data
            const monthlySalesChartData = {
                labels: Array.from(monthlySales.keys()),
                datasets: [{
                    label: 'Monthly Sales',
                    data: Array.from(monthlySales.values()),
                    backgroundColor: 'rgba(53, 162, 235, 0.5)',
                    borderColor: 'rgb(53, 162, 235)',
                    borderWidth: 1
                }]
            };

            const topItemsRevenueData = {
                labels: topItems.map(item => item.name),
                datasets: [{
                    label: 'Revenue',
                    data: topItems.map(item => item.totalRevenue),
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgb(75, 192, 192)',
                    borderWidth: 1
                }]
            };

            // Update state with all the calculated data
            setSalesData({
                items: itemsArray,
                topSellingItems: topItems,
                leastSellingItems: leastItems,
                totalSales,
                totalQuantity,
                totalNetWeight
            });

            setChartData({
                monthlySales: monthlySalesChartData,
                topItemsRevenue: topItemsRevenueData
            });

            console.log(`Processed ${itemsArray.length} unique items from ${invoices.length} invoices`);

        } catch (err) {
            console.error('Error fetching sales data:', err);
            setError('Failed to load sales data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Initial data fetch on component mount
    useEffect(() => {
        fetchSalesData();
    }, []);

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Format number
    const formatNumber = (num, decimals = 2) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(num);
    };

    // Handle search filter changes
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setSearchFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle date range changes
    const handleDateChange = (e) => {
        const { name, value } = e.target;
        console.log(`Date changed: ${name} = ${value}`);
        setDateRange(prev => {
            const newDateRange = {
                ...prev,
                [name]: value
            };
            console.log('New date range:', newDateRange);
            return newDateRange;
        });

        // Note: We don't auto-fetch on date change - user must click Apply Filters
    };

    // Add a function to fetch items for autocomplete
    const fetchItemOptions = async (searchText) => {
        if (!searchText || searchText.length < 2) {
            setItemOptions([]);
            setShowItemDropdown(false);
            return;
        }

        try {
            // Fetch items from inventory that match the search text
            const response = await ipcRenderer.invoke('search-inventory', {
                searchText,
                limit: 10
            });

            if (response && response.items) {
                setItemOptions(response.items.map(item => ({
                    id: item.itemId,
                    name: item.name
                })));
                setShowItemDropdown(true);
            } else {
                setItemOptions([]);
                setShowItemDropdown(false);
            }
        } catch (err) {
            console.error('Error fetching item suggestions:', err);
            setItemOptions([]);
            setShowItemDropdown(false);
        }
    };

    // Handle item search input change
    const handleItemSearch = (e) => {
        const { value } = e.target;
        setSearchFilters(prev => ({
            ...prev,
            itemName: value
        }));
        fetchItemOptions(value);
    };

    // Handle selecting an item from the dropdown
    const selectItem = (item) => {
        setSearchFilters(prev => ({
            ...prev,
            itemName: item.name
        }));
        setShowItemDropdown(false);
    };

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Sales Report</h1>
                <p className="text-gray-600">Analyze your sales performance and trends</p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                    {error}
                    <button className="float-right" onClick={() => setError('')}>&times;</button>
                </div>
            )}

            {/* Filters Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Filters</h2>

                {/* Date Range Selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    <div className="lg:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            name="startDate"
                            value={dateRange.startDate}
                            onChange={handleDateChange}
                            className="w-full border rounded p-2"
                        />
                    </div>
                    <div className="lg:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            name="endDate"
                            value={dateRange.endDate}
                            onChange={handleDateChange}
                            className="w-full border rounded p-2"
                        />
                    </div>
                    <div className="lg:col-span-3 flex items-end space-x-2">
                        <button
                            onClick={datePresets.lastWeek}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                            Last Week
                        </button>
                        <button
                            onClick={datePresets.lastMonth}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                            Last Month
                        </button>
                        <button
                            onClick={datePresets.yearToDate}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                            Year to Date
                        </button>
                        <button
                            onClick={fetchSalesData}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ml-auto"
                            disabled={loading}
                        >
                            {loading ? 'Loading...' : 'Apply Filters'}
                        </button>
                    </div>
                </div>

                {/* Additional Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                        <input
                            type="text"
                            name="itemName"
                            value={searchFilters.itemName}
                            onChange={handleItemSearch}
                            onFocus={() => searchFilters.itemName && fetchItemOptions(searchFilters.itemName)}
                            onBlur={() => setTimeout(() => setShowItemDropdown(false), 200)}
                            placeholder="Search by item name"
                            className="w-full border rounded p-2"
                        />
                        {showItemDropdown && itemOptions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                                {itemOptions.map(item => (
                                    <div
                                        key={item.id}
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                        onMouseDown={() => selectItem(item)}
                                    >
                                        {item.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                        <input
                            type="text"
                            name="customer"
                            value={searchFilters.customer}
                            onChange={handleFilterChange}
                            placeholder="Filter by customer"
                            className="w-full border rounded p-2"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
                    <p className="ml-2 text-gray-500">Loading sales data...</p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Sales</h3>
                            <p className="text-3xl font-bold text-blue-600">{formatCurrency(salesData.totalSales)}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">Items Sold</h3>
                            <p className="text-3xl font-bold text-green-600">{formatNumber(salesData.totalQuantity, 0)}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Net Weight</h3>
                            <p className="text-3xl font-bold text-purple-600">{formatNumber(salesData.totalNetWeight)} kg</p>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 gap-6 mb-6">
                        {/* Monthly Sales Trend */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold mb-4">Monthly Sales Trend</h3>
                            <div className="h-80">
                                <Line
                                    data={chartData.monthlySales}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: {
                                                position: 'top',
                                            },
                                            tooltip: {
                                                callbacks: {
                                                    label: function (context) {
                                                        let label = context.dataset.label || '';
                                                        if (label) {
                                                            label += ': ';
                                                        }
                                                        if (context.parsed.y !== null) {
                                                            label += formatCurrency(context.parsed.y);
                                                        }
                                                        return label;
                                                    }
                                                }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Top 5 vs Bottom 5 Items */}
                    <div className="grid grid-cols-1 gap-6 mb-6">
                        {/* Top Selling Items */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold mb-4">Top Selling Items</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {salesData.topSellingItems.map((item) => (
                                            <tr key={item.itemId}>
                                                <td className="px-4 py-3 whitespace-nowrap">{item.name}</td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap">{formatNumber(item.quantitySold, 0)}</td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap">{formatCurrency(item.totalRevenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-6">
                                <Bar
                                    data={chartData.topItemsRevenue}
                                    options={{
                                        responsive: true,
                                        plugins: {
                                            legend: { display: false },
                                            tooltip: {
                                                callbacks: {
                                                    label: function (context) {
                                                        return formatCurrency(context.parsed.y);
                                                    }
                                                }
                                            }
                                        },
                                        scales: {
                                            y: {
                                                ticks: {
                                                    callback: function (value) {
                                                        return formatCurrency(value);
                                                    }
                                                }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Least Selling Items */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold mb-4">Least Selling Items</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {salesData.leastSellingItems.map((item) => (
                                            <tr key={item.itemId}>
                                                <td className="px-4 py-3 whitespace-nowrap">{item.name}</td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap">{formatNumber(item.quantitySold, 0)}</td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap">{formatCurrency(item.totalRevenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Item Analysis */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold mb-4">Item-by-Item Analysis</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity Sold</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Weight</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Selling Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {salesData.items.map((item) => (
                                        <tr key={item.itemId}>
                                            <td className="px-4 py-3 whitespace-nowrap">{item.name}</td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">{formatNumber(item.quantitySold, 0)}</td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">{formatNumber(item.netWeightSold)} kg</td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">{formatCurrency(item.totalRevenue)}</td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">{formatCurrency(item.averagePrice)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SalesReport; 