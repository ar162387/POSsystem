const registerUserRoutes = require('./userRoutes');
const registerInventoryRoutes = require('./inventoryRoutes');
const registerFinancialRoutes = require('./financialRoutes');
const registerCustomerRoutes = require('./customerRoutes');
const registerInvoiceRoutes = require('./invoiceRoutes');
const registerVendorRoutes = require('./vendorRoutes');
const registerBrokerRoutes = require('./brokerRoutes');
const registerCommissionerRoutes = require('./commissionerRoutes');
const registerCommissionSheetRoutes = require('./commissionSheetRoutes');

const registerAllRoutes = () => {
    console.log('Starting to register all routes...');

    try {
        console.log('Registering user routes...');
        registerUserRoutes();
        console.log('User routes registered');

        console.log('Registering inventory routes...');
        registerInventoryRoutes();
        console.log('Inventory routes registered');

        console.log('Registering financial routes...');
        registerFinancialRoutes();
        console.log('Financial routes registered');

        console.log('Registering customer routes...');
        registerCustomerRoutes();
        console.log('Customer routes registered');

        console.log('Registering invoice routes...');
        registerInvoiceRoutes();
        console.log('Invoice routes registered');

        console.log('Registering vendor routes...');
        registerVendorRoutes();
        console.log('Vendor routes registered');

        console.log('Registering broker routes...');
        registerBrokerRoutes();
        console.log('Broker routes registered');

        console.log('Registering commissioner routes...');
        registerCommissionerRoutes();
        console.log('Commissioner routes registered');

        console.log('Registering commission sheet routes...');
        registerCommissionSheetRoutes();
        console.log('Commission sheet routes registered');

        console.log('All IPC routes registered successfully');
    } catch (error) {
        console.error('Error registering routes:', error);
        throw error;
    }
};

module.exports = registerAllRoutes;