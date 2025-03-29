const db = require('../index');

const CommissionerModel = {
    findAll: (query = {}, options = {}) => {
        const { skip = 0, limit = 100, sort = { name: 1 } } = options;

        return new Promise((resolve, reject) => {
            db.commissioners.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .exec((err, commissioners) => {
                    if (err) reject(err);
                    resolve(commissioners);
                });
        });
    },

    count: (query = {}) => {
        return new Promise((resolve, reject) => {
            db.commissioners.count(query, (err, count) => {
                if (err) reject(err);
                resolve(count);
            });
        });
    },

    findOne: (query) => {
        return new Promise((resolve, reject) => {
            db.commissioners.findOne(query, (err, commissioner) => {
                if (err) reject(err);
                resolve(commissioner);
            });
        });
    },

    create: (commissionerData) => {
        return new Promise((resolve, reject) => {
            const newCommissioner = {
                ...commissionerData,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            db.commissioners.insert(newCommissioner, (err, commissioner) => {
                if (err) reject(err);
                resolve(commissioner);
            });
        });
    },

    update: (id, updateData) => {
        return new Promise((resolve, reject) => {
            db.commissioners.update(
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
            db.commissioners.remove({ _id: id }, {}, (err, numRemoved) => {
                if (err) reject(err);
                resolve(numRemoved > 0);
            });
        });
    }
};

module.exports = CommissionerModel; 