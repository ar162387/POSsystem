const db = require('../index');

const BrokerModel = {
    findAll: (query = {}, options = {}) => {
        const { skip = 0, limit = 100, sort = { name: 1 } } = options;

        return new Promise((resolve, reject) => {
            db.brokers.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .exec((err, brokers) => {
                    if (err) reject(err);
                    resolve(brokers);
                });
        });
    },

    count: (query = {}) => {
        return new Promise((resolve, reject) => {
            db.brokers.count(query, (err, count) => {
                if (err) reject(err);
                resolve(count);
            });
        });
    },

    findOne: (query) => {
        return new Promise((resolve, reject) => {
            db.brokers.findOne(query, (err, broker) => {
                if (err) reject(err);
                resolve(broker);
            });
        });
    },

    create: (brokerData) => {
        const brokerWithDefaults = {
            ...brokerData,
            createdAt: new Date(),
            updatedAt: new Date(),
            paymentHistory: brokerData.paymentHistory || [],
            totalPaid: 0
        };

        return new Promise((resolve, reject) => {
            db.brokers.insert(brokerWithDefaults, (err, newBroker) => {
                if (err) reject(err);
                resolve(newBroker);
            });
        });
    },

    update: (id, updateData) => {
        return new Promise((resolve, reject) => {
            db.brokers.update(
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
            db.brokers.remove({ _id: id }, {}, (err, numRemoved) => {
                if (err) reject(err);
                resolve(numRemoved > 0);
            });
        });
    }
};

module.exports = BrokerModel; 