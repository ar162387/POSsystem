const db = require('../index');

const CustomerModel = {
    findAll: (query = {}, options = {}) => {
        const { skip = 0, limit = 100, sort = { createdAt: -1 } } = options;

        return new Promise((resolve, reject) => {
            db.customers.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .exec((err, customers) => {
                    if (err) reject(err);
                    resolve(customers);
                });
        });
    },

    count: (query = {}) => {
        return new Promise((resolve, reject) => {
            db.customers.count(query, (err, count) => {
                if (err) reject(err);
                resolve(count);
            });
        });
    },

    findOne: (query) => {
        return new Promise((resolve, reject) => {
            db.customers.findOne(query, (err, customer) => {
                if (err) reject(err);
                resolve(customer);
            });
        });
    },

    create: (customerData) => {
        return new Promise((resolve, reject) => {
            db.customers.insert({
                ...customerData,
                createdAt: new Date(),
                updatedAt: new Date()
            }, (err, newCustomer) => {
                if (err) reject(err);
                resolve(newCustomer);
            });
        });
    },

    update: (id, updateData) => {
        return new Promise((resolve, reject) => {
            db.customers.update(
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
            db.customers.remove({ _id: id }, {}, (err, numRemoved) => {
                if (err) reject(err);
                resolve(numRemoved > 0);
            });
        });
    }
};

module.exports = CustomerModel; 