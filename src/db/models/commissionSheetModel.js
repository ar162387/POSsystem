const db = require('../index');

const CommissionSheetModel = {
    findAll: (query = {}, options = {}) => {
        const { skip = 0, limit = 100, sort = { createdAt: -1 } } = options;

        return new Promise((resolve, reject) => {
            db.commissionSheets.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .exec((err, sheets) => {
                    if (err) reject(err);
                    resolve(sheets);
                });
        });
    },

    count: (query = {}) => {
        return new Promise((resolve, reject) => {
            db.commissionSheets.count(query, (err, count) => {
                if (err) reject(err);
                resolve(count);
            });
        });
    },

    findOne: (query) => {
        return new Promise((resolve, reject) => {
            db.commissionSheets.findOne(query, (err, sheet) => {
                if (err) reject(err);
                resolve(sheet);
            });
        });
    },

    create: (sheetData) => {
        // Calculate status based on pendingAmount - only 'paid' or 'not paid'
        let status = 'not paid';
        if (sheetData.receivedAmount >= sheetData.totalPrice) {
            status = 'paid';
        }

        return new Promise((resolve, reject) => {
            db.commissionSheets.insert({
                ...sheetData,
                status,
                createdAt: new Date(),
                updatedAt: new Date()
            }, (err, newSheet) => {
                if (err) reject(err);
                resolve(newSheet);
            });
        });
    },

    update: (id, updateData) => {
        // Recalculate status if amounts are changing
        let updates = { ...updateData };

        if ('receivedAmount' in updateData || 'totalPrice' in updateData) {
            const receivedAmount = updateData.receivedAmount !== undefined ?
                updateData.receivedAmount : updateData.receivedAmount;
            const totalPrice = updateData.totalPrice !== undefined ?
                updateData.totalPrice : updateData.totalPrice;

            // Only two statuses: 'paid' if pendingAmount is 0, otherwise 'not paid'
            let status = 'not paid';
            if (receivedAmount >= totalPrice) {
                status = 'paid';
            }

            updates.status = status;
        }

        return new Promise((resolve, reject) => {
            db.commissionSheets.update(
                { _id: id },
                { $set: { ...updates, updatedAt: new Date() } },
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
            db.commissionSheets.remove({ _id: id }, {}, (err, numRemoved) => {
                if (err) reject(err);
                resolve(numRemoved > 0);
            });
        });
    },

    generateInvoiceNumber: () => {
        return new Promise((resolve, reject) => {
            db.commissionSheets.find({}, { invoiceKey: 1 }, (err, sheets) => {
                if (err) reject(err);

                // Format: ATC-XXXX where XXXX is a sequential number
                let maxNum = 0;

                sheets.forEach(sheet => {
                    if (sheet.invoiceKey && sheet.invoiceKey.startsWith('ATC-')) {
                        const num = parseInt(sheet.invoiceKey.substring(4), 10);
                        if (!isNaN(num) && num > maxNum) {
                            maxNum = num;
                        }
                    }
                });

                // Generate next invoice number
                const nextNum = maxNum + 1;
                const invoiceKey = `ATC-${nextNum.toString().padStart(4, '0')}`;
                resolve(invoiceKey);
            });
        });
    }
};

module.exports = CommissionSheetModel; 