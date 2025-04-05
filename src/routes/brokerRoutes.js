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
            console.log(`Registered handler for: ${channel}`);
        } catch (error) {
            console.log(`Note: ${channel} handler updated`);
        }
    };

    // Get all brokers (with pagination)
    safeHandle('get-brokers', async (_, options = {}) => {
        try {
            return await BrokerController.getBrokers(options);
        } catch (error) {
            console.error('Error in get-brokers route:', error);
            throw error;
        }
    });

    // Create a new broker
    safeHandle('create-broker', async (_, brokerData) => {
        try {
            return await BrokerController.createBroker(brokerData);
        } catch (error) {
            console.error('Error in create-broker route:', error);
            throw error;
        }
    });

    // Update an existing broker
    safeHandle('update-broker', async (_, { brokerId, ...updateData }) => {
        try {
            return await BrokerController.updateBroker(brokerId, updateData);
        } catch (error) {
            console.error('Error in update-broker route:', error);
            throw error;
        }
    });

    // Delete a broker
    safeHandle('delete-broker', async (_, brokerId) => {
        try {
            return await BrokerController.deleteBroker(brokerId);
        } catch (error) {
            console.error('Error in delete-broker route:', error);
            throw error;
        }
    });

    // Get invoices with broker details
    safeHandle('get-broker-invoices', async (_, options = {}) => {
        try {
            return await InvoiceController.getBrokerInvoices(options);
        } catch (error) {
            console.error('Error in get-broker-invoices route:', error);
            throw error;
        }
    });

    // Update a broker payment for a specific invoice
    safeHandle('update-broker-payment', async (_, paymentData) => {
        try {
            return await InvoiceController.updateBrokerPayment(paymentData);
        } catch (error) {
            console.error('Error in update-broker-payment route:', error);
            throw error;
        }
    });

    // New route: Record a cumulative commission payment for a broker
    safeHandle('update-broker-commission-payment', async (_, paymentData) => {
        try {
            const { brokerId, brokerName, paymentAmount, paymentMethod, paymentDate } = paymentData;

            if (!brokerId || !paymentAmount) {
                throw new Error('Broker ID and payment amount are required');
            }

            console.log('Processing broker commission payment:', {
                broker: brokerName,
                amount: paymentAmount,
                method: paymentMethod,
                date: paymentDate
            });

            // Record the payment in the broker's payment history
            const result = await BrokerController.recordCommissionPayment(paymentData);

            return {
                success: true,
                message: `Payment of ${paymentAmount} processed for broker ${brokerName}`,
                result
            };
        } catch (error) {
            console.error('Error in update-broker-commission-payment route:', error);
            return {
                success: false,
                message: error.message
            };
        }
    });

    // New route: Get payment history for a broker
    safeHandle('get-broker-payment-history', async (_, brokerId) => {
        try {
            if (!brokerId) {
                throw new Error('Broker ID is required');
            }

            return await BrokerController.getPaymentHistory(brokerId);
        } catch (error) {
            console.error('Error in get-broker-payment-history route:', error);
            throw error;
        }
    });

    // New route: Get broker commission summary
    safeHandle('get-broker-commission-summary', async (_, brokerId) => {
        try {
            if (!brokerId) {
                throw new Error('Broker ID is required');
            }

            return await BrokerController.getBrokerCommissionSummary(brokerId);
        } catch (error) {
            console.error('Error in get-broker-commission-summary route:', error);
            throw error;
        }
    });

    // New route: Get broker commission summary with detailed invoice info
    safeHandle('get-broker-commission-details', async (_, brokerId) => {
        try {
            if (!brokerId) {
                throw new Error('Broker ID is required');
            }

            // Get the broker
            const broker = await BrokerController.getBrokers({
                query: { _id: brokerId },
                page: 1,
                perPage: 1
            });

            if (!broker || !broker.brokers || !broker.brokers[0]) {
                throw new Error(`Broker with ID ${brokerId} not found`);
            }

            const brokerData = broker.brokers[0];

            // Get all invoices for this broker
            const invoiceData = await InvoiceController.getBrokerInvoices({
                brokerId,
                page: 1,
                perPage: 1000
            });

            // Calculate commission summary
            const summary = await BrokerController.getBrokerCommissionSummary(brokerId);

            return {
                broker: brokerData,
                invoices: invoiceData.invoices || [],
                summary
            };
        } catch (error) {
            console.error('Error in get-broker-commission-details route:', error);
            throw error;
        }
    });

    console.log('Broker routes registered successfully');
    return true;
};

module.exports = registerBrokerRoutes; 