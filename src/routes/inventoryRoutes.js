const { ipcMain } = require('electron');
const InventoryController = require('../db/controllers/inventoryController');
const InventoryModel = require('../db/models/inventoryModel');
const VendorInvoiceModel = require('../db/models/vendorInvoiceModel');
const InvoiceModel = require('../db/models/invoiceModel');

const registerInventoryRoutes = () => {
    // Generate unique 4-digit item ID
    ipcMain.handle('generate-item-id', async () => {
        return await InventoryController.generateItemId();
    });

    // Add new inventory item
    ipcMain.handle('add-inventory-item', async (event, itemData) => {
        return await InventoryController.addInventoryItem(itemData);
    });

    // Get all inventory items with pagination
    ipcMain.handle('get-inventory', async (event, options) => {
        return await InventoryController.getInventory(options);
    });

    // Update inventory item
    ipcMain.handle('update-inventory-item', async (event, itemData) => {
        return await InventoryController.updateInventoryItem(itemData);
    });

    // Delete inventory item
    ipcMain.handle('delete-inventory-item', async (event, itemId) => {
        return await InventoryController.deleteInventoryItem(itemId);
    });

    // Get item purchase history from vendor invoices
    ipcMain.handle('get-item-purchase-history', async (event, itemId) => {
        try {
            // Find all vendor invoices that include this item
            const vendorInvoices = await VendorInvoiceModel.findAll({
                'items.itemId': itemId
            });

            let totalPurchaseAmount = 0;
            let totalPurchaseQuantity = 0;

            // Calculate total purchase amount and quantity
            vendorInvoices.forEach(invoice => {
                if (invoice.items && Array.isArray(invoice.items)) {
                    invoice.items.forEach(item => {
                        if (item.itemId === itemId) {
                            const price = parseFloat(item.purchasePrice || item.costPrice || 0);
                            const quantity = parseFloat(item.quantity || 0);
                            totalPurchaseAmount += price * quantity;
                            totalPurchaseQuantity += quantity;
                        }
                    });
                }
            });

            // Calculate average purchase price
            const averagePurchasePrice = totalPurchaseQuantity > 0
                ? totalPurchaseAmount / totalPurchaseQuantity
                : 0;

            return {
                totalPurchaseAmount,
                totalPurchaseQuantity,
                averagePurchasePrice,
                purchaseCount: vendorInvoices.length
            };
        } catch (error) {
            console.error('Error fetching item purchase history:', error);
            throw error;
        }
    });

    // Get item sales history from customer invoices
    ipcMain.handle('get-item-sales-history', async (event, itemId) => {
        try {
            // Find all invoices that include this item
            const invoices = await InvoiceModel.findAll({
                'items.itemId': itemId
            });

            let totalSellingAmount = 0;
            let totalSellingQuantity = 0;

            // Calculate total selling amount and quantity
            invoices.forEach(invoice => {
                if (invoice.items && Array.isArray(invoice.items)) {
                    invoice.items.forEach(item => {
                        if (item.itemId === itemId) {
                            const price = parseFloat(item.sellingPrice || 0);
                            const quantity = parseFloat(item.quantity || 0);
                            totalSellingAmount += price * quantity;
                            totalSellingQuantity += quantity;
                        }
                    });
                }
            });

            // Calculate average selling price
            const averageSellingPrice = totalSellingQuantity > 0
                ? totalSellingAmount / totalSellingQuantity
                : 0;

            return {
                totalSellingAmount,
                totalSellingQuantity,
                averageSellingPrice,
                orderCount: invoices.length
            };
        } catch (error) {
            console.error('Error fetching item sales history:', error);
            throw error;
        }
    });

    // Add a route for get-inventory-items that returns all inventory items
    ipcMain.handle('get-inventory-items', async (event, options = {}) => {
        try {
            const { page = 1, perPage = 10, search = '' } = options;
            const skip = (page - 1) * perPage;

            let query = {};
            if (search) {
                query = {
                    $or: [
                        { name: new RegExp(search, 'i') },
                        { itemId: new RegExp(search, 'i') }
                    ]
                };
            }

            const items = await InventoryModel.findAll(query, {
                skip,
                limit: parseInt(perPage),
                sort: { createdAt: -1 }
            });

            const total = await InventoryModel.count(query);

            return {
                items,
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / perPage)
            };
        } catch (error) {
            console.error('Error fetching inventory items:', error);
            throw error;
        }
    });

    // Add a quick search route for autocomplete functionality
    ipcMain.handle('search-inventory', async (event, options = {}) => {
        try {
            const { searchText, limit = 10 } = options;

            if (!searchText || searchText.length < 2) {
                return { items: [] };
            }

            // Create a case-insensitive regex search query
            const query = {
                $or: [
                    { name: new RegExp(searchText, 'i') },
                    { itemId: new RegExp(searchText, 'i') }
                ]
            };

            // Find matching items, limited to the specified number
            const items = await InventoryModel.findAll(query, {
                limit: parseInt(limit),
                sort: { name: 1 } // Sort alphabetically by name
            });

            // Return only the necessary fields for the dropdown
            return {
                items: items.map(item => ({
                    itemId: item.itemId,
                    name: item.name
                }))
            };
        } catch (error) {
            console.error('Error searching inventory items:', error);
            throw error;
        }
    });
};

module.exports = registerInventoryRoutes; 