const { ipcMain } = require('electron');
const CustomerController = require('../db/controllers/customerController');

const registerCustomerRoutes = () => {
    // Add new customer
    ipcMain.handle('add-customer', async (event, customerData) => {
        return await CustomerController.addCustomer(customerData);
    });

    // Get customers with pagination
    ipcMain.handle('get-customers', async (event, options) => {
        return await CustomerController.getCustomers(options);
    });

    // Update customer
    ipcMain.handle('update-customer', async (event, customerData) => {
        return await CustomerController.updateCustomer(customerData);
    });

    // Delete customer
    ipcMain.handle('delete-customer', async (event, customerId) => {
        return await CustomerController.deleteCustomer(customerId);
    });
};

module.exports = registerCustomerRoutes; 