const path = require('path');
const { app } = require('electron');
const Datastore = require('nedb');

console.log('Initializing databases...');

// Initialize databases
const db = {
    users: new Datastore({ filename: path.join(app.getPath('userData'), 'users.db'), autoload: true }),
    inventory: new Datastore({ filename: path.join(app.getPath('userData'), 'inventory.db'), autoload: true }),
    financial: new Datastore({ filename: path.join(app.getPath('userData'), 'financial.db'), autoload: true }),
    customers: new Datastore({ filename: path.join(app.getPath('userData'), 'customers.db'), autoload: true }),
    invoices: new Datastore({ filename: path.join(app.getPath('userData'), 'invoices.db'), autoload: true }),
    vendors: new Datastore({ filename: path.join(app.getPath('userData'), 'vendors.db'), autoload: true }),
    vendorInvoices: new Datastore({ filename: path.join(app.getPath('userData'), 'vendorInvoices.db'), autoload: true }),
    brokers: new Datastore({ filename: path.join(app.getPath('userData'), 'brokers.db'), autoload: true }),
    commissioners: new Datastore({ filename: path.join(app.getPath('userData'), 'commissioners.db'), autoload: true }),
    commissionSheets: new Datastore({ filename: path.join(app.getPath('userData'), 'commissionSheets.db'), autoload: true })
};

console.log('Database files path:', app.getPath('userData'));
console.log('All databases initialized. Creating indexes...');

// Create indexes for faster lookups
db.users.ensureIndex({ fieldName: 'username', unique: true });
db.inventory.ensureIndex({ fieldName: 'itemId', unique: true });
db.customers.ensureIndex({ fieldName: 'name', unique: true });
db.invoices.ensureIndex({ fieldName: 'invoiceNumber', unique: true });
db.vendors.ensureIndex({ fieldName: 'name', unique: true });
db.vendorInvoices.ensureIndex({ fieldName: 'invoiceNumber', unique: true });
db.vendorInvoices.ensureIndex({ fieldName: 'vendorId' });
db.vendorInvoices.ensureIndex({ fieldName: 'createdBy' });
db.brokers.ensureIndex({ fieldName: 'name' });
db.commissioners.ensureIndex({ fieldName: 'name' });
db.commissionSheets.ensureIndex({ fieldName: 'invoiceKey', unique: true });
db.commissionSheets.ensureIndex({ fieldName: 'commissionerId' });

console.log('All database indexes created');

module.exports = db; 