const db = require('../index');
const InventoryModel = require('./inventoryModel');

const InvoiceModel = {
    findAll: (query = {}, options = {}) => {
        const { skip = 0, limit = 100, sort = { createdAt: -1 } } = options;

        return new Promise((resolve, reject) => {
            db.invoices.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .exec((err, invoices) => {
                    if (err) reject(err);
                    resolve(invoices);
                });
        });
    },

    count: (query = {}) => {
        return new Promise((resolve, reject) => {
            db.invoices.count(query, (err, count) => {
                if (err) reject(err);
                resolve(count);
            });
        });
    },

    findOne: (query) => {
        return new Promise((resolve, reject) => {
            db.invoices.findOne(query, (err, invoice) => {
                if (err) reject(err);
                resolve(invoice);
            });
        });
    },

    create: (invoiceData) => {
        const { items, ...invoiceDetails } = invoiceData;

        // Add default values for customer payment fields
        const customerPaymentDefaults = {
            status: invoiceDetails.remainingAmount <= 0 ? 'paid' : 'not paid',
            paidAmount: invoiceDetails.paidAmount || 0,
            remainingAmount: invoiceDetails.remainingAmount || invoiceDetails.totalAmount || 0,
            paidDate: invoiceDetails.remainingAmount <= 0 ? new Date() : null
        };

        // Add default values for broker payment fields if a broker is selected
        const brokerPaymentDefaults = invoiceDetails.brokerId ? {
            brokerPaymentStatus: 'not paid',
            brokerPaidAmount: 0,
            brokerRemainingAmount: invoiceDetails.commissionAmount || 0,
            brokerPaymentDate: null
        } : {};

        return new Promise((resolve, reject) => {
            // Start a transaction-like operation
            // 1. Create the invoice with full item details included
            db.invoices.insert({
                ...invoiceDetails,
                ...customerPaymentDefaults,
                ...brokerPaymentDefaults,
                items: items, // Explicitly include the items array with all details
                createdAt: new Date(),
                updatedAt: new Date()
            }, (err, newInvoice) => {
                if (err) reject(err);
                resolve(newInvoice);
            });
        });
    },

    update: (id, updateData) => {
        return new Promise((resolve, reject) => {
            db.invoices.update(
                { _id: id },
                { $set: { ...updateData, updatedAt: new Date() } },
                {},
                (err, numUpdated) => {
                    if (err) reject(err);
                    resolve(numUpdated > 0);
                }
            );
        });
    },

    // Update customer payment
    updateCustomerPayment: (id, paymentData) => {
        return new Promise((resolve, reject) => {
            // Ensure values are properly formatted
            const paidAmount = Math.round(parseFloat(paymentData.paidAmount || 0));
            const totalAmount = Math.round(parseFloat(paymentData.totalAmount || 0));

            // Calculate payment status
            const remainingAmount = Math.max(0, totalAmount - paidAmount);

            const status = remainingAmount <= 0
                ? 'paid'
                : (paidAmount > 0 ? 'partially paid' : 'not paid');

            db.invoices.update(
                { _id: id },
                {
                    $set: {
                        paidAmount: paidAmount,
                        remainingAmount: remainingAmount,
                        status: status,
                        paidDate: status === 'paid' ? new Date() : null,
                        updatedAt: new Date()
                    }
                },
                {},
                (err, numUpdated) => {
                    if (err) reject(err);
                    resolve(numUpdated > 0);
                }
            );
        });
    },

    // Update broker payment
    updateBrokerPayment: (id, brokerPaymentData) => {
        return new Promise((resolve, reject) => {
            // Ensure values are properly formatted
            const brokerPaidAmount = Math.round(parseFloat(brokerPaymentData.brokerPaidAmount || 0));
            const commissionAmount = Math.round(parseFloat(brokerPaymentData.commissionAmount || 0));

            // Calculate broker payment status
            const brokerRemainingAmount = Math.max(0, commissionAmount - brokerPaidAmount);

            const brokerPaymentStatus = brokerRemainingAmount <= 0
                ? 'paid'
                : (brokerPaidAmount > 0 ? 'partially paid' : 'not paid');

            db.invoices.update(
                { _id: id },
                {
                    $set: {
                        brokerPaidAmount: brokerPaidAmount,
                        brokerRemainingAmount: brokerRemainingAmount,
                        brokerPaymentStatus: brokerPaymentStatus,
                        brokerPaymentDate: brokerPaymentStatus === 'paid' ? new Date() : brokerPaymentData.brokerPaymentDate,
                        updatedAt: new Date()
                    }
                },
                {},
                (err, numUpdated) => {
                    if (err) reject(err);
                    resolve(numUpdated > 0);
                }
            );
        });
    },

    delete: (id) => {
        return new Promise((resolve, reject) => {
            db.invoices.remove({ _id: id }, {}, (err, numRemoved) => {
                if (err) reject(err);
                resolve(numRemoved > 0);
            });
        });
    },

    // Special methods
    generateInvoiceNumber: () => {
        return new Promise((resolve, reject) => {
            db.invoices.find({}, { invoiceNumber: 1 }, (err, invoices) => {
                if (err) reject(err);

                // Get latest invoice number and increment
                let maxInvoice = 0;
                invoices.forEach(invoice => {
                    const num = parseInt(invoice.invoiceNumber, 10);
                    if (num > maxInvoice) maxInvoice = num;
                });

                resolve((maxInvoice + 1).toString().padStart(6, '0'));
            });
        });
    },

    // Get invoice with complete item details
    getInvoiceWithItemDetails: async (invoice) => {
        if (!invoice || !invoice.items || invoice.items.length === 0) {
            return invoice;
        }

        try {
            // Get all item IDs from the invoice
            const itemIds = invoice.items.map(item => item.itemId);

            // Find all items in inventory
            const inventoryItems = await InventoryModel.findAll({
                itemId: { $in: itemIds }
            });

            // Create a lookup map for inventory items
            const inventoryMap = {};
            inventoryItems.forEach(item => {
                inventoryMap[item.itemId] = item;
            });

            // Merge invoice items with inventory data
            const itemsWithDetails = invoice.items.map(item => ({
                ...item,
                name: item.name || inventoryMap[item.itemId]?.name || 'Unnamed Item',
                itemName: item.itemName || inventoryMap[item.itemId]?.name || 'Unnamed Item',
                netWeight: parseFloat(item.netWeight || 0),
                sellingPrice: Math.round(parseFloat(item.sellingPrice || 0)),
                packagingCost: Math.round(parseFloat(item.packagingCost || 0)),
                quantity: parseFloat(item.quantity || 0)
            }));

            return {
                ...invoice,
                items: itemsWithDetails
            };
        } catch (error) {
            console.error('Error processing invoice items:', error);
            return invoice;
        }
    },

    // Update inventory quantities when creating an invoice
    updateInventoryForInvoice: async (items) => {
        const updateInventoryPromises = items.map(item => {
            return new Promise(async (resolveItem, rejectItem) => {
                try {
                    // Find the item in inventory
                    const inventoryItem = await InventoryModel.findOne({ itemId: item.itemId });

                    if (!inventoryItem) {
                        throw new Error(`Item with ID ${item.itemId} not found`);
                    }

                    // Calculate new quantities with float values
                    const newQuantity = parseFloat(inventoryItem.quantity) - parseFloat(item.quantity);
                    const newNetWeight = parseFloat(inventoryItem.netWeight) - parseFloat(item.netWeight);

                    if (newQuantity < 0 || newNetWeight < 0) {
                        throw new Error(`Insufficient stock for item ${item.name || inventoryItem.name}`);
                    }

                    // Update inventory with float quantity and integer prices
                    await InventoryModel.update(inventoryItem._id, {
                        quantity: newQuantity,
                        netWeight: newNetWeight
                    });

                    resolveItem(true);
                } catch (error) {
                    rejectItem(error);
                }
            });
        });

        return Promise.all(updateInventoryPromises);
    },

    // Calculate broker commission with integer prices
    calculateBrokerCommission: (totalAmount, commissionPercentage) => {
        if (!totalAmount || !commissionPercentage) return 0;
        return Math.round((parseFloat(totalAmount) * parseFloat(commissionPercentage)) / 100);
    },

    // Get customer payment status label
    getCustomerPaymentStatusLabel: (invoice) => {
        if (invoice.status === 'paid') return 'Paid';
        if (invoice.paidAmount > 0 && invoice.remainingAmount > 0) return 'Partially Paid';
        return 'Not Paid';
    },

    // Get customer payment status class for UI
    getCustomerPaymentStatusClass: (invoice) => {
        if (invoice.status === 'paid') return 'bg-green-100 text-green-800';
        if (invoice.paidAmount > 0 && invoice.remainingAmount > 0) return 'bg-amber-100 text-amber-800';
        return 'bg-red-100 text-red-800';
    },

    // Get broker payment status label
    getBrokerPaymentStatusLabel: (invoice) => {
        if (!invoice.brokerId) return 'N/A';
        if (invoice.brokerPaymentStatus === 'paid') return 'Paid';
        if (invoice.brokerPaidAmount > 0 && invoice.brokerRemainingAmount > 0) return 'Partially Paid';
        return 'Not Paid';
    },

    // Get broker payment status class for UI
    getBrokerPaymentStatusClass: (invoice) => {
        if (!invoice.brokerId) return 'bg-gray-100 text-gray-800';
        if (invoice.brokerPaymentStatus === 'paid') return 'bg-green-100 text-green-800';
        if (invoice.brokerPaidAmount > 0 && invoice.brokerRemainingAmount > 0) return 'bg-amber-100 text-amber-800';
        return 'bg-red-100 text-red-800';
    }
};

module.exports = InvoiceModel; 