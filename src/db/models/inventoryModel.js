const db = require('../index');

const InventoryModel = {
    findAll: (query = {}, options = {}) => {
        const { skip = 0, limit = 100, sort = { createdAt: -1 } } = options;

        return new Promise((resolve, reject) => {
            db.inventory.find(query)
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
            db.inventory.count(query, (err, count) => {
                if (err) reject(err);
                resolve(count);
            });
        });
    },

    findOne: (query) => {
        return new Promise((resolve, reject) => {
            db.inventory.findOne(query, (err, item) => {
                if (err) reject(err);
                resolve(item);
            });
        });
    },

    create: (itemData) => {
        // Set default cold storage values if not provided
        const itemWithDefaults = {
            ...itemData,
            inColdStorage: itemData.inColdStorage || false,
            coldStorageDate: itemData.inColdStorage ? itemData.coldStorageDate || null : null,
            coldStorageAddress: itemData.inColdStorage ? itemData.coldStorageAddress || "" : "",
            createdAt: new Date(),
            updatedAt: new Date()
        };

        return new Promise((resolve, reject) => {
            db.inventory.insert(itemWithDefaults, (err, newItem) => {
                if (err) reject(err);
                resolve(newItem);
            });
        });
    },

    update: (id, updateData) => {
        // Handle cold storage fields logic
        const dataToUpdate = { ...updateData };

        // If not in cold storage, clear the related fields
        if (dataToUpdate.hasOwnProperty('inColdStorage') && !dataToUpdate.inColdStorage) {
            dataToUpdate.coldStorageDate = null;
            dataToUpdate.coldStorageAddress = "";
        }

        return new Promise((resolve, reject) => {
            db.inventory.update(
                { _id: id },
                { $set: { ...dataToUpdate, updatedAt: new Date() } },
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
            db.inventory.remove({ _id: id }, {}, (err, numRemoved) => {
                if (err) reject(err);
                resolve(numRemoved > 0);
            });
        });
    },

    generateItemId: () => {
        return new Promise((resolve, reject) => {
            db.inventory.find({}, { itemId: 1 }, (err, items) => {
                if (err) reject(err);

                // Get all existing IDs and find available 4-digit ID
                const existingIds = items.map(item => parseInt(item.itemId, 10));
                let newId = 1000;

                while (existingIds.includes(newId) && newId < 10000) {
                    newId++;
                }

                if (newId >= 10000) {
                    // Handle case where all 4-digit IDs are used
                    reject(new Error('No available item IDs'));
                } else {
                    resolve(newId.toString());
                }
            });
        });
    }
};

module.exports = InventoryModel; 