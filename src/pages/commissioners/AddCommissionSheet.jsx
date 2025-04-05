import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import Combobox from '../../components/common/Combobox';

// ... existing imports ...

const AddCommissionSheet = () => {
    // State declarations
    const [invoiceKey, setInvoiceKey] = useState('ATC-XXXX');
    const [invoiceDate, setInvoiceDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [commissioners, setCommissioners] = useState([]);
    const [selectedCommissioner, setSelectedCommissioner] = useState('');
    const [buyerName, setBuyerName] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [inventoryItems, setInventoryItems] = useState([]);
    const [items, setItems] = useState([
        { itemId: '', quantity: 0, netWeight: 0, price: 0, packagingCost: 0 }
    ]);
    const [tradersCommissionPercent, setTradersCommissionPercent] = useState(0);
    const [receivedAmount, setReceivedAmount] = useState(0);
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [previewInvoice, setPreviewInvoice] = useState(null);
    const [brokerCommission, setBrokerCommission] = useState(0);
    const [brokerCommissionPercentage, setBrokerCommissionPercentage] = useState(0);
    const [isVendorInvoice, setIsVendorInvoice] = useState(false);

    // Fetch commissioners and inventory items on component mount
    useEffect(() => {
        fetchCommissioners();
        fetchInventoryItems();
    }, []);

    // Fetch commissioners
    const fetchCommissioners = async () => {
        try {
            setLoading(true);
            const data = await ipcRenderer.invoke('get-commissioners', { page: 1, perPage: 1000 });
            setCommissioners(data.commissioners || []);
        } catch (err) {
            console.error('Error fetching commissioners:', err);
            setError('Failed to load commissioners.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch inventory items
    const fetchInventoryItems = async () => {
        try {
            setLoading(true);
            const data = await ipcRenderer.invoke('get-inventory', { page: 1, perPage: 1000 });
            setInventoryItems(data.items || []);
        } catch (err) {
            console.error('Error fetching inventory items:', err);
            setError('Failed to load inventory items.');
        } finally {
            setLoading(false);
        }
    };

    // Commissioner selection handlers
    const handleCommissionerChange = (commissioner) => {
        setSelectedCommissioner(commissioner._id);
    };

    const getCommissionerDisplayValue = (commissioner) => {
        return commissioner?.name || '';
    };

    // Item selection handlers
    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        if (field === 'itemId' && typeof value === 'object') {
            // If selecting from dropdown, value is the full item object
            newItems[index] = {
                ...newItems[index],
                itemId: value._id,
                name: value.name
            };
        } else {
            // For other fields or direct input
            newItems[index][field] = value;
        }
        setItems(newItems);
    };

    const getItemDisplayValue = (item) => {
        return item?.name ? `${item.name} - ${item.itemId || ''}` : '';
    };

    // Add/Remove item handlers
    const addItem = () => {
        setItems([...items, { itemId: '', quantity: 0, netWeight: 0, price: 0, packagingCost: 0 }]);
    };

    const removeItem = (index) => {
        if (items.length > 1) {
            const newItems = [...items];
            newItems.splice(index, 1);
            setItems(newItems);
        } else {
            setError('At least one item is required.');
        }
    };

    // Calculate totals
    const itemTotal = (item) => {
        const sellingPrice = item.price * item.netWeight;
        const packingCost = item.packagingCost * item.quantity;
        return sellingPrice + packingCost;
    };

    const totalPrice = items.reduce((sum, item) => sum + itemTotal(item), 0);
    const commissionPrice = (tradersCommissionPercent / 100) * totalPrice;
    const pendingAmount = commissionPrice - receivedAmount;

    // Preview and Save handlers
    const handlePreviewInvoice = async () => {
        if (!selectedCommissioner) {
            setError('Please select a commissioner.');
            return;
        }

        if (items.some(item => !item.itemId)) {
            setError('Please select an item for each row.');
            return;
        }

        const invoiceData = {
            invoiceKey,
            invoiceDate,
            commissionerId: selectedCommissioner,
            buyerName,
            customerName,
            items: items.map((item) => ({
                itemId: item.itemId,
                quantity: item.quantity,
                netWeight: item.netWeight,
                price: item.price,
                packagingCost: item.packagingCost,
                total: itemTotal(item)
            })),
            totalPrice,
            tradersCommissionPercent,
            commissionPrice,
            receivedAmount,
            pendingAmount,
            dueDate,
            brokerCommission: !isVendorInvoice ? brokerCommission : undefined,
            brokerCommissionPercentage: !isVendorInvoice ? brokerCommissionPercentage : undefined
        };

        try {
            setLoading(true);
            setError('');
            const previewData = await ipcRenderer.invoke('preview-commission-invoice', invoiceData);
            setPreviewInvoice(previewData);
            setInvoiceKey(previewData.invoiceKey);
        } catch (error) {
            console.error('Error generating invoice preview:', error);
            setError('Failed to generate invoice preview.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveInvoice = async () => {
        if (!previewInvoice) {
            setError('Please preview the invoice first.');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const savedInvoice = await ipcRenderer.invoke('create-commission-sheet', previewInvoice);
            setSuccess(`Commission sheet #${savedInvoice.invoiceKey} saved successfully.`);
            resetForm();
        } catch (error) {
            console.error('Error saving commission sheet:', error);
            setError('Failed to save commission sheet.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setPreviewInvoice(null);
        setSelectedCommissioner('');
        setBuyerName('');
        setCustomerName('');
        setItems([{ itemId: '', quantity: 0, netWeight: 0, price: 0, packagingCost: 0 }]);
        setTradersCommissionPercent(0);
        setReceivedAmount(0);
        setDueDate('');
        setInvoiceKey('ATC-XXXX');
    };

    const handleCancelPreview = () => {
        setPreviewInvoice(null);
    };

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Add Commission Sheet</h1>
                <p className="text-gray-600">Create new commission sheets for Atif Trader</p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                    {error}
                    <button className="float-right" onClick={() => setError('')}>&times;</button>
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                    {success}
                    <button className="float-right" onClick={() => setSuccess('')}>&times;</button>
                </div>
            )}

            {!previewInvoice ? (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-1">Invoice Key</label>
                        <input
                            type="text"
                            value={invoiceKey}
                            disabled
                            className="w-full border rounded p-2 bg-gray-100"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-1">Invoice Date</label>
                        <input
                            type="date"
                            value={invoiceDate}
                            onChange={(e) => setInvoiceDate(e.target.value)}
                            className="w-full border rounded p-2"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-1">Commissioner</label>
                        <Combobox
                            options={commissioners}
                            value={commissioners.find(c => c._id === selectedCommissioner)}
                            onChange={handleCommissionerChange}
                            getDisplayValue={getCommissionerDisplayValue}
                            placeholder="Search or select commissioner"
                            className="w-full"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-1">
                            Buyer Name <span className="text-gray-500 text-sm">(Optional)</span>
                        </label>
                        <input
                            type="text"
                            value={buyerName}
                            onChange={(e) => setBuyerName(e.target.value)}
                            className="w-full border rounded p-2"
                            placeholder="Enter buyer name"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-1">
                            Customer Name <span className="text-gray-500 text-sm">(Optional)</span>
                        </label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full border rounded p-2"
                            placeholder="Enter customer name"
                        />
                    </div>

                    <div className="mb-4">
                        <h2 className="text-xl font-semibold mb-2">Items</h2>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-200">
                                    <th className="p-2 text-left">Item</th>
                                    <th className="p-2 text-left">Quantity</th>
                                    <th className="p-2 text-left">Net Weight (kg/unit)</th>
                                    <th className="p-2 text-left">Price (per kg)</th>
                                    <th className="p-2 text-left">Packaging Cost (per unit)</th>
                                    <th className="p-2 text-left">Total</th>
                                    <th className="p-2 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={index} className="border-b">
                                        <td className="p-2">
                                            <Combobox
                                                options={inventoryItems}
                                                value={inventoryItems.find(i => i._id === item.itemId)}
                                                onChange={(selectedItem) => handleItemChange(index, 'itemId', selectedItem)}
                                                getDisplayValue={getItemDisplayValue}
                                                placeholder="Search or select item"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                className="w-full border rounded p-1"
                                                min="0"
                                                step="0.1"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                value={item.netWeight}
                                                onChange={(e) => handleItemChange(index, 'netWeight', parseFloat(e.target.value) || 0)}
                                                className="w-full border rounded p-1"
                                                min="0"
                                                step="0.1"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                value={item.price}
                                                onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                                                className="w-full border rounded p-1"
                                                min="0"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                value={item.packagingCost}
                                                onChange={(e) => handleItemChange(index, 'packagingCost', parseFloat(e.target.value) || 0)}
                                                className="w-full border rounded p-1"
                                                min="0"
                                                step="0.1"
                                            />
                                        </td>
                                        <td className="p-2">{itemTotal(item).toFixed(2)}</td>
                                        <td className="p-2">
                                            <button
                                                onClick={() => removeItem(index)}
                                                className="text-red-500 hover:text-red-700"
                                                title="Remove Item"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button
                            onClick={addItem}
                            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            Add Item
                        </button>
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-1">Total Price</label>
                        <input
                            type="text"
                            value={totalPrice.toFixed(2)}
                            disabled
                            className="w-full border rounded p-2 bg-gray-100"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-1">Trader's Commission %</label>
                        <input
                            type="number"
                            value={tradersCommissionPercent}
                            onChange={(e) => setTradersCommissionPercent(parseFloat(e.target.value) || 0)}
                            className="w-full border rounded p-2"
                            min="0"
                            max="100"
                            step="0.1"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-1">Commission Price</label>
                        <input
                            type="text"
                            value={commissionPrice.toFixed(2)}
                            disabled
                            className="w-full border rounded p-2 bg-gray-100"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-1">Received Amount</label>
                        <input
                            type="number"
                            value={receivedAmount}
                            onChange={(e) => setReceivedAmount(parseFloat(e.target.value) || 0)}
                            className="w-full border rounded p-2"
                            min="0"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-1">Pending Amount</label>
                        <input
                            type="text"
                            value={pendingAmount.toFixed(2)}
                            disabled
                            className="w-full border rounded p-2 bg-gray-100"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-1">Due Date</label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full border rounded p-2"
                        />
                    </div>

                    {!isVendorInvoice && brokerCommissionPercentage > 0 && (
                        <>
                            <div className="border-t border-gray-200 mt-2 pt-2">
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-600">Commission Rate:</span>
                                    <span className="font-medium">{brokerCommissionPercentage}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Commission Amount:</span>
                                    <span className="font-medium text-blue-600">Rs {brokerCommission.toFixed(2)}</span>
                                </div>
                            </div>
                        </>
                    )}

                    <button
                        onClick={handlePreviewInvoice}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Preview Invoice'}
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    {/* Preview section remains unchanged */}
                    <div className="flex justify-end space-x-4">
                        <button
                            onClick={handleCancelPreview}
                            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveInvoice}
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save Invoice'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddCommissionSheet; 