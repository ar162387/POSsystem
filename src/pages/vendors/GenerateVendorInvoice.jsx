import React, { useState, useEffect, useCallback } from 'react';
import { ipcRenderer } from 'electron';
import { useAuth } from '../../context/AuthContext.jsx';
import {
    Alert,
    Button,
    Input,
    Select,
    SearchableSelect,
    InvoiceDetail
} from '../../components/common';

const GenerateVendorInvoice = () => {
    const { user } = useAuth();
    const [vendors, setVendors] = useState([]);
    const [items, setItems] = useState([]);
    const [brokers, setBrokers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // State for preview
    const [previewInvoice, setPreviewInvoice] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    // Track if invoice is saved (so we can switch button to "Print")
    const [invoiceSaved, setInvoiceSaved] = useState(false);

    const [lastInvoiceNumber, setLastInvoiceNumber] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        vendorId: '',
        vendorName: '',
        invoiceDate: new Date().toISOString().split('T')[0], // Today's date
        dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0], // 30 days later
        items: [],
        paidAmount: 0,
        remainingAmount: 0,
        totalAmount: 0,
        labourTransportCost: 0,
        brokerId: '',
        brokerName: ''
    });

    // Search state
    const [vendorSearch, setVendorSearch] = useState('');
    const [itemSearch, setItemSearch] = useState('');
    const [filteredVendors, setFilteredVendors] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [showVendorDropdown, setShowVendorDropdown] = useState(false);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [showBrokerDropdown, setShowBrokerDropdown] = useState(false);
    const [brokerSearch, setBrokerSearch] = useState('');
    const [filteredBrokers, setFilteredBrokers] = useState([]);

    // Item being added
    const [currentItem, setCurrentItem] = useState({
        itemId: '',
        name: '',
        category: '',
        description: '',
        purchasePrice: 0,
        netWeight: 0,
        grossWeight: 0,
        quantity: 1,
        packagingCost: 0,
        unit: 'kg'
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch vendors
                const vendorData = await ipcRenderer.invoke('get-vendors', { page: 1, perPage: 100 });
                console.log('Vendors loaded:', vendorData.vendors?.length || 0);
                setVendors(vendorData.vendors || []);

                // Fetch inventory items
                const itemData = await ipcRenderer.invoke('get-inventory', { page: 1, perPage: 1000 });
                console.log('Inventory items loaded:', itemData.items?.length || 0, itemData.items?.[0]);
                setItems(itemData.items || []);

                // Fetch brokers
                const brokerData = await ipcRenderer.invoke('get-brokers', { page: 1, perPage: 100 });
                console.log('Brokers loaded:', brokerData.brokers?.length || 0);
                setBrokers(brokerData.brokers || []);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load required data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        console.log(`Items array has ${items.length} items`);
        if (items.length > 0) {
            console.log('First item sample:', items[0]);
        }
    }, [items]);

    useEffect(() => {
        if (vendorSearch.trim()) {
            const filtered = vendors.filter(vendor =>
                vendor.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                (vendor.contactPerson && vendor.contactPerson.toLowerCase().includes(vendorSearch.toLowerCase()))
            );
            setFilteredVendors(filtered);
            setShowVendorDropdown(true);
        } else {
            setFilteredVendors(vendors);
            setShowVendorDropdown(false);
        }
    }, [vendorSearch, vendors]);

    useEffect(() => {
        if (itemSearch.trim()) {
            const filtered = items.filter(item =>
                (item.name && item.name.toLowerCase().includes(itemSearch.toLowerCase())) ||
                (item.itemId && item.itemId.toLowerCase().includes(itemSearch.toLowerCase()))
            );
            console.log(`Filtered to ${filtered.length} items matching "${itemSearch}"`);
            setFilteredItems(filtered);
            setShowItemDropdown(true);
        } else {
            setFilteredItems([]);
            setShowItemDropdown(false);
        }
    }, [itemSearch, items]);

    useEffect(() => {
        if (brokerSearch.trim()) {
            const filtered = brokers.filter(broker =>
                broker.name.toLowerCase().includes(brokerSearch.toLowerCase()) ||
                (broker.contactPerson && broker.contactPerson.toLowerCase().includes(brokerSearch.toLowerCase()))
            );
            setFilteredBrokers(filtered);
            setShowBrokerDropdown(true);
        } else {
            setFilteredBrokers(brokers);
            setShowBrokerDropdown(false);
        }
    }, [brokerSearch, brokers]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleVendorSearchChange = (e) => {
        setVendorSearch(e.target.value);
    };

    const handleItemSearchChange = (e) => {
        setItemSearch(e.target.value);
    };

    const handleVendorSelect = (selectedVendor) => {
        if (selectedVendor) {
            setFormData(prev => ({
                ...prev,
                vendorId: selectedVendor._id,
                vendorName: selectedVendor.name
            }));
            setVendorSearch(selectedVendor.name);
        } else {
            setFormData(prev => ({
                ...prev,
                vendorId: '',
                vendorName: ''
            }));
            setVendorSearch('');
        }
        setShowVendorDropdown(false);
    };

    const handleItemSelect = (selectedItem) => {
        if (!selectedItem) {
            setCurrentItem({
                itemId: '',
                name: '',
                category: '',
                description: '',
                purchasePrice: 0,
                netWeight: 0,
                grossWeight: 0,
                quantity: 1,
                packagingCost: 0,
                unit: 'kg'
            });
            setItemSearch('');
            return;
        }

        setCurrentItem({
            _id: selectedItem._id,
            itemId: selectedItem.itemId,
            name: selectedItem.name,
            category: selectedItem.category || '',
            description: selectedItem.description || '',
            purchasePrice: selectedItem.costPrice || 0,
            netWeight: 1,
            grossWeight: selectedItem.grossWeight || 0,
            quantity: 1,
            packagingCost: selectedItem.packagingCost || 0,
            unit: selectedItem.unit || 'kg',
            availableQuantity: selectedItem.quantity || 0,
            maxWeight: selectedItem.netWeight || 0
        });
        setItemSearch(selectedItem.name);
        setShowItemDropdown(false);
    };

    const handleItemInputChange = (e) => {
        const { name, value } = e.target;
        const newValue = ['purchasePrice', 'netWeight', 'grossWeight', 'quantity', 'packagingCost'].includes(name)
            ? parseFloat(value) || 0
            : value;

        setCurrentItem(prev => ({
            ...prev,
            [name]: newValue
        }));
    };

    const calculateItemTotal = (item) => {
        const purchasePrice = parseFloat(item.purchasePrice) || 0;
        const netWeight = parseFloat(item.netWeight) || 0;
        const grossWeight = parseFloat(item.grossWeight) || 0;
        const quantity = parseInt(item.quantity) || 0;
        const packagingCost = parseFloat(item.packagingCost) || 0;

        return (purchasePrice * netWeight) + (quantity * packagingCost);
    };

    const addItemToInvoice = () => {
        if (!currentItem.itemId) {
            setError('Please select an item to add');
            return;
        }

        if (currentItem.quantity <= 0) {
            setError('Quantity must be greater than zero');
            return;
        }

        const existingItemIndex = formData.items.findIndex(item => item.itemId === currentItem.itemId);
        let newItems;

        if (existingItemIndex !== -1) {
            newItems = [...formData.items];
            newItems[existingItemIndex] = {
                ...newItems[existingItemIndex],
                quantity: newItems[existingItemIndex].quantity + currentItem.quantity,
                netWeight: currentItem.netWeight,
                grossWeight: currentItem.grossWeight,
                purchasePrice: currentItem.purchasePrice,
                packagingCost: currentItem.packagingCost
            };
        } else {
            const itemWithTotal = {
                ...currentItem,
                total: calculateItemTotal(currentItem)
            };
            newItems = [...formData.items, itemWithTotal];
        }

        setFormData(prev => ({
            ...prev,
            items: newItems
        }));

        setCurrentItem({
            itemId: '',
            name: '',
            category: '',
            description: '',
            purchasePrice: 0,
            netWeight: 0,
            grossWeight: 0,
            quantity: 1,
            packagingCost: 0,
            unit: 'kg'
        });
        setError('');
    };

    const removeItemFromInvoice = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData(prev => ({
            ...prev,
            items: newItems
        }));
    };

    const calculateTotal = useCallback(() => {
        let subtotal = 0;
        formData.items.forEach(item => {
            subtotal += calculateItemTotal(item);
        });

        const labourTransportCost = parseFloat(formData.labourTransportCost) || 0;
        const total = subtotal + labourTransportCost;
        return {
            subtotal,
            labourTransportCost,
            total: Math.round(total * 100) / 100
        };
    }, [formData.items, formData.labourTransportCost]);

    useEffect(() => {
        const { total } = calculateTotal();
        const paidAmount = parseFloat(formData.paidAmount) || 0;
        const remainingAmount = Math.max(0, total - paidAmount);

        setFormData(prev => ({
            ...prev,
            totalAmount: total,
            remainingAmount: remainingAmount
        }));
    }, [formData.items, formData.paidAmount, calculateTotal]);

    const validateForm = () => {
        if (!formData.vendorId) {
            setError('Please select a vendor');
            return false;
        }
        if (formData.items.length === 0) {
            setError('Please add at least one item');
            return false;
        }
        if (!formData.invoiceDate) {
            setError('Invoice date is required');
            return false;
        }
        if (!formData.dueDate) {
            setError('Due date is required');
            return false;
        }
        return true;
    };

    // When "Generate Invoice" is clicked, always clear any previous preview and generate a new one
    const handleGeneratePreview = async () => {
        if (!validateForm()) return;

        try {
            // Clear previous preview
            setPreviewInvoice(null);

            // Generate a temporary invoice number for preview
            const previewInvoiceNumber = await generateInvoiceNumber();

            const { subtotal, total, labourTransportCost } = calculateTotal();
            const paidAmount = parseFloat(formData.paidAmount) || 0;
            const remainingAmount = Math.max(0, total - paidAmount);
            const status = remainingAmount > 0 ? 'not paid' : 'paid';

            const invoice = {
                invoiceNumber: previewInvoiceNumber,
                ...formData,
                subtotal,
                labourTransportCost,
                totalAmount: total,
                paidAmount: paidAmount,
                remainingAmount: remainingAmount,
                status: status,
                items: formData.items.map(item => ({
                    ...item,
                    total: calculateItemTotal(item)
                }))
            };

            setPreviewInvoice(invoice);
            setShowPreview(true);
            setInvoiceSaved(false); // not saved yet
            setError('');
        } catch (err) {
            console.error('Error preparing preview:', err);
            setError('Failed to prepare invoice preview');
        }
    };

    const handleClosePreview = () => {
        setShowPreview(false);
        setPreviewInvoice(null);
        setInvoiceSaved(false);
    };

    const generateInvoiceNumber = () => {
        const today = new Date();
        const dateStr =
            today.getFullYear().toString() +
            String(today.getMonth() + 1).padStart(2, '0') +
            String(today.getDate()).padStart(2, '0');

        const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
        return `VIN-${dateStr}-${randomSuffix}`;
    };

    const handleBrokerSearchChange = (e) => {
        setBrokerSearch(e.target.value);
    };

    const handleBrokerSelect = (selectedBroker) => {
        if (selectedBroker) {
            setFormData(prev => ({
                ...prev,
                brokerId: selectedBroker._id,
                brokerName: selectedBroker.name
            }));
            setBrokerSearch(selectedBroker.name);
        } else {
            setFormData(prev => ({
                ...prev,
                brokerId: '',
                brokerName: ''
            }));
            setBrokerSearch('');
        }
        setShowBrokerDropdown(false);
    };

    const handleBrokerInputFocus = () => {
        if (!brokerSearch.trim()) {
            setFilteredBrokers(brokers.slice(0, 50));
            console.log(`Showing first ${Math.min(50, brokers.length)} brokers on focus`);
        }
        setShowBrokerDropdown(true);
    };

    const handleSubmitInvoice = async () => {
        if (!validateForm()) return;

        try {
            setSubmitting(true);
            setError('');

            const invoiceNumber = await generateInvoiceNumber();
            const { subtotal, total, labourTransportCost } = calculateTotal();
            const paidAmount = parseFloat(formData.paidAmount) || 0;
            const remainingAmount = Math.max(0, total - paidAmount);
            const status = remainingAmount > 0 ? 'not paid' : 'paid';

            const invoiceData = {
                invoiceNumber,
                vendorId: formData.vendorId,
                vendorName: formData.vendorName,
                invoiceDate: formData.invoiceDate,
                dueDate: formData.dueDate,
                items: formData.items.map(item => ({
                    itemId: item.itemId,
                    name: item.name,
                    category: item.category || '',
                    description: item.description || '',
                    purchasePrice: parseFloat(item.purchasePrice) || 0,
                    netWeight: parseFloat(item.netWeight) || 0,
                    grossWeight: parseFloat(item.grossWeight) || 0,
                    quantity: parseInt(item.quantity) || 0,
                    packagingCost: parseFloat(item.packagingCost) || 0,
                    unit: item.unit || 'kg',
                    total: calculateItemTotal(item)
                })),
                subtotal,
                labourTransportCost,
                totalAmount: total,
                paidAmount: paidAmount,
                remainingAmount: remainingAmount,
                status: status,
                type: 'vendor',
                createdBy: user._id,
                brokerId: formData.brokerId || null,
                brokerName: formData.brokerName || ''
            };

            const result = await ipcRenderer.invoke('create-vendor-invoice', invoiceData);
            setSuccess(`Vendor Invoice #${result.invoiceNumber} created successfully`);

            // After saving, switch button to "Print"
            setInvoiceSaved(true);

            // Reset form data for next invoice generation
            setFormData({
                vendorId: '',
                vendorName: '',
                invoiceDate: new Date().toISOString().split('T')[0],
                dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
                items: [],
                paidAmount: 0,
                remainingAmount: 0,
                totalAmount: 0,
                labourTransportCost: 0,
                brokerId: '',
                brokerName: ''
            });
            setVendorSearch('');
            setItemSearch('');
            setBrokerSearch('');
        } catch (err) {
            console.error('Error creating vendor invoice:', err);
            setError('Failed to create vendor invoice. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString();
    };

    const handleItemInputFocus = () => {
        if (!itemSearch.trim()) {
            setFilteredItems(items.slice(0, 50));
            console.log(`Showing first ${Math.min(50, items.length)} items on focus`);
        }
        setShowItemDropdown(true);
    };

    const handleVendorInputFocus = () => {
        if (!vendorSearch.trim()) {
            setFilteredVendors(vendors.slice(0, 50));
            console.log(`Showing first ${Math.min(50, vendors.length)} vendors on focus`);
        }
        setShowVendorDropdown(true);
    };

    return (
        <div className="container mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Generate Vendor Invoice</h1>
                <p className="text-gray-600">Create a new invoice for purchases from vendors</p>
            </div>

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}
            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

            {loading ? (
                <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="mt-2 text-gray-500">Loading data...</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <h2 className="text-lg font-semibold mb-4">Vendor Information</h2>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-medium mb-2">
                                    Select Vendor
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={vendorSearch}
                                        onChange={handleVendorSearchChange}
                                        placeholder="Search vendors by name"
                                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        onFocus={handleVendorInputFocus}
                                    />
                                    {showVendorDropdown && (
                                        <div className="absolute z-20 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {filteredVendors.length > 0 ? (
                                                filteredVendors.map(vendor => (
                                                    <div
                                                        key={vendor._id}
                                                        className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                                                        onClick={() => handleVendorSelect(vendor)}
                                                    >
                                                        <span className="font-medium">{vendor.name}</span>
                                                        {vendor.contactPerson && (
                                                            <span className="text-gray-600"> ({vendor.contactPerson})</span>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-4 py-2 text-gray-500">No vendors found</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Invoice Date
                                    </label>
                                    <Input
                                        type="date"
                                        name="invoiceDate"
                                        value={formData.invoiceDate}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Due Date
                                    </label>
                                    <Input
                                        type="date"
                                        name="dueDate"
                                        value={formData.dueDate}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold mb-4">Broker Information (Optional)</h2>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-medium mb-2">
                                    Select Broker
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={brokerSearch}
                                        onChange={handleBrokerSearchChange}
                                        placeholder="Search brokers by name"
                                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        onFocus={handleBrokerInputFocus}
                                    />
                                    {showBrokerDropdown && (
                                        <div className="absolute z-20 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {filteredBrokers.length > 0 ? (
                                                filteredBrokers.map(broker => (
                                                    <div
                                                        key={broker._id}
                                                        className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                                                        onClick={() => handleBrokerSelect(broker)}
                                                    >
                                                        <span className="font-medium">{broker.name}</span>
                                                        {broker.contactPerson && (
                                                            <span className="text-gray-600"> ({broker.contactPerson})</span>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-4 py-2 text-gray-500">No brokers found</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-lg font-semibold mb-4">Add Items</h2>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Select Item
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={itemSearch}
                                            onChange={handleItemSearchChange}
                                            placeholder="Search items by name or ID"
                                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            onFocus={handleItemInputFocus}
                                        />
                                        {showItemDropdown && (
                                            <div className="absolute z-20 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                {filteredItems.length > 0 ? (
                                                    filteredItems.map(item => (
                                                        <div
                                                            key={item._id}
                                                            className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                                                            onClick={() => handleItemSelect(item)}
                                                        >
                                                            {item.name} (ID: {item.itemId || 'N/A'})
                                                            {item.quantity !== undefined && ` - ${item.quantity} available`}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-2 text-gray-500">No items found</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Quantity
                                    </label>
                                    <Input
                                        type="number"
                                        name="quantity"
                                        value={currentItem.quantity}
                                        onChange={handleItemInputChange}
                                        min="1"
                                        disabled={!currentItem.itemId}
                                    />
                                </div>
                            </div>

                            {currentItem.itemId && (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">
                                            Purchase Price (per {currentItem.unit})
                                        </label>
                                        <Input
                                            type="number"
                                            name="purchasePrice"
                                            value={currentItem.purchasePrice}
                                            onChange={handleItemInputChange}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">
                                            Net Weight ({currentItem.unit})
                                        </label>
                                        <Input
                                            type="number"
                                            name="netWeight"
                                            value={currentItem.netWeight}
                                            onChange={handleItemInputChange}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">
                                            Gross Weight ({currentItem.unit})
                                        </label>
                                        <Input
                                            type="number"
                                            name="grossWeight"
                                            value={currentItem.grossWeight}
                                            onChange={handleItemInputChange}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">
                                            Packaging Cost
                                        </label>
                                        <Input
                                            type="number"
                                            name="packagingCost"
                                            value={currentItem.packagingCost}
                                            onChange={handleItemInputChange}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center">
                                {currentItem.itemId && (
                                    <div className="text-sm text-gray-600">
                                        Item Total: {formatCurrency(calculateItemTotal(currentItem))}
                                    </div>
                                )}
                                <Button
                                    onClick={addItemToInvoice}
                                    variant="secondary"
                                    disabled={!currentItem.itemId}
                                >
                                    Add Item
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-lg font-semibold mb-4">Invoice Items</h2>
                        {formData.items.length === 0 ? (
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                No items added to the invoice yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Item
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Price
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Net Weight
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Gross Weight
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Qty
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Packaging
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Total
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {formData.items.map((item, index) => (
                                            <tr key={`${item.itemId}-${index}`}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900">{item.name}</div>
                                                    <div className="text-sm text-gray-500">{item.category}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {formatCurrency(item.purchasePrice)} / {item.unit}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {item.netWeight} {item.unit}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {item.grossWeight} {item.unit}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {item.quantity}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {formatCurrency(item.packagingCost)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap font-medium">
                                                    {formatCurrency(calculateItemTotal(item))}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button
                                                        className="text-red-600 hover:text-red-900"
                                                        onClick={() => removeItemFromInvoice(index)}
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-start mb-6">
                        <div></div>
                        <div className="w-64">
                            <div className="flex justify-between py-2">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="font-medium">{formatCurrency(calculateTotal().subtotal)}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-gray-600">Labour & Transport Cost:</span>
                                <span className="font-medium">{formatCurrency(calculateTotal().labourTransportCost)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-t border-gray-200 font-bold">
                                <span>Total:</span>
                                <span>{formatCurrency(calculateTotal().total)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Paid Amount ($)
                            </label>
                            <Input
                                type="number"
                                name="paidAmount"
                                min="0"
                                step="0.01"
                                value={formData.paidAmount}
                                onChange={handleInputChange}
                            />
                            <p className="text-sm text-gray-500 mt-1">Amount already paid to vendor</p>
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Remaining Amount ($)
                            </label>
                            <input
                                type="number"
                                value={Math.max(0, calculateTotal().total - parseFloat(formData.paidAmount || 0))}
                                className="w-full px-4 py-2 border rounded-md bg-gray-50 focus:outline-none"
                                readOnly
                            />
                            <p className="text-sm text-gray-500 mt-1">Amount still owed to vendor</p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 font-medium mb-2">
                            Labour & Transport Cost ($)
                        </label>
                        <Input
                            type="number"
                            name="labourTransportCost"
                            min="0"
                            step="0.01"
                            value={formData.labourTransportCost}
                            onChange={handleInputChange}
                        />
                        <p className="text-sm text-gray-500 mt-1">Additional costs for labour and transport</p>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            variant="primary"
                            onClick={handleGeneratePreview}
                            disabled={formData.items.length === 0 || submitting}
                            isLoading={submitting}
                        >
                            Generate Invoice
                        </Button>
                    </div>
                </div>
            )}

            {showPreview && previewInvoice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-2xl font-bold">Invoice Preview</h2>
                            <button
                                onClick={handleClosePreview}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <InvoiceDetail
                            invoice={previewInvoice}
                            formatDate={formatDate}
                            calculateItemTotal={calculateItemTotal}
                            isVendorInvoice={true}
                        />

                        {previewInvoice.brokerName && (
                            <div className="mt-4 p-4 bg-gray-50 rounded">
                                <h3 className="text-lg font-semibold mb-2">Broker Information</h3>
                                <div>
                                    <p className="text-sm text-gray-600">Broker</p>
                                    <p className="font-medium">{previewInvoice.brokerName}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end space-x-4 mt-6">
                            <Button variant="secondary" onClick={handleClosePreview}>
                                Cancel
                            </Button>
                            {!invoiceSaved ? (
                                <Button
                                    variant="primary"
                                    onClick={handleSubmitInvoice}
                                    isLoading={submitting}
                                >
                                    Save Invoice
                                </Button>
                            ) : (
                                <Button
                                    variant="primary"
                                    onClick={() => window.print()}
                                >
                                    Print
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GenerateVendorInvoice;
