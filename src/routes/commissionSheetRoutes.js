const { ipcMain } = require('electron');
const CommissionSheetController = require('../db/controllers/commissionSheetController');

const registerCommissionSheetRoutes = () => {
    console.log('Registering commission sheet routes...');

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

    // Get commission sheets with pagination
    safeHandle('get-commission-sheets', async (event, options) => {
        // If status is pending, get pending commission sheets count
        if (options && options.status === 'pending') {
            return await CommissionSheetController.getPendingCommissionSheets(options);
        }
        // Otherwise use the regular get commission sheets function
        return await CommissionSheetController.getCommissionSheets(options);
    });

    // Get single commission sheet by ID
    safeHandle('get-commission-sheet', async (event, id) => {
        try {
            return await CommissionSheetController.getCommissionSheet(id);
        } catch (error) {
            console.error('Error in get-commission-sheet route:', error);
            throw error;
        }
    });

    // Create new commission sheet
    safeHandle('create-commission-sheet', async (event, sheetData) => {
        try {
            return await CommissionSheetController.createCommissionSheet(sheetData);
        } catch (error) {
            console.error('Error in create-commission-sheet route:', error);
            throw error;
        }
    });

    // Update commission sheet
    safeHandle('update-commission-sheet', async (event, { id, ...updateData }) => {
        try {
            const updated = await CommissionSheetController.updateCommissionSheet(id, updateData);
            return updated;
        } catch (error) {
            console.error('Error in update-commission-sheet route:', error);
            throw error;
        }
    });

    // Delete commission sheet
    safeHandle('delete-commission-sheet', async (event, id) => {
        try {
            const deleted = await CommissionSheetController.deleteCommissionSheet(id);
            return deleted;
        } catch (error) {
            console.error('Error in delete-commission-sheet route:', error);
            throw error;
        }
    });

    // Generate invoice preview (without saving)
    safeHandle('preview-commission-invoice', async (event, sheetData) => {
        try {
            return await CommissionSheetController.generateInvoicePreview(sheetData);
        } catch (error) {
            console.error('Error in preview-commission-invoice route:', error);
            throw error;
        }
    });

    console.log('Commission sheet routes registered successfully');
    return true;
};

module.exports = registerCommissionSheetRoutes; 