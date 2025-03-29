const db = require('../index');

const VendorModel = {
    findAll: (query = {}, options = {}) => {
        const { skip = 0, limit = 100, sort = { createdAt: -1 } } = options;

        return new Promise((resolve, reject) => {
            db.vendors.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .exec((err, vendors) => {
                    if (err) reject(err);
                    resolve(vendors);
                });
        });
    },

    count: (query = {}) => {
        return new Promise((resolve, reject) => {
            db.vendors.count(query, (err, count) => {
                if (err) reject(err);
                resolve(count);
            });
        });
    },

    findOne: (query) => {
        return new Promise((resolve, reject) => {
            db.vendors.findOne(query, (err, vendor) => {
                if (err) reject(err);
                resolve(vendor);
            });
        });
    },

    create: (vendorData) => {
        return new Promise((resolve, reject) => {
            db.vendors.insert({
                ...vendorData,
                createdAt: new Date(),
                updatedAt: new Date()
            }, (err, newVendor) => {
                if (err) reject(err);
                resolve(newVendor);
            });
        });
    },

    update: (id, updateData) => {
        return new Promise((resolve, reject) => {
            console.log('Updating vendor:', { id, updateData });
            db.vendors.update(
                { _id: id },
                { $set: { ...updateData, updatedAt: new Date() } },
                { returnUpdatedDocs: true },
                (err, numUpdated, updatedVendor) => {
                    if (err) {
                        console.error('Error updating vendor:', err);
                        reject(err);
                    }
                    if (numUpdated === 0) {
                        console.log('No vendor found with id:', id);
                        resolve(null);
                    }
                    console.log('Successfully updated vendor:', updatedVendor);
                    resolve(updatedVendor);
                }
            );
        });
    },

    delete: (id) => {
        return new Promise((resolve, reject) => {
            db.vendors.remove({ _id: id }, {}, (err, numRemoved) => {
                if (err) reject(err);
                resolve(numRemoved > 0);
            });
        });
    }
};

module.exports = VendorModel; 