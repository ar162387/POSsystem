const { ipcMain } = require('electron');
const CommissionerController = require('../db/controllers/commissionerController');

const registerCommissionerRoutes = () => {
    // Get all commissioners with pagination and search
    ipcMain.handle('get-commissioners', async (event, options) => {
        try {
            return await CommissionerController.getCommissioners(options);
        } catch (error) {
            console.error('Error in get-commissioners route:', error);
            throw error;
        }
    });

    // Get single commissioner by ID
    ipcMain.handle('get-commissioner', async (event, id) => {
        try {
            return await CommissionerController.getCommissioner(id);
        } catch (error) {
            console.error('Error in get-commissioner route:', error);
            throw error;
        }
    });

    // Create new commissioner
    ipcMain.handle('create-commissioner', async (event, commissionerData) => {
        try {
            return await CommissionerController.createCommissioner(commissionerData);
        } catch (error) {
            console.error('Error in create-commissioner route:', error);
            throw error;
        }
    });

    // Update commissioner
    ipcMain.handle('update-commissioner', async (event, { id, ...updateData }) => {
        try {
            const updated = await CommissionerController.updateCommissioner(id, updateData);
            return { success: updated };
        } catch (error) {
            console.error('Error in update-commissioner route:', error);
            throw error;
        }
    });

    // Delete commissioner
    ipcMain.handle('delete-commissioner', async (event, id) => {
        try {
            const deleted = await CommissionerController.deleteCommissioner(id);
            return { success: deleted };
        } catch (error) {
            console.error('Error in delete-commissioner route:', error);
            throw error;
        }
    });
};

module.exports = registerCommissionerRoutes; 