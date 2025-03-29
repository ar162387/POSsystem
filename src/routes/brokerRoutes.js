const { ipcMain } = require('electron');
const BrokerController = require('../db/controllers/brokerController');
const InvoiceController = require('../db/controllers/invoiceController');

const registerBrokerRoutes = () => {
    console.log('Registering broker routes...');

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

    // Get brokers with pagination and filtering
    safeHandle('get-brokers', async (event, options) => {
        return await BrokerController.getBrokers(options);
    });

    // Add new broker
    safeHandle('add-broker', async (event, brokerData) => {
        return await BrokerController.addBroker(brokerData);
    });

    // Update broker
    safeHandle('update-broker', async (event, brokerData) => {
        return await BrokerController.updateBroker(brokerData);
    });

    // Delete broker
    safeHandle('delete-broker', async (event, brokerId) => {
        return await BrokerController.deleteBroker(brokerId);
    });

    // Get broker invoices
    safeHandle('get-broker-invoices', async (event, options) => {
        // If status is pending, we're looking for payments
        if (options && options.status === 'pending') {
            return await BrokerController.getPendingBrokerPayments(options);
        }
        // Otherwise use the regular broker invoices function
        return await InvoiceController.getBrokerInvoices(options);
    });

    // Update broker payment
    safeHandle('update-broker-payment', async (event, paymentData) => {
        return await InvoiceController.updateBrokerPayment(paymentData);
    });

    console.log('Broker routes registered successfully');
    return true;
};

module.exports = registerBrokerRoutes; 