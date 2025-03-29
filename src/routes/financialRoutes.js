const { ipcMain } = require('electron');
const FinancialController = require('../db/controllers/financialController');
const InvoiceModel = require('../db/models/invoiceModel');
const VendorInvoiceModel = require('../db/models/vendorInvoiceModel');

const registerFinancialRoutes = () => {
    console.log('Registering financial routes...');

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

    // Add or update financial details
    safeHandle('add-update-financial', async (event, financialData) => {
        return await FinancialController.addUpdateFinancial(financialData);
    });

    // Get financial details with pagination
    safeHandle('get-financial', async (event, options) => {
        return await FinancialController.getFinancial(options);
    });

    // Delete financial details
    safeHandle('delete-financial', async (event, id) => {
        return await FinancialController.deleteFinancial(id);
    });

    // Get profit and loss data by date range
    safeHandle('get-profit-loss', async (event, { startDate, endDate }) => {
        try {
            console.log(`Calculating profit and loss from ${startDate} to ${endDate}`);

            // Start with empty query
            let customerQuery = {};
            let vendorQuery = {};

            // Add date filters if provided
            if (startDate || endDate) {
                customerQuery.invoiceDate = {};
                vendorQuery.invoiceDate = {};

                if (startDate) {
                    customerQuery.invoiceDate.$gte = new Date(startDate);
                    vendorQuery.invoiceDate.$gte = new Date(startDate);
                }

                if (endDate) {
                    // Add one day to include the end date fully
                    const nextDay = new Date(endDate);
                    nextDay.setDate(nextDay.getDate() + 1);

                    customerQuery.invoiceDate.$lt = nextDay;
                    vendorQuery.invoiceDate.$lt = nextDay;
                }
            }

            console.log('Customer invoice query:', JSON.stringify(customerQuery));
            console.log('Vendor invoice query:', JSON.stringify(vendorQuery));

            // Get customer invoices for the period (sales)
            const customerInvoices = await InvoiceModel.findAll(customerQuery);
            console.log(`Found ${customerInvoices.length} customer invoices`);

            // Get vendor invoices for the period (direct costs)
            const vendorInvoices = await VendorInvoiceModel.findAll(vendorQuery);
            console.log(`Found ${vendorInvoices.length} vendor invoices`);

            // Calculate total sales
            const totalSales = customerInvoices.reduce((sum, invoice) => {
                return sum + parseFloat(invoice.totalAmount || 0);
            }, 0);

            // Calculate total direct costs
            const totalDirectCosts = vendorInvoices.reduce((sum, invoice) => {
                return sum + parseFloat(invoice.totalAmount || 0);
            }, 0);

            // Calculate broker commissions
            const brokerCommissions = customerInvoices.reduce((sum, invoice) => {
                return sum + parseFloat(invoice.commissionAmount || 0);
            }, 0);

            // Calculate gross profit
            const grossProfit = totalSales - totalDirectCosts;

            // Estimate overhead costs (10% of gross profit)
            const totalOverheads = grossProfit * 0.1;

            // Calculate net profit
            const netProfit = grossProfit - totalOverheads - brokerCommissions;

            const result = {
                totalSales,
                totalDirectCosts,
                grossProfit,
                brokerCommissions,
                totalOverheads,
                netProfit,
                period: {
                    startDate,
                    endDate
                }
            };

            console.log('Profit and loss calculation result:', JSON.stringify(result));
            return result;
        } catch (error) {
            console.error('Error calculating profit and loss:', error);
            throw error;
        }
    });

    console.log('Financial routes registered successfully');
    return true;
};

module.exports = registerFinancialRoutes; 