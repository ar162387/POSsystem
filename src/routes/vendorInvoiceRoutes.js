// vendorInvoiceRoutes.js
const { ipcMain } = require('electron');
const VendorInvoiceController = require('../db/controllers/vendorInvoiceController');

function registerVendorInvoiceRoutes() {
    console.log('Vendor invoice routes registered');

    // 1) GET LAST VENDOR INVOICE NUMBER
    ipcMain.handle('get-last-vendor-invoice-number', async () => {
        try {
            // This depends on your actual method name in the controller or model.
            // If you have a `VendorInvoiceController.getLastInvoiceNumber()`, use that:
            const result = await VendorInvoiceController.getLastInvoiceNumber();
            return result; // should return { lastNumber: someNumber }
        } catch (error) {
            console.error('Error getting last vendor invoice number:', error);
            // Return a default fallback if something goes wrong
            return { lastNumber: 0 };
        }
    });

    // 2) CREATE VENDOR INVOICE
    ipcMain.handle('create-vendor-invoice', async (_, invoiceData) => {
        try {
            const newInvoice = await VendorInvoiceController.createInvoice(invoiceData);
            return newInvoice;
        } catch (error) {
            console.error('Error creating vendor invoice:', error);
            throw error; // Let the front-end catch & display
        }
    });

    // 3) GET VENDOR INVOICES (with pagination)
    ipcMain.handle('get-vendor-invoices', async (event, options) => {
        // If status is pending, we're looking for pending invoices
        if (options && options.status === 'pending') {
            return await VendorInvoiceController.getPendingVendorInvoices(options);
        }
        // Otherwise use the regular get invoices function
        return await VendorInvoiceController.getInvoices(options);
    });

    // 4) GET SINGLE VENDOR INVOICE
    ipcMain.handle('get-vendor-invoice', async (_, invoiceId) => {
        try {
            if (!invoiceId) {
                throw new Error('Invoice ID is required');
            }
            const invoice = await VendorInvoiceController.getInvoice(invoiceId);
            return invoice;
        } catch (error) {
            console.error('Error fetching vendor invoice:', error);
            throw error;
        }
    });

    // 5) UPDATE VENDOR INVOICE PAYMENT
    ipcMain.handle('update-vendor-invoice-payment', async (_, { invoiceId, paidAmount, remainingAmount, status, dueDate }) => {
        try {
            if (!invoiceId) {
                throw new Error('Invoice ID is required');
            }
            const updated = await VendorInvoiceController.updateInvoicePayment({
                invoiceId,
                paidAmount,
                remainingAmount,
                status,
                dueDate
            });
            return updated; // e.g. { success: true } or the updated doc
        } catch (error) {
            console.error('Error updating vendor invoice payment:', error);
            throw error;
        }
    });

    // 6) DELETE VENDOR INVOICE
    ipcMain.handle('delete-vendor-invoice', async (_, invoiceId) => {
        try {
            if (!invoiceId) {
                throw new Error('Invoice ID is required');
            }
            const deleted = await VendorInvoiceController.deleteInvoice(invoiceId);
            return { success: !!deleted, message: deleted ? 'Invoice deleted.' : 'No invoice removed.' };
        } catch (error) {
            console.error('Error deleting vendor invoice:', error);
            throw error;
        }
    });
}

module.exports = registerVendorInvoiceRoutes;
