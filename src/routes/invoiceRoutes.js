const { ipcMain } = require('electron');
const InvoiceController = require('../db/controllers/invoiceController');

const registerInvoiceRoutes = () => {
    console.log('Registering invoice routes...');

    // Helper function to safely register IPC handlers
    const safeHandle = (channel, handler) => {
        try {
            // Remove existing handler if it exists
            ipcMain.removeHandler(channel);
            // Register new handler
            ipcMain.handle(channel, handler);
        } catch (error) {
            console.log(`Note: ${channel} handler updated`);
        }
    };

    // Generate invoice number
    safeHandle('generate-invoice-number', async () => {
        return await InvoiceController.generateInvoiceNumber();
    });

    // Create invoice
    safeHandle('create-invoice', async (event, invoiceData) => {
        return await InvoiceController.createInvoice(invoiceData);
    });

    // Get invoices with pagination
    safeHandle('get-invoices', async (event, options) => {
        return await InvoiceController.getInvoices(options);
    });

    // Get invoice by ID with items
    safeHandle('get-invoice', async (event, invoiceId) => {
        return await InvoiceController.getInvoice(invoiceId);
    });

    // Update invoice payment (customer payment)
    safeHandle('update-invoice-payment', async (event, paymentData) => {
        return await InvoiceController.updateInvoicePayment(paymentData);
    });

    // Update invoice items and costs
    safeHandle('update-invoice-items', async (event, invoiceData) => {
        return await InvoiceController.updateInvoiceItems(invoiceData);
    });

    // Delete an invoice
    ipcMain.handle('delete-invoice', async (_, invoiceId) => {
        try {
            console.log(`Received request to delete invoice: ${invoiceId}`);
            // Use the enhanced delete method that reverts inventory changes
            const result = await InvoiceController.delete(invoiceId);

            if (result) {
                console.log(`Successfully deleted invoice: ${invoiceId}`);
                return { success: true, message: 'Invoice deleted successfully' };
            } else {
                console.error(`Failed to delete invoice: ${invoiceId}`);
                return { success: false, message: 'Failed to delete invoice' };
            }
        } catch (error) {
            console.error('Error in delete-invoice route:', error);
            return { success: false, message: `Error deleting invoice: ${error.message}` };
        }
    });

    // Update broker payment
    safeHandle('update-broker-payment', async (event, paymentData) => {
        return await InvoiceController.updateBrokerPayment(paymentData);
    });

    // Get customer invoices with pagination
    safeHandle('get-customer-invoices', async (event, options) => {
        return await InvoiceController.getCustomerInvoices(options);
    });

    console.log('Invoice routes registered successfully');
    return true;
};

module.exports = registerInvoiceRoutes; 