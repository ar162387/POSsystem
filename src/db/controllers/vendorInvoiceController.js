const VendorInvoiceModel = require('../models/vendorInvoiceModel');

const VendorInvoiceController = {
    generateInvoiceNumber: async () => {
        try {
            return await VendorInvoiceModel.generateInvoiceNumber();
        } catch (error) {
            throw error;
        }
    },

    createInvoice: async (invoiceData) => {
        try {
            const { items, ...invoiceDetails } = invoiceData;

            // Start a transaction-like operation
            // 1. Create the invoice
            const newInvoice = await VendorInvoiceModel.create({
                items,
                ...invoiceDetails
            });

            // 2. Update inventory for each item (incrementing)
            await VendorInvoiceModel.updateInventoryForInvoice(items);

            return newInvoice;
        } catch (error) {
            throw error;
        }
    },

    getInvoices: async (options) => {
        try {
            const { page = 1, perPage = 10, filter = '', vendorId = null } = options;
            const skip = (page - 1) * perPage;

            let query = {};

            // Filter by vendor if provided
            if (vendorId) {
                query.vendorId = vendorId;
            }

            // Apply additional filter if provided
            if (filter && filter.trim() !== '') {
                query = {
                    ...query,
                    $or: [
                        { invoiceNumber: new RegExp(filter, 'i') },
                        { vendorName: new RegExp(filter, 'i') }
                    ]
                };
            }

            // Get total count for pagination
            const count = await VendorInvoiceModel.count(query);

            // Get paginated invoices
            const invoices = await VendorInvoiceModel.findAll(query, {
                skip,
                limit: perPage,
                sort: { createdAt: -1 }
            });

            // Process invoices to include detailed item information
            const invoicesWithItems = await Promise.all(
                invoices.map(invoice => VendorInvoiceModel.getInvoiceWithItemDetails(invoice))
            );

            return {
                invoices: invoicesWithItems,
                total: count,
                page,
                totalPages: Math.ceil(count / perPage)
            };
        } catch (error) {
            throw error;
        }
    },

    getInvoice: async (invoiceId) => {
        try {
            const invoice = await VendorInvoiceModel.findOne({ _id: invoiceId });

            if (!invoice) {
                throw new Error('Invoice not found');
            }

            // Get invoice with detailed item information
            return await VendorInvoiceModel.getInvoiceWithItemDetails(invoice);
        } catch (error) {
            throw error;
        }
    },

    updateInvoicePayment: async (paymentData) => {
        try {
            const { invoiceId, paidAmount, remainingAmount, status, dueDate } = paymentData;

            return await VendorInvoiceModel.update(invoiceId, {
                paidAmount,
                remainingAmount,
                status,
                dueDate,
                updatedAt: new Date()
            });
        } catch (error) {
            throw error;
        }
    },

    deleteInvoice: async (invoiceId) => {
        try {
            return await VendorInvoiceModel.delete(invoiceId);
        } catch (error) {
            throw error;
        }
    },

    // Preview inventory changes before creating the invoice
    previewInventoryChanges: async (items) => {
        try {
            return await VendorInvoiceModel.getInventoryChangePreview(items);
        } catch (error) {
            throw error;
        }
    },

    getPendingVendorInvoices: async (options = {}) => {
        try {
            const { status = 'pending' } = options;

            // Define the query for pending invoices
            let query = {};

            if (status === 'pending') {
                // Get all invoices that are not fully paid
                query = {
                    $or: [
                        { status: 'pending' },
                        { status: 'partially paid' }
                    ]
                };
            }

            // Count the invoices
            const count = await VendorInvoiceModel.count(query);

            return {
                total: count
            };
        } catch (error) {
            console.error('Error getting pending vendor invoices:', error);
            throw error;
        }
    }
};

module.exports = VendorInvoiceController; 