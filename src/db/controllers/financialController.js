const FinancialModel = require('../models/financialModel');
const InventoryModel = require('../models/inventoryModel');

const FinancialController = {
    addUpdateFinancial: async (financialData) => {
        try {
            return await FinancialModel.addOrUpdate(financialData);
        } catch (error) {
            throw error;
        }
    },

    getFinancial: async (options) => {
        try {
            const { page = 1, perPage = 10, filter = '' } = options;
            const skip = (page - 1) * perPage;

            let query = {};

            // Apply filter if provided
            if (filter && filter.trim() !== '') {
                query = {
                    $or: [
                        { itemId: new RegExp(filter, 'i') },
                        { itemName: new RegExp(filter, 'i') }
                    ]
                };
            }

            // Get total count for pagination
            const count = await FinancialModel.count(query);

            // Get paginated items
            const financialItems = await FinancialModel.findAll(query, {
                skip,
                limit: perPage,
                sort: { updatedAt: -1 }
            });

            // Get item IDs for joining with inventory
            const itemIds = financialItems.map(item => item.itemId);

            // Get inventory items for join
            const inventoryItems = await InventoryModel.findAll({
                itemId: { $in: itemIds }
            });

            // Merge financial and inventory data
            const mergedData = await FinancialModel.getFinancialWithInventory(
                financialItems,
                inventoryItems
            );

            return {
                items: mergedData,
                total: count,
                page,
                totalPages: Math.ceil(count / perPage)
            };
        } catch (error) {
            throw error;
        }
    },

    deleteFinancial: async (id) => {
        try {
            return await FinancialModel.delete(id);
        } catch (error) {
            throw error;
        }
    }
};

module.exports = FinancialController; 