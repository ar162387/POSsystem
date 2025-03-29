import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { useAuth } from '../../context/AuthContext.jsx';

const ProfitLoss = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Date range state
    const [startDate, setStartDate] = useState(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return firstDay.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    // Financial data state
    const [financialData, setFinancialData] = useState({
        totalSales: 0,
        totalDirectCosts: 0,
        grossProfit: 0,
        totalOverheads: 0,
        brokerCommissions: 0,
        netProfit: 0
    });

    // Fetch financial data based on date range
    const fetchFinancialData = async () => {
        try {
            setLoading(true);
            setError('');
            console.log(`Fetching data for date range: ${startDate} to ${endDate}`);

            // Use the dedicated profit-loss IPC route
            const data = await ipcRenderer.invoke('get-profit-loss', {
                startDate,
                endDate
            });

            console.log("Received financial data:", data);

            setFinancialData({
                totalSales: data.totalSales || 0,
                totalDirectCosts: data.totalDirectCosts || 0,
                grossProfit: data.grossProfit || 0,
                totalOverheads: data.totalOverheads || 0,
                brokerCommissions: data.brokerCommissions || 0,
                netProfit: data.netProfit || 0
            });
        } catch (err) {
            console.error('Error fetching financial data:', err);
            setError('Failed to load financial data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Don't automatically trigger the fetch on component mount or date changes
    // This prevents unwanted API calls and allows explicit user control
    useEffect(() => {
        fetchFinancialData();
    }, []); // Only run once on initial mount

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Get color class for profit or loss
    const getProfitLossColorClass = (amount) => {
        return amount >= 0 ? 'text-green-600' : 'text-red-600';
    };

    return (
        <div className="container mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Profit and Loss Statement</h1>
                <p className="text-gray-600">View your business financial performance</p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                    {error}
                    <button className="float-right" onClick={() => setError('')}>&times;</button>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
                    <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 w-full">
                        <div className="md:w-1/3">
                            <label className="block text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full border rounded p-2"
                            />
                        </div>
                        <div className="md:w-1/3">
                            <label className="block text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full border rounded p-2"
                            />
                        </div>
                        <div className="md:w-1/3 flex items-end">
                            <button
                                onClick={fetchFinancialData}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
                                disabled={loading}
                            >
                                {loading ? 'Loading...' : 'Update Report'}
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
                        <p className="ml-2 text-gray-500">Loading financial data...</p>
                    </div>
                ) : (
                    <>
                        {/* Main Financial Summary */}
                        <div className="mb-8">
                            <div className="flex justify-center items-center mb-6">
                                <div className={`text-center p-6 rounded-lg ${financialData.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'} max-w-sm`}>
                                    <h3 className="text-lg font-semibold mb-2">
                                        {financialData.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
                                    </h3>
                                    <p className={`text-3xl font-bold ${getProfitLossColorClass(financialData.netProfit)}`}>
                                        {formatCurrency(financialData.netProfit)}
                                    </p>
                                    <p className="text-gray-600 mt-2">
                                        For period: {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-hidden bg-gray-50 rounded-lg shadow">
                                <div className="px-4 py-5 sm:p-6">
                                    <dl className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div className="border-b md:border-b-0 md:border-r border-gray-200 pb-6 md:pr-6">
                                            <dt className="text-base font-normal text-gray-900">Total Sales</dt>
                                            <dd className="mt-1 flex justify-between items-baseline md:block lg:flex">
                                                <div className="flex items-baseline text-2xl font-semibold text-blue-600">
                                                    {formatCurrency(financialData.totalSales)}
                                                </div>
                                            </dd>

                                            <dt className="mt-4 text-base font-normal text-gray-900">Total Direct Costs</dt>
                                            <dd className="mt-1 flex justify-between items-baseline md:block lg:flex">
                                                <div className="flex items-baseline text-2xl font-semibold text-red-600">
                                                    {formatCurrency(financialData.totalDirectCosts)}
                                                </div>
                                            </dd>

                                            <dt className="mt-6 text-lg font-medium text-gray-900">Gross Profit</dt>
                                            <dd className="mt-1 flex justify-between items-baseline md:block lg:flex">
                                                <div className={`flex items-baseline text-2xl font-semibold ${getProfitLossColorClass(financialData.grossProfit)}`}>
                                                    {formatCurrency(financialData.grossProfit)}
                                                </div>
                                            </dd>
                                        </div>

                                        <div className="pt-6 md:pt-0 md:pl-6">
                                            <dt className="text-base font-normal text-gray-900">Broker Commissions</dt>
                                            <dd className="mt-1 flex justify-between items-baseline md:block lg:flex">
                                                <div className="flex items-baseline text-2xl font-semibold text-red-600">
                                                    {formatCurrency(financialData.brokerCommissions || 0)}
                                                </div>
                                            </dd>

                                            <dt className="mt-4 text-base font-normal text-gray-900">Overhead Costs</dt>
                                            <dd className="mt-1 flex justify-between items-baseline md:block lg:flex">
                                                <div className="flex items-baseline text-2xl font-semibold text-red-600">
                                                    {formatCurrency(financialData.totalOverheads)}
                                                </div>
                                                <div className="text-sm text-gray-500">(Estimated at 10% of gross profit)</div>
                                            </dd>

                                            <dt className="mt-6 text-lg font-medium text-gray-900">Net Profit</dt>
                                            <dd className="mt-1 flex justify-between items-baseline md:block lg:flex">
                                                <div className={`flex items-baseline text-2xl font-semibold ${getProfitLossColorClass(financialData.netProfit)}`}>
                                                    {formatCurrency(financialData.netProfit)}
                                                </div>
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                        </div>

                        {/* Simplified Formula Explanation */}
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold mb-4">How We Calculate Your Profit</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-gray-300 pb-2">
                                    <span className="font-medium">Total Sales</span>
                                    <span>{formatCurrency(financialData.totalSales)}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-300 pb-2">
                                    <span className="font-medium">- Total Direct Costs</span>
                                    <span>{formatCurrency(financialData.totalDirectCosts)}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-300 pb-2">
                                    <span className="font-medium">= Gross Profit</span>
                                    <span className={getProfitLossColorClass(financialData.grossProfit)}>
                                        {formatCurrency(financialData.grossProfit)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-300 pb-2">
                                    <span className="font-medium">- Broker Commissions</span>
                                    <span>{formatCurrency(financialData.brokerCommissions || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-300 pb-2">
                                    <span className="font-medium">- Overhead Costs</span>
                                    <span>{formatCurrency(financialData.totalOverheads)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="font-bold text-lg">= Net Profit</span>
                                    <span className={`font-bold text-lg ${getProfitLossColorClass(financialData.netProfit)}`}>
                                        {formatCurrency(financialData.netProfit)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ProfitLoss; 