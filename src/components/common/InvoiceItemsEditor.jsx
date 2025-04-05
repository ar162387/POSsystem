import React, { useState, useEffect } from 'react';
import { Button, Alert } from './index';
import { ipcRenderer } from 'electron';

/**
 * InvoiceItemsEditor Component
 * A reusable component for editing invoice items, quantities, prices, etc.
 * Works for both customer and vendor invoices
 * 
 * @param {Object} invoice - The invoice to edit
 * @param {Function} onSave - Function to call when saving changes
 * @param {Function} onCancel - Function to call when canceling changes
 * @param {Boolean} isVendorInvoice - Whether this is a vendor invoice (affects price field name)
 * @param {Boolean} isLoading - Whether the save operation is in progress
 * @param {String} error - Error message to display
 */
const InvoiceItemsEditor = ({
    invoice,
    onSave,
    onCancel,
    isVendorInvoice = false,
    isLoading = false,
    error = ''
}) => {
    const [items, setItems] = useState([]);
    const [originalItems, setOriginalItems] = useState([]);
    const [labourTransportCost, setLabourTransportCost] = useState(0);
    const [subtotal, setSubtotal] = useState(0);
    const [total, setTotal] = useState(0);
    const [formError, setFormError] = useState('');
    const [inventoryData, setInventoryData] = useState({});
    const [loadingInventory, setLoadingInventory] = useState(false);
    const [inventory, setInventory] = useState([]);
    const [itemValidationErrors, setItemValidationErrors] = useState({});
    const [paymentStatus, setPaymentStatus] = useState(invoice?.paymentStatus || 'pending');
    const [paidAmount, setPaidAmount] = useState(invoice?.paidAmount || 0);
    const [remainingAmount, setRemainingAmount] = useState(0);
    const [brokerCommission, setBrokerCommission] = useState(invoice?.commissionAmount || 0);
    const [brokerCommissionPercentage, setBrokerCommissionPercentage] = useState(invoice?.commissionPercentage || 0);
    const [brokerName, setBrokerName] = useState(invoice?.brokerName || '');

    // Price field name based on invoice type
    const priceField = isVendorInvoice ? 'purchasePrice' : 'sellingPrice';

    // Fetch inventory data for validation (only for customer invoices)
    useEffect(() => {
        if (!isVendorInvoice) {
            fetchInventoryData();
        }
    }, [isVendorInvoice]);

    const fetchInventoryData = async () => {
        try {
            setLoadingInventory(true);
            const result = await ipcRenderer.invoke('get-inventory-items', { perPage: 1000 });

            // Create a lookup map by itemId
            const invMap = {};
            result.items.forEach(item => {
                invMap[item.itemId] = item;
            });

            setInventoryData(invMap);
            setInventory(result.items);
        } catch (err) {
            console.error('Error fetching inventory data:', err);
            setFormError('Failed to load inventory data for validation.');
        } finally {
            setLoadingInventory(false);
        }
    };

    // Initialize form state from invoice
    useEffect(() => {
        if (invoice) {
            console.log('Invoice data:', {
                commissionAmount: invoice.commissionAmount,
                commissionPercentage: invoice.commissionPercentage,
                brokerName: invoice.brokerName
            });

            const clonedItems = JSON.parse(JSON.stringify(invoice.items || []));
            setItems(clonedItems);
            setOriginalItems(JSON.parse(JSON.stringify(invoice.items || [])));
            setLabourTransportCost(parseFloat(isVendorInvoice ? invoice.labourTransportCost : invoice.laborTransportCost || 0));
            setPaidAmount(parseFloat(invoice.paidAmount || 0));
            setPaymentStatus(invoice.paymentStatus || 'pending');
            setBrokerCommissionPercentage(parseFloat(invoice.commissionPercentage || 0));
            setBrokerCommission(parseFloat(invoice.commissionAmount || 0));
            setBrokerName(invoice.brokerName || '');
        }
    }, [invoice, isVendorInvoice]);

    // Recalculate totals, payment status, remaining amount, and broker commission when items or labour cost changes
    useEffect(() => {
        // Calculate subtotal (sum of all item totals)
        const itemsSubtotal = items.reduce((sum, item) => {
            const price = parseFloat(item[priceField] || 0);
            const netWeight = parseFloat(item.netWeight || 0);
            const quantity = parseInt(item.quantity || 0);
            const packagingCost = parseFloat(item.packagingCost || 0);
            const itemTotal = (price * netWeight) + (quantity * packagingCost);
            return sum + itemTotal;
        }, 0);

        const newTotal = itemsSubtotal + parseFloat(labourTransportCost || 0);
        setSubtotal(itemsSubtotal);
        setTotal(newTotal);

        // Update remaining amount
        const newRemainingAmount = Math.max(0, newTotal - paidAmount);
        setRemainingAmount(newRemainingAmount);

        // Update payment status based on new total and paid amount
        if (newTotal === paidAmount) {
            setPaymentStatus('paid');
        } else if (paidAmount > 0 && paidAmount < newTotal) {
            setPaymentStatus('partially_paid');
        } else {
            setPaymentStatus('pending');
        }

        // Update broker commission if this is a customer invoice
        if (!isVendorInvoice && brokerCommissionPercentage > 0) {
            const newBrokerCommission = (newTotal * brokerCommissionPercentage) / 100;
            setBrokerCommission(newBrokerCommission);
        }
    }, [items, labourTransportCost, paidAmount, brokerCommissionPercentage, priceField, isVendorInvoice]);

    // Validate customer invoice item against inventory
    const validateItemAgainstInventory = (item, index, field, value) => {
        if (isVendorInvoice) return true; // Skip validation for vendor invoices

        const inventoryItem = inventoryData[item.itemId];
        if (!inventoryItem) {
            setItemValidationErrors(prev => ({
                ...prev,
                [index]: `Item not found in inventory`
            }));
            return false;
        }

        // Find original item to calculate the delta
        const originalItem = originalItems.find(oi => oi.itemId === item.itemId) || {};

        // Convert values to numbers for comparison
        const newValue = parseFloat(value);
        const currentValue = parseFloat(item[field]);
        const originalValue = parseFloat(originalItem[field] || 0);

        // Calculate how much would be needed from inventory
        // Original: 10, New: 15 -> Need 5 more from inventory
        // Original: 10, New: 5 -> Will return 5 to inventory (no validation needed)
        const delta = newValue - originalValue;

        if (delta <= 0) return true; // If reducing or no change, that's always valid

        let isValid = true;
        let errorMessage = '';

        switch (field) {
            case 'quantity':
                if (delta > inventoryItem.quantity) {
                    isValid = false;
                    errorMessage = `Cannot increase quantity by ${delta} (available: ${inventoryItem.quantity})`;
                }
                break;
            case 'netWeight':
                if (delta > inventoryItem.netWeight) {
                    isValid = false;
                    errorMessage = `Cannot increase net weight by ${delta}kg (available: ${inventoryItem.netWeight}kg)`;
                }
                break;
            case 'grossWeight':
                if (delta > inventoryItem.grossWeight) {
                    isValid = false;
                    errorMessage = `Cannot increase gross weight by ${delta}kg (available: ${inventoryItem.grossWeight}kg)`;
                }
                break;
        }

        if (!isValid) {
            setItemValidationErrors(prev => ({
                ...prev,
                [index]: errorMessage
            }));
        } else {
            // Clear error if valid
            setItemValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[index];
                return newErrors;
            });
        }

        return isValid;
    };

    // Handle changes to an item's field
    const handleItemChange = (index, field, value) => {
        // Skip validation for non-inventory related fields
        const inventoryFields = ['quantity', 'netWeight', 'grossWeight'];

        if (!isVendorInvoice && inventoryFields.includes(field)) {
            // Validate against inventory for customer invoices
            if (!validateItemAgainstInventory(items[index], index, field, value)) {
                // We still update the UI, but will prevent submission with the validation error
            }
        }

        const updatedItems = [...items];

        // Convert numeric values
        if (['quantity', 'netWeight', 'grossWeight', priceField, 'packagingCost'].includes(field)) {
            value = parseFloat(value) || 0;
        }

        updatedItems[index][field] = value;
        setItems(updatedItems);
    };

    // Remove an item from the invoice
    const handleRemoveItem = (index) => {
        const updatedItems = [...items];
        const removedItem = updatedItems[index];

        // Log item being removed for debugging
        console.log('Removing item from invoice:', removedItem);

        updatedItems.splice(index, 1);
        setItems(updatedItems);

        // Clear any validation errors for this item
        if (itemValidationErrors[index]) {
            setItemValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[index];
                return newErrors;
            });
        }
    };

    // Handle changes to labour and transport cost
    const handleLabourCostChange = (e) => {
        const value = parseFloat(e.target.value) || 0;
        setLabourTransportCost(value);
    };

    // Validate form before submission
    const validateForm = () => {
        let isValid = true;
        let errorMessage = '';

        // Check if we have items
        if (items.length === 0) {
            isValid = false;
            errorMessage = 'At least one item is required';
        }

        // Check if there are any inventory validation errors
        if (Object.keys(itemValidationErrors).length > 0) {
            isValid = false;
            errorMessage = 'Some items exceed available inventory quantities';
        }

        // Check if all items have valid quantities and prices
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.quantity || item.quantity <= 0) {
                isValid = false;
                errorMessage = `Item ${i + 1} must have a quantity greater than zero`;
                break;
            }

            if (!item.netWeight || item.netWeight <= 0) {
                isValid = false;
                errorMessage = `Item ${i + 1} must have a net weight greater than zero`;
                break;
            }

            if (!item[priceField] || item[priceField] <= 0) {
                isValid = false;
                errorMessage = `Item ${i + 1} must have a ${isVendorInvoice ? 'purchase' : 'selling'} price greater than zero`;
                break;
            }
        }

        setFormError(errorMessage);
        return isValid;
    };

    // Handle form submission
    const handleSubmit = () => {
        if (!validateForm()) return;

        // Log the commission data for debugging
        console.log('Submitting invoice with commission data:', {
            commissionAmount: brokerCommission,
            commissionPercentage: brokerCommissionPercentage,
            brokerName: brokerName
        });

        // Prepare updated invoice data
        const updatedInvoice = {
            ...invoice,
            items: items,
            originalItems: originalItems,
            subtotal: subtotal,
            [isVendorInvoice ? 'labourTransportCost' : 'laborTransportCost']: labourTransportCost,
            totalAmount: total,
            paymentStatus: paymentStatus,
            paidAmount: paidAmount,
            remainingAmount: remainingAmount
        };

        // Only include commission data for customer invoices
        if (!isVendorInvoice) {
            updatedInvoice.commissionAmount = brokerCommission;
            updatedInvoice.commissionPercentage = brokerCommissionPercentage;
            updatedInvoice.brokerName = brokerName;
        }

        onSave(updatedInvoice);
    };

    return (
        <div className="p-4">
            {(error || formError) && (
                <Alert type="error" message={error || formError} className="mb-4" />
            )}

            {loadingInventory && (
                <div className="flex items-center justify-center p-4 mb-4 bg-blue-50 text-blue-700 rounded-md">
                    <svg className="animate-spin h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading inventory data for validation...
                </div>
            )}

            <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Invoice Items</h3>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Item Name
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Quantity
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Gross Weight (kg)
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Net Weight (kg)
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {isVendorInvoice ? 'Purchase Price' : 'Selling Price'}
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Packaging Cost
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Item Total
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {items.map((item, index) => {
                                // Calculate item total for display
                                const price = parseFloat(item[priceField] || 0);
                                const netWeight = parseFloat(item.netWeight || 0);
                                const quantity = parseInt(item.quantity || 0);
                                const packagingCost = parseFloat(item.packagingCost || 0);
                                const itemTotal = (price * netWeight) + (quantity * packagingCost);

                                // Get inventory data for this item (for customer invoices)
                                const invItem = !isVendorInvoice ? inventoryData[item.itemId] : null;
                                const hasError = itemValidationErrors[index];

                                return (
                                    <tr key={index} className={hasError ? 'bg-red-50' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="font-medium text-gray-900">{item.name || item.itemName}</span>
                                            {hasError && (
                                                <div className="text-red-600 text-xs mt-1">{itemValidationErrors[index]}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                className={`block w-24 border rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-right
                                                    ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                                                min="1"
                                                step="1"
                                            />
                                            {!isVendorInvoice && invItem && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Available: {invItem.quantity}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <input
                                                type="number"
                                                value={item.grossWeight || 0}
                                                onChange={(e) => handleItemChange(index, 'grossWeight', e.target.value)}
                                                className={`block w-24 border rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-right
                                                    ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                                                min="0"
                                                step="0.01"
                                            />
                                            {!isVendorInvoice && invItem && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Available: {parseFloat(invItem.grossWeight || 0).toFixed(2)}kg
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <input
                                                type="number"
                                                value={item.netWeight}
                                                onChange={(e) => handleItemChange(index, 'netWeight', e.target.value)}
                                                className={`block w-24 border rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-right
                                                    ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                                                min="0.01"
                                                step="0.01"
                                            />
                                            {!isVendorInvoice && invItem && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Available: {parseFloat(invItem.netWeight || 0).toFixed(2)}kg
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <input
                                                type="number"
                                                value={item[priceField]}
                                                onChange={(e) => handleItemChange(index, priceField, e.target.value)}
                                                className="block w-24 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                                                min="0.01"
                                                step="0.01"
                                            />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <input
                                                type="number"
                                                value={item.packagingCost}
                                                onChange={(e) => handleItemChange(index, 'packagingCost', e.target.value)}
                                                className="block w-24 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                                                min="0"
                                                step="0.01"
                                            />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-gray-900">
                                            Rs {itemTotal.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Additional Costs</h3>
                <div className="flex items-center">
                    <label className="mr-4 text-gray-700">Labour and Transport Cost:</label>
                    <input
                        type="number"
                        value={labourTransportCost}
                        onChange={handleLabourCostChange}
                        className="block w-40 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        step="0.01"
                    />
                </div>
            </div>

            <div className="mb-6">
                <div className="bg-gray-50 p-4 rounded-md w-80 ml-auto">
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">Rs {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Labour & Transport:</span>
                        <span className="font-medium">Rs {labourTransportCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-medium">Rs {total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Paid Amount:</span>
                        <span className="font-medium">Rs {paidAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Remaining Amount:</span>
                        <span className="font-medium">Rs {remainingAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Payment Status:</span>
                        <span className={`font-medium ${paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {paymentStatus.replace('_', ' ').toUpperCase()}
                        </span>
                    </div>
                    {!isVendorInvoice && (brokerCommissionPercentage > 0 || brokerName) && (
                        <>
                            <div className="border-t border-gray-200 mt-2 pt-2">
                                {brokerName && (
                                    <div className="flex justify-between mb-2">
                                        <span className="text-gray-600">Broker:</span>
                                        <span className="font-medium">{brokerName}</span>
                                    </div>
                                )}
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
                </div>
            </div>

            <div className="flex justify-end space-x-3">
                <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={isLoading}
                >
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={isLoading || Object.keys(itemValidationErrors).length > 0}
                >
                    {isLoading ? 'Updating...' : 'Update Invoice'}
                </Button>
            </div>
        </div>
    );
};

export default InvoiceItemsEditor; 