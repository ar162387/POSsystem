const { ipcMain } = require('electron');
const cleanDatabases = require('../utils/dbCleanup');

const registerUtilityRoutes = () => {
    console.log('Registering utility routes...');

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

    // Route to clean all databases except users
    safeHandle('clean-databases', async () => {
        try {
            console.log('Received request to clean databases');
            const result = await cleanDatabases();
            return result;
        } catch (error) {
            console.error('Error in clean-databases route:', error);
            return {
                success: false,
                message: 'Failed to clean databases: ' + error.message
            };
        }
    });

    console.log('Utility routes registered successfully');
    return true;
};

module.exports = registerUtilityRoutes; 