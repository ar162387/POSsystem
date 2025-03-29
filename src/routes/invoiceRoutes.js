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

    // Delete invoice
    safeHandle('delete-invoice', async (event, invoiceId) => {
        return await InvoiceController.deleteInvoice(invoiceId);
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