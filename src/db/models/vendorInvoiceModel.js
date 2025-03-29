const db = require('../index');
const InventoryModel = require('./inventoryModel');

const VendorInvoiceModel = {
    findAll: (query = {}, options = {}) => {
        const { skip = 0, limit = 100, sort = { createdAt: -1 } } = options;

        return new Promise((resolve, reject) => {
            db.vendorInvoices.find(query)
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
            db.vendorInvoices.count(query, (err, count) => {
                if (err) reject(err);
                resolve(count);
            });
        });
    },

    findOne: (query) => {
        return new Promise((resolve, reject) => {
            db.vendorInvoices.findOne(query, (err, invoice) => {
                if (err) reject(err);
                resolve(invoice);
            });
        });
    },

    create: (invoiceData) => {
        const { items, ...invoiceDetails } = invoiceData;

        return new Promise((resolve, reject) => {
            // Create the invoice with full item details included
            db.vendorInvoices.insert({
                ...invoiceDetails,
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
            db.vendorInvoices.update(
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

    delete: (id) => {
        return new Promise((resolve, reject) => {
            db.vendorInvoices.remove({ _id: id }, {}, (err, numRemoved) => {
                if (err) reject(err);
                resolve(numRemoved > 0);
            });
        });
    },

    // Special methods
    generateInvoiceNumber: () => {
        return new Promise((resolve, reject) => {
            db.vendorInvoices.find({}, { invoiceNumber: 1 }, (err, invoices) => {
                if (err) reject(err);

                // Get latest invoice number and increment
                let maxInvoice = 0;
                invoices.forEach(invoice => {
                    // Handle vendor invoice numbers, which might start with "V-"
                    const numPart = invoice.invoiceNumber.replace(/^V-/, '');
                    const num = parseInt(numPart, 10);
                    if (num > maxInvoice) maxInvoice = num;
                });

                // Format with V- prefix for vendor invoices
                resolve(`V-${(maxInvoice + 1).toString().padStart(5, '0')}`);
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
                purchasePrice: parseFloat(item.purchasePrice || item.costPrice || 0),
                packagingCost: parseFloat(item.packagingCost || 0),
                quantity: parseInt(item.quantity || 0)
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

    // Update inventory quantities when creating a vendor invoice (INCREMENT)
    updateInventoryForInvoice: async (items) => {
        const updateInventoryPromises = items.map(item => {
            return new Promise(async (resolveItem, rejectItem) => {
                try {
                    // Find the item in inventory
                    const inventoryItem = await InventoryModel.findOne({ itemId: item.itemId });

                    if (!inventoryItem) {
                        // Create new inventory item if it doesn't exist
                        await InventoryModel.create({
                            itemId: item.itemId,
                            name: item.name || item.itemName,
                            quantity: item.quantity,
                            netWeight: item.netWeight,
                            costPrice: item.purchasePrice || item.costPrice || 0,
                            sellingPrice: item.sellingPrice || 0,
                            packagingCost: item.packagingCost || 0
                        });
                    } else {
                        // Calculate new quantities - INCREMENTING for vendor invoices
                        const newQuantity = inventoryItem.quantity + item.quantity;
                        const newNetWeight = inventoryItem.netWeight + item.netWeight;

                        // Update inventory
                        await InventoryModel.update(inventoryItem._id, {
                            quantity: newQuantity,
                            netWeight: newNetWeight,
                            // Optionally update other fields if they've changed
                            costPrice: item.purchasePrice || item.costPrice || inventoryItem.costPrice,
                            packagingCost: item.packagingCost || inventoryItem.packagingCost
                        });
                    }

                    resolveItem(true);
                } catch (error) {
                    rejectItem(error);
                }
            });
        });

        return Promise.all(updateInventoryPromises);
    },

    // Get a preview of how inventory will change after invoice is created
    getInventoryChangePreview: async (items) => {
        try {
            const itemIds = items.map(item => item.itemId);

            // Find all relevant inventory items
            const inventoryItems = await InventoryModel.findAll({
                itemId: { $in: itemIds }
            });

            // Create a map of inventory items
            const inventoryMap = {};
            inventoryItems.forEach(item => {
                inventoryMap[item.itemId] = item;
            });

            // Generate preview of changes
            const changePreview = items.map(item => {
                const inventoryItem = inventoryMap[item.itemId];

                // Make sure we have the correct price field
                const itemPrice = item.purchasePrice || item.costPrice || 0;

                // If item exists in inventory
                if (inventoryItem) {
                    return {
                        itemId: item.itemId,
                        name: item.name || item.itemName || inventoryItem.name,
                        currentQuantity: inventoryItem.quantity,
                        currentNetWeight: inventoryItem.netWeight,
                        newQuantity: inventoryItem.quantity + item.quantity,
                        newNetWeight: inventoryItem.netWeight + item.netWeight,
                        quantityChange: item.quantity,
                        netWeightChange: item.netWeight,
                        purchasePrice: itemPrice,
                        exists: true
                    };
                }
                // If item is new to inventory
                else {
                    return {
                        itemId: item.itemId,
                        name: item.name || item.itemName || 'New Item',
                        currentQuantity: 0,
                        currentNetWeight: 0,
                        newQuantity: item.quantity,
                        newNetWeight: item.netWeight,
                        quantityChange: item.quantity,
                        netWeightChange: item.netWeight,
                        purchasePrice: itemPrice,
                        exists: false
                    };
                }
            });

            return changePreview;
        } catch (error) {
            console.error('Error generating inventory change preview:', error);
            throw error;
        }
    }
};

module.exports = VendorInvoiceModel; 