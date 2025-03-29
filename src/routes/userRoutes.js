const { ipcMain } = require('electron');
const UserController = require('../db/controllers/userController');

const registerUserRoutes = () => {
    // Check if admin exists
    ipcMain.handle('check-admin-exists', async () => {
        return await UserController.checkAdminExists();
    });

    // Create a user
    ipcMain.handle('create-user', async (event, userData) => {
        return await UserController.createUser(userData);
    });

    // Login user
    ipcMain.handle('login', async (event, credentials) => {
        return await UserController.login(credentials);
    });

    // Verify user is valid
    ipcMain.handle('verify-user', async (event, userData) => {
        return await UserController.verifyUser(userData);
    });

    // Change password
    ipcMain.handle('change-password', async (event, data) => {
        return await UserController.changePassword(data);
    });

    // Get all users (admin only)
    ipcMain.handle('get-users', async () => {
        return await UserController.getUsers();
    });

    // Update user (admin only)
    ipcMain.handle('update-user', async (event, userData) => {
        return await UserController.updateUser(userData);
    });

    // Delete user (admin only)
    ipcMain.handle('delete-user', async (event, userId) => {
        return await UserController.deleteUser(userId);
    });

    // Get permission templates (admin only)
    ipcMain.handle('get-permission-templates', async () => {
        return UserController.getPermissionTemplates();
    });

    // Update user permissions (admin only)
    ipcMain.handle('update-user-permissions', async (event, data) => {
        const { userId, permissions } = data;
        return await UserController.updateUserPermissions(userId, permissions);
    });
};

module.exports = registerUserRoutes; 