const InventoryModel = require('../models/inventoryModel');
const FinancialModel = require('../models/financialModel');

const InventoryController = {
    generateItemId: async () => {
        try {
            return await InventoryModel.generateItemId();
        } catch (error) {
            throw error;
        }
    },

    addInventoryItem: async (itemData) => {
        try {
            // Convert quantity to float and price to integer
            const processedData = {
                ...itemData,
                quantity: parseFloat(itemData.quantity || 0),
                netWeight: parseFloat(itemData.netWeight || 0),
                costPrice: Math.round(parseFloat(itemData.costPrice || 0)),
                sellingPrice: Math.round(parseFloat(itemData.sellingPrice || 0)),
                inColdStorage: Boolean(itemData.inColdStorage || false),
                coldStorageDate: itemData.inColdStorage ? itemData.coldStorageDate : null,
                coldStorageAddress: itemData.inColdStorage ? itemData.coldStorageAddress || "" : ""
            };

            return await InventoryModel.create(processedData);
        } catch (error) {
            throw error;
        }
    },

    getInventory: async (options) => {
        try {
            const { page = 1, perPage = 10, filter = '' } = options;
            const skip = (page - 1) * perPage;

            let query = {};

            // Apply filter if provided
            if (filter && filter.trim() !== '') {
                query = {
                    $or: [
                        { itemId: new RegExp(filter, 'i') },
                        { name: new RegExp(filter, 'i') },
                        { coldStorageAddress: new RegExp(filter, 'i') }
                    ]
                };
            }

            // Get total count for pagination
            const count = await InventoryModel.count(query);

            // Get paginated items
            const items = await InventoryModel.findAll(query, {
                skip,
                limit: perPage,
                sort: { createdAt: -1 }
            });

            return {
                items,
                total: count,
                page,
                totalPages: Math.ceil(count / perPage)
            };
        } catch (error) {
            throw error;
        }
    },

    updateInventoryItem: async (itemData) => {
        try {
            const { _id, ...updateFields } = itemData;

            // Convert quantity to float and price to integer
            const processedData = {
                ...updateFields
            };

            // Process quantity and netWeight as float if present
            if (updateFields.hasOwnProperty('quantity')) {
                processedData.quantity = parseFloat(updateFields.quantity || 0);
            }

            if (updateFields.hasOwnProperty('netWeight')) {
                processedData.netWeight = parseFloat(updateFields.netWeight || 0);
            }

            // Process prices as integers if present
            if (updateFields.hasOwnProperty('costPrice')) {
                processedData.costPrice = Math.round(parseFloat(updateFields.costPrice || 0));
            }

            if (updateFields.hasOwnProperty('sellingPrice')) {
                processedData.sellingPrice = Math.round(parseFloat(updateFields.sellingPrice || 0));
            }

            // Process cold storage fields
            if (updateFields.hasOwnProperty('inColdStorage')) {
                processedData.inColdStorage = Boolean(updateFields.inColdStorage);

                if (!processedData.inColdStorage) {
                    processedData.coldStorageDate = null;
                    processedData.coldStorageAddress = "";
                }
            }

            return await InventoryModel.update(_id, processedData);
        } catch (error) {
            throw error;
        }
    },

    deleteInventoryItem: async (itemId) => {
        try {
            // Delete inventory item
            const result = await InventoryModel.delete(itemId);

            // Also delete financial details for this item
            try {
                await FinancialModel.delete({ itemId });
            } catch (finErr) {
                console.error('Error deleting financial data:', finErr);
            }

            return result;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = InventoryController; 