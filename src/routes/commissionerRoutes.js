const { ipcMain } = require('electron');
const CommissionerController = require('../db/controllers/commissionerController');
const CommissionerPaymentController = require('../db/controllers/commissionerPaymentController');

const registerCommissionerRoutes = () => {
    console.log('Registering commissioner routes...');

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

    // Get all commissioners with pagination and search
    safeHandle('get-commissioners', async (event, options) => {
        try {
            return await CommissionerController.getCommissioners(options);
        } catch (error) {
            console.error('Error in get-commissioners route:', error);
            throw error;
        }
    });

    // Get single commissioner by ID
    safeHandle('get-commissioner', async (event, id) => {
        try {
            return await CommissionerController.getCommissioner(id);
        } catch (error) {
            console.error('Error in get-commissioner route:', error);
            throw error;
        }
    });

    // Create new commissioner
    safeHandle('create-commissioner', async (event, commissionerData) => {
        try {
            return await CommissionerController.createCommissioner(commissionerData);
        } catch (error) {
            console.error('Error in create-commissioner route:', error);
            throw error;
        }
    });

    // Update commissioner
    safeHandle('update-commissioner', async (event, { id, ...updateData }) => {
        try {
            const updated = await CommissionerController.updateCommissioner(id, updateData);
            return { success: updated };
        } catch (error) {
            console.error('Error in update-commissioner route:', error);
            throw error;
        }
    });

    // Delete commissioner
    safeHandle('delete-commissioner', async (event, id) => {
        try {
            const deleted = await CommissionerController.deleteCommissioner(id);
            return { success: deleted };
        } catch (error) {
            console.error('Error in delete-commissioner route:', error);
            throw error;
        }
    });

    // Get commissioner payment history
    safeHandle('get-commissioner-payments', async (event, commissionerId) => {
        try {
            return await CommissionerPaymentController.getCommissionerPayments(commissionerId);
        } catch (error) {
            console.error('Error in get-commissioner-payments route:', error);
            throw error;
        }
    });

    // Add a new commissioner payment
    safeHandle('add-commissioner-payment', async (event, paymentData) => {
        try {
            return await CommissionerPaymentController.addPayment(paymentData);
        } catch (error) {
            console.error('Error in add-commissioner-payment route:', error);
            throw error;
        }
    });

    // Update an existing commissioner payment
    safeHandle('update-commissioner-payment', async (event, { id, ...updateData }) => {
        try {
            const updated = await CommissionerPaymentController.updatePayment(id, updateData);
            return { success: updated };
        } catch (error) {
            console.error('Error in update-commissioner-payment route:', error);
            throw error;
        }
    });

    // Delete a commissioner payment
    safeHandle('delete-commissioner-payment', async (event, id) => {
        try {
            const deleted = await CommissionerPaymentController.deletePayment(id);
            return { success: deleted };
        } catch (error) {
            console.error('Error in delete-commissioner-payment route:', error);
            throw error;
        }
    });

    // Get commissioner payment statistics
    safeHandle('get-commissioner-payment-stats', async (event, commissionerId) => {
        try {
            return await CommissionerPaymentController.getPaymentStats(commissionerId);
        } catch (error) {
            console.error('Error in get-commissioner-payment-stats route:', error);
            throw error;
        }
    });

    // Get all commissioner payments
    safeHandle('get-all-commissioner-payments', async (event) => {
        try {
            return await CommissionerPaymentController.getAllCommissionerPayments();
        } catch (error) {
            console.error('Error in get-all-commissioner-payments route:', error);
            throw error;
        }
    });

    console.log('Commissioner routes registered successfully');
    return true;
};

module.exports = registerCommissionerRoutes; 