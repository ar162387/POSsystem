const db = require('../index');

const FinancialModel = {
    findAll: (query = {}, options = {}) => {
        const { skip = 0, limit = 100, sort = { updatedAt: -1 } } = options;

        return new Promise((resolve, reject) => {
            db.financial.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .exec((err, items) => {
                    if (err) reject(err);
                    resolve(items);
                });
        });
    },

    count: (query = {}) => {
        return new Promise((resolve, reject) => {
            db.financial.count(query, (err, count) => {
                if (err) reject(err);
                resolve(count);
            });
        });
    },

    findOne: (query) => {
        return new Promise((resolve, reject) => {
            db.financial.findOne(query, (err, item) => {
                if (err) reject(err);
                resolve(item);
            });
        });
    },

    addOrUpdate: (financialData) => {
        const { itemId } = financialData;

        return new Promise((resolve, reject) => {
            // Check if financial data exists for this item
            db.financial.findOne({ itemId }, (err, existingFinancial) => {
                if (err) reject(err);

                if (existingFinancial) {
                    // Update existing record
                    db.financial.update(
                        { _id: existingFinancial._id },
                        { $set: { ...financialData, updatedAt: new Date() } },
                        {},
                        (updateErr) => {
                            if (updateErr) reject(updateErr);
                            resolve(true);
                        }
                    );
                } else {
                    // Create new record
                    db.financial.insert({
                        ...financialData,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }, (insertErr, newFinancial) => {
                        if (insertErr) reject(insertErr);
                        resolve(newFinancial);
                    });
                }
            });
        });
    },

    delete: (id) => {
        return new Promise((resolve, reject) => {
            db.financial.remove({ _id: id }, {}, (err, numRemoved) => {
                if (err) reject(err);
                resolve(numRemoved > 0);
            });
        });
    },

    // Join financial data with inventory data
    getFinancialWithInventory: async (financialData, inventoryItems) => {
        // Create a lookup map for inventory items
        const inventoryMap = {};
        inventoryItems.forEach(item => {
            inventoryMap[item.itemId] = item;
        });

        // Merge financial and inventory data
        return financialData.map(financial => {
            const inventory = inventoryMap[financial.itemId] || {};
            return {
                ...financial,
                quantity: inventory.quantity || 0,
                netWeight: inventory.netWeight || 0
            };
        });
    }
};

module.exports = FinancialModel; 