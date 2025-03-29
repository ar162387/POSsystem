const { ipcMain } = require('electron');
const db = require('../db');
const registerVendorInvoiceRoutes = require('./vendorInvoiceRoutes');

function registerVendorRoutes() {
    console.log('Vendor routes registered');

    // Register invoice-specific routes
    registerVendorInvoiceRoutes();

    // Vendor management
    ipcMain.handle('add-vendor', async (_, vendorData) => {
        try {
            const result = await new Promise((resolve, reject) => {
                db.vendors.insert(vendorData, (err, newDoc) => {
                    if (err) reject(err);
                    resolve(newDoc);
                });
            });
            return result;
        } catch (error) {
            console.error('Error adding vendor:', error);
            throw error;
        }
    });

    ipcMain.handle('get-vendors', async (_, { page = 1, perPage = 10 }) => {
        try {
            const [vendors, total] = await Promise.all([
                new Promise((resolve, reject) => {
                    db.vendors
                        .find({})
                        .skip((page - 1) * perPage)
                        .limit(perPage)
                        .exec((err, docs) => {
                            if (err) reject(err);
                            resolve(docs);
                        });
                }),
                new Promise((resolve, reject) => {
                    db.vendors.count({}, (err, count) => {
                        if (err) reject(err);
                        resolve(count);
                    });
                })
            ]);

            return {
                vendors,
                total,
                currentPage: page,
                totalPages: Math.ceil(total / perPage)
            };
        } catch (error) {
            console.error('Error fetching vendors:', error);
            throw error;
        }
    });

    ipcMain.handle('update-vendor', async (_, vendorData) => {
        try {
            await new Promise((resolve, reject) => {
                db.vendors.update(
                    { _id: vendorData._id },
                    { $set: vendorData },
                    {},
                    (err) => {
                        if (err) reject(err);
                        resolve();
                    }
                );
            });
            return { success: true, message: 'Vendor updated successfully' };
        } catch (error) {
            console.error('Error updating vendor:', error);
            throw error;
        }
    });

    ipcMain.handle('delete-vendor', async (_, vendorId) => {
        try {
            await new Promise((resolve, reject) => {
                db.vendors.remove({ _id: vendorId }, {}, (err) => {
                    if (err) reject(err);
                    resolve();
                });
            });
            return { success: true, message: 'Vendor deleted successfully' };
        } catch (error) {
            console.error('Error deleting vendor:', error);
            throw error;
        }
    });
}

module.exports = registerVendorRoutes;