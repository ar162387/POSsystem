const db = require('../index');

const CommissionerPaymentModel = {
    findAll: (query = {}, options = {}) => {
        const { skip = 0, limit = 100, sort = { createdAt: -1 } } = options;

        return new Promise((resolve, reject) => {
            db.commissionerPayments.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .exec((err, payments) => {
                    if (err) reject(err);
                    resolve(payments);
                });
        });
    },

    count: (query = {}) => {
        return new Promise((resolve, reject) => {
            db.commissionerPayments.count(query, (err, count) => {
                if (err) reject(err);
                resolve(count);
            });
        });
    },

    findOne: (query) => {
        return new Promise((resolve, reject) => {
            db.commissionerPayments.findOne(query, (err, payment) => {
                if (err) reject(err);
                resolve(payment);
            });
        });
    },

    getPaymentsByCommissioner: (commissionerId) => {
        return new Promise((resolve, reject) => {
            db.commissionerPayments.find({ commissionerId })
                .sort({ date: -1 })
                .exec((err, payments) => {
                    if (err) reject(err);
                    resolve(payments);
                });
        });
    },

    getTotalPaidByCommissioner: (commissionerId) => {
        return new Promise((resolve, reject) => {
            db.commissionerPayments.find({ commissionerId }, (err, payments) => {
                if (err) reject(err);

                const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
                resolve(totalPaid);
            });
        });
    },

    create: (paymentData) => {
        const { commissionerId, amount, method, date } = paymentData;

        return new Promise((resolve, reject) => {
            // Validate data
            if (!commissionerId) {
                return reject(new Error('Commissioner ID is required'));
            }

            if (!amount || amount <= 0) {
                return reject(new Error('Amount must be greater than zero'));
            }

            // Create payment record
            db.commissionerPayments.insert({
                commissionerId,
                amount,
                method: method || 'Cash',
                date: date || new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            }, async (err, newPayment) => {
                if (err) return reject(err);

                // Update commissioner's payment info if needed
                // This could be implemented if you want to keep payment totals in the commissioner record

                resolve(newPayment);
            });
        });
    },

    update: (id, updateData) => {
        return new Promise((resolve, reject) => {
            db.commissionerPayments.update(
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
            db.commissionerPayments.remove({ _id: id }, {}, (err, numRemoved) => {
                if (err) reject(err);
                resolve(numRemoved > 0);
            });
        });
    }
};

module.exports = CommissionerPaymentModel;
