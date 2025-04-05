const db = require('../db');

const cleanDatabases = async () => {
    try {
        console.log('Starting database cleanup...');

        // List of databases to clean (excluding users)
        const databasesToClean = [
            { name: 'inventory', db: db.inventory },
            { name: 'financial', db: db.financial },
            { name: 'customers', db: db.customers },
            { name: 'invoices', db: db.invoices },
            { name: 'vendors', db: db.vendors },
            { name: 'vendorInvoices', db: db.vendorInvoices },
            { name: 'brokers', db: db.brokers },
            { name: 'commissioners', db: db.commissioners },
            { name: 'commissionSheets', db: db.commissionSheets }
        ];

        // Clean each database
        const cleanupPromises = databasesToClean.map(({ name, db }) => {
            return new Promise((resolve, reject) => {
                db.remove({}, { multi: true }, (err, numRemoved) => {
                    if (err) {
                        console.error(`Error cleaning ${name} database:`, err);
                        reject(err);
                    } else {
                        console.log(`Cleaned ${name} database. Removed ${numRemoved} records.`);
                        resolve(numRemoved);
                    }
                });
            });
        });

        // Wait for all cleanup operations to complete
        await Promise.all(cleanupPromises);

        console.log('Database cleanup completed successfully!');
        console.log('Note: User credentials have been preserved.');

        return {
            success: true,
            message: 'All databases cleaned successfully while preserving user credentials.'
        };
    } catch (error) {
        console.error('Error during database cleanup:', error);
        return {
            success: false,
            message: 'Error cleaning databases: ' + error.message
        };
    }
};

module.exports = cleanDatabases; 