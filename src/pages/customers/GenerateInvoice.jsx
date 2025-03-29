import React, { useState, useEffect, useRef } from 'react';
import { ipcRenderer } from 'electron';
import { useAuth } from '../../context/AuthContext.jsx';

const GenerateInvoice = () => {
    const { user } = useAuth();
    const invoiceIdTimeoutRef = useRef(null);

    // State for customers and search
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // State for brokers and search
    const [brokers, setBrokers] = useState([]);
    const [filteredBrokers, setFilteredBrokers] = useState([]);
    const [brokerSearch, setBrokerSearch] = useState('');
    const [showBrokerDropdown, setShowBrokerDropdown] = useState(false);
    const [selectedBroker, setSelectedBroker] = useState(null);
    const [commissionPercentage, setCommissionPercentage] = useState(0);
    const [commissionAmount, setCommissionAmount] = useState(0);

    // State for inventory items and table
    const [inventoryItems, setInventoryItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [currentItemSearch, setCurrentItemSearch] = useState('');
    const [filteredItems, setFilteredItems] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);

    // Additional costs
    const [laborTransportCost, setLaborTransportCost] = useState(0);

    // Invoice details
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().substr(0, 10));
    const [dueDate, setDueDate] = useState('');
    const [totalPrice, setTotalPrice] = useState(0);
    const [paidAmount, setPaidAmount] = useState(0);
    const [remainingAmount, setRemainingAmount] = useState(0);

    // UI states
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [itemErrors, setItemErrors] = useState({});

    // Add new state for modal
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [invoiceDetails, setInvoiceDetails] = useState(null);
    const [savingInvoice, setSavingInvoice] = useState(false);

    useEffect(() => {
        // Set due date to 15 days from current date
        const due = new Date();
        due.setDate(due.getDate() + 15);
        setDueDate(due.toISOString().substr(0, 10));

        // Generate invoice number
        const generateInvoiceNumber = () => {
            const date = new Date();
            const year = date.getFullYear().toString().substr(2);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            return `INV-${year}${month}-${random}`;
        };
        setInvoiceNumber(generateInvoiceNumber());

        // Fetch customers
        const fetchCustomers = async () => {
            try {
                const result = await ipcRenderer.invoke('get-customers', { page: 1, perPage: 100 });
                setCustomers(result.customers || []);
            } catch (err) {
                console.error('Error fetching customers:', err);
                setError('Failed to load customers');
            }
        };

        // Fetch brokers
        const fetchBrokers = async () => {
            try {
                const result = await ipcRenderer.invoke('get-brokers', { page: 1, perPage: 100 });
                setBrokers(result.brokers || []);
            } catch (err) {
                console.error('Error fetching brokers:', err);
                // Don't set error for brokers as they're optional
            }
        };

        // Fetch inventory items
        const fetchInventory = async () => {
            try {
                const result = await ipcRenderer.invoke('get-inventory', { page: 1, perPage: 100 });
                setInventoryItems(result.items || []);
            } catch (err) {
                console.error('Error fetching inventory:', err);
                setError('Failed to load inventory items');
            }
        };

        fetchCustomers();
        fetchBrokers();
        fetchInventory();
    }, []);

    // Filter customers when search term changes
    useEffect(() => {
        if (customerSearch) {
            const filtered = customers.filter(customer =>
                customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                customer.contact?.toLowerCase().includes(customerSearch.toLowerCase())
            );
            setFilteredCustomers(filtered);
            setShowCustomerDropdown(true);
        } else {
            setFilteredCustomers([]);
            setShowCustomerDropdown(false);
        }
    }, [customerSearch, customers]);

    // Filter brokers when search term changes
    useEffect(() => {
        if (brokerSearch) {
            const filtered = brokers.filter(broker =>
                broker.name.toLowerCase().includes(brokerSearch.toLowerCase()) ||
                broker.phone?.toLowerCase().includes(brokerSearch.toLowerCase())
            );
            setFilteredBrokers(filtered);
            setShowBrokerDropdown(true);
        } else {
            setFilteredBrokers([]);
            setShowBrokerDropdown(false);
        }
    }, [brokerSearch, brokers]);

    // Filter items when search term changes
    useEffect(() => {
        if (currentItemSearch) {
            const filtered = inventoryItems.filter(item =>
                item.name.toLowerCase().includes(currentItemSearch.toLowerCase()) ||
                item.itemId.toLowerCase().includes(currentItemSearch.toLowerCase())
            );
            setFilteredItems(filtered);
            setShowItemDropdown(true);
        } else {
            setFilteredItems([]);
            setShowItemDropdown(false);
        }
    }, [currentItemSearch, inventoryItems]);

    // Calculate totals whenever selected items or labor/transport cost changes
    useEffect(() => {
        calculateTotal();
    }, [selectedItems, laborTransportCost]);

    // Calculate remaining amount whenever total price or paid amount changes
    useEffect(() => {
        const remaining = Math.max(0, totalPrice - parseFloat(paidAmount || 0));
        setRemainingAmount(remaining);
    }, [totalPrice, paidAmount]);

    // Calculate commission amount whenever total price or commission percentage changes
    useEffect(() => {
        const commission = (totalPrice * parseFloat(commissionPercentage || 0)) / 100;
        setCommissionAmount(commission);
    }, [totalPrice, commissionPercentage]);

    const calculateTotal = () => {
        let total = 0;

        // Sum all item totals
        selectedItems.forEach(item => {
            const itemTotal = calculateItemTotal(item);
            total += itemTotal;
        });

        // Add labor and transport cost
        total += parseFloat(laborTransportCost || 0);

        setTotalPrice(total);
    };

    const calculateItemTotal = (item) => {
        if (!item) return 0;

        const sellingPrice = Math.round(parseFloat(item.sellingPrice || 0));
        const netWeight = parseFloat(item.netWeight || 0);
        const quantity = parseFloat(item.quantity || 0);
        const packagingCost = Math.round(parseFloat(item.packagingCost || 0));

        return Math.round((sellingPrice * netWeight) + (quantity * packagingCost));
    };

    const handleCustomerSearchChange = (e) => {
        setCustomerSearch(e.target.value);
        if (selectedCustomer) {
            setSelectedCustomer(null);
        }
    };

    const handleSelectCustomer = (customer) => {
        setSelectedCustomer(customer);
        setCustomerSearch(customer.name);
        setShowCustomerDropdown(false);
    };

    const handleRemoveCustomer = () => {
        setSelectedCustomer(null);
        setCustomerSearch('');
    };

    const handleBrokerSearchChange = (e) => {
        setBrokerSearch(e.target.value);
        if (selectedBroker) {
            setSelectedBroker(null);
            setCommissionPercentage(0);
        }
    };

    const handleSelectBroker = (broker) => {
        setSelectedBroker(broker);
        setBrokerSearch(broker.name);
        setShowBrokerDropdown(false);
    };

    const handleRemoveBroker = () => {
        setSelectedBroker(null);
        setBrokerSearch('');
        setCommissionPercentage(0);
        setCommissionAmount(0);
    };

    const handleCommissionChange = (e) => {
        const value = parseFloat(e.target.value) || 0;
        setCommissionPercentage(value);
    };

    const handleItemSearchChange = (e) => {
        setCurrentItemSearch(e.target.value);
    };

    const handleSelectItem = (item) => {
        // Check if item has enough inventory
        if (item.quantity <= 0) {
            setError(`${item.name} is out of stock`);
            return;
        }

        // Add the item to the selected items list with default values
        const newItem = {
            _id: item._id,
            itemId: item.itemId,
            name: item.name,
            sellingPrice: item.sellingPrice || 0,
            quantity: 1,
            netWeight: 1,
            packagingCost: 0,
            availableQuantity: item.quantity,
            maxWeight: item.netWeight || 0
        };

        setSelectedItems([...selectedItems, newItem]);
        setCurrentItemSearch('');
        setShowItemDropdown(false);
        setError('');
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...selectedItems];
        const item = { ...newItems[index] };

        // Validate input based on field
        if (field === 'quantity') {
            const floatValue = parseFloat(value) || 0;

            // Check if we have enough inventory
            if (floatValue > item.availableQuantity) {
                setItemErrors({
                    ...itemErrors,
                    [index]: `Only ${item.availableQuantity} available in inventory`
                });
            } else {
                const newErrors = { ...itemErrors };
                delete newErrors[index];
                setItemErrors(newErrors);
            }

            item.quantity = floatValue;
        }
        else if (field === 'netWeight') {
            const floatValue = parseFloat(value) || 0;

            // Optional: Check if we have enough weight available
            if (item.maxWeight > 0 && floatValue > item.maxWeight) {
                setItemErrors({
                    ...itemErrors,
                    [index]: `Maximum weight is ${item.maxWeight} kg`
                });
            } else {
                const newErrors = { ...itemErrors };
                delete newErrors[index];
                setItemErrors(newErrors);
            }

            item.netWeight = floatValue;
        }
        else if (field === 'sellingPrice' || field === 'packagingCost') {
            // Convert to float first, then round to integer
            item[field] = Math.round(parseFloat(value) || 0);
        }

        newItems[index] = item;
        setSelectedItems(newItems);
    };

    const handleRemoveItem = (index) => {
        const newItems = [...selectedItems];
        newItems.splice(index, 1);
        setSelectedItems(newItems);

        // Remove any errors for this item
        const newErrors = { ...itemErrors };
        delete newErrors[index];
        setItemErrors(newErrors);
    };

    const validateForm = () => {
        // Check if customer is selected
        if (!selectedCustomer) {
            setError('Please select a customer');
            return false;
        }

        // Check if items are added
        if (selectedItems.length === 0) {
            setError('Please add at least one item');
            return false;
        }

        // Check if all items have valid values
        const invalidItems = selectedItems.some(item =>
            !item.quantity ||
            item.quantity <= 0 ||
            !item.netWeight ||
            item.netWeight <= 0 ||
            !item.sellingPrice ||
            item.sellingPrice <= 0
        );

        if (invalidItems) {
            setError('Please ensure all items have valid quantity, net weight, and selling price');
            return false;
        }

        // Check if there are any inventory errors
        if (Object.keys(itemErrors).length > 0) {
            setError('There are inventory issues with some items. Please fix them before proceeding.');
            return false;
        }

        // All validations passed
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate the form
        if (!validateForm()) {
            return;
        }

        // Prepare invoice data
        const invoiceItems = selectedItems.map(item => ({
            itemId: item.itemId,
            name: item.name,
            quantity: item.quantity,
            netWeight: item.netWeight,
            sellingPrice: item.sellingPrice,
            packagingCost: item.packagingCost,
            total: calculateItemTotal(item)
        }));

        const invoiceData = {
            invoiceNumber,
            customerId: selectedCustomer._id,
            customerName: selectedCustomer.name,
            customerContact: selectedCustomer.contact,
            items: invoiceItems,
            laborTransportCost: Math.round(parseFloat(laborTransportCost || 0)),
            totalAmount: Math.round(totalPrice),
            paidAmount: Math.round(parseFloat(paidAmount || 0)),
            remainingAmount: Math.round(remainingAmount),
            issueDate: invoiceDate,
            dueDate,
            status: remainingAmount > 0 ? 'not paid' : 'paid',
            createdBy: user._id,
            // Add broker information if a broker is selected
            brokerId: selectedBroker ? selectedBroker._id : null,
            brokerName: selectedBroker ? selectedBroker.name : null,
            commissionPercentage: selectedBroker ? parseFloat(commissionPercentage || 0) : 0,
            commissionAmount: selectedBroker ? Math.round(commissionAmount) : 0
        };

        // Show invoice preview modal without saving
        setInvoiceDetails(invoiceData);
        setShowSuccessModal(true);
    };

    const handleSaveInvoice = async () => {
        if (!invoiceDetails) return;

        try {
            setSavingInvoice(true);
            setError('');

            // Create the invoice
            const createdInvoice = await ipcRenderer.invoke('create-invoice', invoiceDetails);

            // Try to update inventory quantities, but don't fail if the handler isn't implemented
            try {
                for (const item of selectedItems) {
                    await ipcRenderer.invoke('update-inventory-quantity', {
                        itemId: item._id,
                        quantity: item.availableQuantity - item.quantity,
                        netWeight: Math.max(0, item.maxWeight - item.netWeight)
                    });
                }
            } catch (inventoryError) {
                console.log('Inventory update not implemented yet:', inventoryError.message);
                // Don't throw the error - we want to continue even if inventory update fails
            }

            // Show success message
            setSuccess(true);

            // Update with the saved invoice data if available
            if (createdInvoice) {
                setInvoiceDetails(createdInvoice);
            }

        } catch (err) {
            console.error('Error creating invoice:', err);

            // Check if the error is due to a duplicate invoice number
            if (err.message && err.message.includes('unique constraint')) {
                // Generate a new invoice number
                const generateNewInvoiceNumber = () => {
                    const date = new Date();
                    const year = date.getFullYear().toString().substr(2);
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const random = Math.floor(Math.random() * 9000 + 1000).toString();
                    return `INV-${year}${month}-${random}`;
                };

                const newInvoiceNumber = generateNewInvoiceNumber();
                setInvoiceNumber(newInvoiceNumber);
                setInvoiceDetails({
                    ...invoiceDetails,
                    invoiceNumber: newInvoiceNumber
                });
                setError(`Invoice number was already used. A new number (${newInvoiceNumber}) has been generated. Please try again.`);
            } else {
                setError('Failed to create invoice. Please try again.');
            }
        } finally {
            setSavingInvoice(false);
        }
    };

    const handleCloseModal = () => {
        setShowSuccessModal(false);

        // If invoice was successfully saved, reset the form
        if (success) {
            resetForm();
        }
    };

    const handlePrintInvoice = () => {
        // Implement print functionality
        window.print();
        // Then close modal
        handleCloseModal();
    };

    const resetForm = () => {
        // Reset customer
        setSelectedCustomer(null);
        setCustomerSearch('');

        // Reset broker
        setSelectedBroker(null);
        setBrokerSearch('');
        setCommissionPercentage(0);
        setCommissionAmount(0);

        // Reset items
        setSelectedItems([]);
        setCurrentItemSearch('');

        // Reset costs and amounts
        setLaborTransportCost(0);
        setPaidAmount(0);
        setRemainingAmount(0);

        // Generate new invoice number
        const generateInvoiceNumber = () => {
            const date = new Date();
            const year = date.getFullYear().toString().substr(2);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            return `INV-${year}${month}-${random}`;
        };
        setInvoiceNumber(generateInvoiceNumber());

        // Clear errors
        setError('');
        setItemErrors({});
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2
        }).format(parseFloat(amount) || 0);
    };

    return (
        <div className="container mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Generate Invoice</h1>
                <p className="text-gray-600">Create new invoices for customers</p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                    Invoice created successfully!
                </div>
            )}

            {/* Invoice Preview Modal */}
            {showSuccessModal && invoiceDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">
                                {success ? 'Invoice Created Successfully' : 'Invoice Preview'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="border-t border-b py-4 my-4">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-gray-600">Invoice Number:</p>
                                    <p className="font-medium">{invoiceDetails.invoiceNumber}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Customer:</p>
                                    <p className="font-medium">{invoiceDetails.customerName}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Issue Date:</p>
                                    <p className="font-medium">{invoiceDetails.issueDate}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Due Date:</p>
                                    <p className="font-medium">{invoiceDetails.dueDate}</p>
                                </div>
                            </div>

                            <table className="w-full mb-4">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Item</th>
                                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Qty</th>
                                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Weight</th>
                                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Price</th>
                                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoiceDetails.items.map((item, index) => (
                                        <tr key={index} className="border-b">
                                            <td className="px-4 py-2">{item.name}</td>
                                            <td className="px-4 py-2 text-right">{item.quantity}</td>
                                            <td className="px-4 py-2 text-right">{item.netWeight} kg</td>
                                            <td className="px-4 py-2 text-right">{formatCurrency(item.sellingPrice)}/kg</td>
                                            <td className="px-4 py-2 text-right">{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-b">
                                        <td colSpan="4" className="px-4 py-2 text-right font-medium">Labor and Transport:</td>
                                        <td className="px-4 py-2 text-right">{formatCurrency(invoiceDetails.laborTransportCost || 0)}</td>
                                    </tr>
                                    <tr className="bg-gray-50">
                                        <td colSpan="4" className="px-4 py-2 text-right font-bold">Total:</td>
                                        <td className="px-4 py-2 text-right font-bold">{formatCurrency(invoiceDetails.totalAmount)}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan="4" className="px-4 py-2 text-right font-medium">Paid Amount:</td>
                                        <td className="px-4 py-2 text-right">{formatCurrency(invoiceDetails.paidAmount || 0)}</td>
                                    </tr>
                                    <tr className={invoiceDetails.remainingAmount > 0 ? "text-red-600" : "text-green-600"}>
                                        <td colSpan="4" className="px-4 py-2 text-right font-medium">Remaining:</td>
                                        <td className="px-4 py-2 text-right font-medium">{formatCurrency(invoiceDetails.remainingAmount)}</td>
                                    </tr>
                                    {invoiceDetails.brokerName && (
                                        <>
                                            <tr className="border-t">
                                                <td colSpan="4" className="px-4 py-2 text-right font-medium">Broker:</td>
                                                <td className="px-4 py-2 text-right">{invoiceDetails.brokerName}</td>
                                            </tr>
                                            <tr>
                                                <td colSpan="4" className="px-4 py-2 text-right font-medium">Commission Rate:</td>
                                                <td className="px-4 py-2 text-right">{invoiceDetails.commissionPercentage}%</td>
                                            </tr>
                                            <tr className="bg-blue-50">
                                                <td colSpan="4" className="px-4 py-2 text-right font-medium">Commission Amount:</td>
                                                <td className="px-4 py-2 text-right font-medium">{formatCurrency(invoiceDetails.commissionAmount)}</td>
                                            </tr>
                                        </>
                                    )}
                                </tfoot>
                            </table>

                            <div className="mt-4">
                                <p className="text-gray-600">Status:</p>
                                <p className={`font-medium ${invoiceDetails.remainingAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                                    {invoiceDetails.status === 'paid' ? "Paid" : "Not Paid"}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                {success ? 'Close' : 'Cancel'}
                            </button>

                            {!success && (
                                <button
                                    onClick={handleSaveInvoice}
                                    disabled={savingInvoice}
                                    className={`px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 ${savingInvoice ? 'opacity-75' : ''}`}
                                >
                                    {savingInvoice ? 'Saving...' : 'Save Invoice'}
                                </button>
                            )}

                            {success && (
                                <button
                                    onClick={handlePrintInvoice}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Print Invoice
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Invoice Number
                            </label>
                            <input
                                type="text"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Customer
                            </label>
                            {selectedCustomer ? (
                                <div className="flex items-center w-full px-4 py-2 border rounded-md bg-gray-50">
                                    <span className="flex-grow">{selectedCustomer.name} ({selectedCustomer.contact})</span>
                                    <button
                                        type="button"
                                        onClick={handleRemoveCustomer}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={customerSearch}
                                        onChange={handleCustomerSearchChange}
                                        placeholder="Search customer by name or contact"
                                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                                        <div className="absolute z-20 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {filteredCustomers.map((customer) => (
                                                <div
                                                    key={customer._id}
                                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                                    onClick={() => handleSelectCustomer(customer)}
                                                >
                                                    {customer.name} ({customer.contact || 'No contact'})
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Broker (Optional)
                            </label>
                            {selectedBroker ? (
                                <div className="flex items-center w-full px-4 py-2 border rounded-md bg-gray-50">
                                    <span className="flex-grow">{selectedBroker.name} ({selectedBroker.phone || 'No phone'})</span>
                                    <button
                                        type="button"
                                        onClick={handleRemoveBroker}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={brokerSearch}
                                        onChange={handleBrokerSearchChange}
                                        placeholder="Search broker by name or phone"
                                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    {showBrokerDropdown && filteredBrokers.length > 0 && (
                                        <div className="absolute z-20 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {filteredBrokers.map((broker) => (
                                                <div
                                                    key={broker._id}
                                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                                    onClick={() => handleSelectBroker(broker)}
                                                >
                                                    {broker.name} ({broker.phone || 'No phone'}) - {broker.city || 'No city'}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {selectedBroker && (
                            <div>
                                <label className="block text-gray-700 font-medium mb-2">
                                    Commission (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={commissionPercentage}
                                    onChange={handleCommissionChange}
                                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {commissionPercentage > 0 && (
                                    <p className="mt-1 text-sm text-green-600">
                                        Commission Amount: {formatCurrency(commissionAmount)}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Invoice Date
                            </label>
                            <input
                                type="date"
                                value={invoiceDate}
                                onChange={(e) => setInvoiceDate(e.target.value)}
                                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-800">Items</h2>
                        </div>

                        <div className="relative mb-4">
                            <input
                                type="text"
                                value={currentItemSearch}
                                onChange={handleItemSearchChange}
                                placeholder="Search and add items by name or ID"
                                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {showItemDropdown && filteredItems.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {filteredItems.map((item) => (
                                        <div
                                            key={item._id}
                                            className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${item.quantity <= 0 ? 'text-red-500' : ''}`}
                                            onClick={() => handleSelectItem(item)}
                                        >
                                            {item.name} (ID: {item.itemId}) - {item.quantity <= 0 ? 'Out of stock' : `${item.quantity} available`}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedItems.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Item
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Quantity
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Net Weight (kg)
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Selling Price (per kg)
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Packaging Cost (per unit)
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Total
                                            </th>
                                            <th className="px-4 py-2 text-xs font-medium text-gray-500"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {selectedItems.map((item, index) => {
                                            const itemTotal = calculateItemTotal(item);
                                            return (
                                                <tr key={index} className={itemErrors[index] ? 'bg-red-50' : ''}>
                                                    <td className="px-4 py-2 text-sm">
                                                        {item.name} (ID: {item.itemId})
                                                        {itemErrors[index] && (
                                                            <div className="text-xs text-red-600 mt-1">{itemErrors[index]}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="number"
                                                            min="0.01"
                                                            step="0.01"
                                                            max={item.availableQuantity}
                                                            value={item.quantity}
                                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                            className="w-20 px-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="number"
                                                            min="0.01"
                                                            step="0.01"
                                                            value={item.netWeight}
                                                            onChange={(e) => handleItemChange(index, 'netWeight', e.target.value)}
                                                            className="w-24 px-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="number"
                                                            min="0.01"
                                                            step="0.01"
                                                            value={item.sellingPrice}
                                                            onChange={(e) => handleItemChange(index, 'sellingPrice', e.target.value)}
                                                            className="w-24 px-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.packagingCost}
                                                            onChange={(e) => handleItemChange(index, 'packagingCost', e.target.value)}
                                                            className="w-24 px-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 text-gray-700 font-medium">
                                                        {formatCurrency(itemTotal)}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveItem(index)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-gray-50">
                                            <td colSpan={4} className="px-4 py-2 text-right font-medium">
                                                Labor and Transport Cost:
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={laborTransportCost}
                                                    onChange={(e) => setLaborTransportCost(e.target.value)}
                                                    className="w-24 px-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-gray-700 font-medium">
                                                {formatCurrency(parseFloat(laborTransportCost || 0))}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {selectedItems.length === 0 && (
                            <div className="text-center py-4 text-gray-500 border rounded-md bg-gray-50">
                                No items added yet. Search and select items above.
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Paid Amount
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={paidAmount}
                                onChange={(e) => setPaidAmount(e.target.value)}
                                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Remaining Amount
                            </label>
                            <input
                                type="number"
                                value={remainingAmount}
                                className="w-full px-4 py-2 border rounded-md bg-gray-50 focus:outline-none"
                                readOnly
                            />
                        </div>
                    </div>

                    <div className="flex justify-end mb-6">
                        <div className="w-full md:w-1/3">
                            <div className="flex justify-between py-2 border-b">
                                <span className="font-medium">Total:</span>
                                <span className="font-semibold">{formatCurrency(totalPrice)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-6 py-2 rounded-md text-white font-medium ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                                } transition duration-200`}
                        >
                            {loading ? 'Loading...' : 'Preview Invoice'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GenerateInvoice; 