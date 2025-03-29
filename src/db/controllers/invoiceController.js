const InvoiceModel = require('../models/invoiceModel');

const InvoiceController = {
    generateInvoiceNumber: async () => {
        try {
            return await InvoiceModel.generateInvoiceNumber();
        } catch (error) {
            throw error;
        }
    },

    createInvoice: async (invoiceData) => {
        try {
            const { items, ...invoiceDetails } = invoiceData;

            // Process items to ensure quantity is float and prices are integers
            const processedItems = items.map(item => ({
                ...item,
                quantity: parseFloat(item.quantity || 0),
                netWeight: parseFloat(item.netWeight || 0),
                sellingPrice: Math.round(parseFloat(item.sellingPrice || 0)),
                packagingCost: Math.round(parseFloat(item.packagingCost || 0)),
                total: Math.round(parseFloat(item.total || 0))
            }));

            // Process invoice details to ensure all price fields are integers
            const processedInvoiceDetails = {
                ...invoiceDetails,
                totalAmount: Math.round(parseFloat(invoiceDetails.totalAmount || 0)),
                paidAmount: Math.round(parseFloat(invoiceDetails.paidAmount || 0)),
                remainingAmount: Math.round(parseFloat(invoiceDetails.remainingAmount || 0)),
                laborTransportCost: Math.round(parseFloat(invoiceDetails.laborTransportCost || 0)),
                commissionAmount: Math.round(parseFloat(invoiceDetails.commissionAmount || 0))
            };

            // Start a transaction-like operation
            // 1. Create the invoice
            const newInvoice = await InvoiceModel.create({
                items: processedItems,
                ...processedInvoiceDetails
            });

            // 2. Update inventory for each item
            await InvoiceModel.updateInventoryForInvoice(processedItems);

            return newInvoice;
        } catch (error) {
            throw error;
        }
    },

    getInvoices: async (options) => {
        try {
            const { page = 1, perPage = 10, filter = '', customerId = null, brokerId = null } = options;
            const skip = (page - 1) * perPage;

            let query = {};

            // Filter by customer if provided
            if (customerId) {
                query.customerId = customerId;
            }

            // Filter by broker if provided
            if (brokerId) {
                query.brokerId = brokerId;
            }

            // Apply additional filter if provided
            if (filter && filter.trim() !== '') {
                query = {
                    ...query,
                    $or: [
                        { invoiceNumber: new RegExp(filter, 'i') },
                        { customerName: new RegExp(filter, 'i') },
                        { brokerName: new RegExp(filter, 'i') }
                    ]
                };
            }

            // Get total count for pagination
            const count = await InvoiceModel.count(query);

            // Get paginated invoices
            const invoices = await InvoiceModel.findAll(query, {
                skip,
                limit: perPage,
                sort: { createdAt: -1 }
            });

            // Process invoices to include detailed item information
            const invoicesWithItems = await Promise.all(
                invoices.map(invoice => InvoiceModel.getInvoiceWithItemDetails(invoice))
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
            const invoice = await InvoiceModel.findOne({ _id: invoiceId });

            if (!invoice) {
                throw new Error('Invoice not found');
            }

            // Get invoice with detailed item information
            return await InvoiceModel.getInvoiceWithItemDetails(invoice);
        } catch (error) {
            throw error;
        }
    },

    updateInvoicePayment: async (paymentData) => {
        try {
            const { invoiceId, paidAmount, totalAmount } = paymentData;

            // First get the current invoice
            const invoice = await InvoiceModel.findOne({ _id: invoiceId });
            if (!invoice) {
                throw new Error('Invoice not found');
            }

            // Convert payment amounts to integers
            const processedPaymentData = {
                paidAmount: Math.round(parseFloat(paidAmount || 0)),
                totalAmount: totalAmount ? Math.round(parseFloat(totalAmount)) : Math.round(parseFloat(invoice.totalAmount || 0))
            };

            // Update only customer payment fields
            return await InvoiceModel.updateCustomerPayment(invoiceId, processedPaymentData);
        } catch (error) {
            throw error;
        }
    },

    updateBrokerPayment: async (paymentData) => {
        try {
            const { invoiceId, brokerPaidAmount, brokerPaymentDate, commissionAmount } = paymentData;

            // First get the current invoice to calculate proper remaining amount
            const invoice = await InvoiceModel.findOne({ _id: invoiceId });
            if (!invoice) {
                throw new Error('Invoice not found');
            }

            // Convert payment amounts to integers
            const processedPaymentData = {
                brokerPaidAmount: Math.round(parseFloat(brokerPaidAmount || 0)),
                brokerPaymentDate,
                commissionAmount: commissionAmount ?
                    Math.round(parseFloat(commissionAmount)) :
                    Math.round(parseFloat(invoice.commissionAmount || 0))
            };

            // Update only broker payment fields
            return await InvoiceModel.updateBrokerPayment(invoiceId, processedPaymentData);
        } catch (error) {
            throw error;
        }
    },

    getBrokerInvoices: async (options) => {
        try {
            const { page = 1, perPage = 10, filter = '', brokerId = null } = options;
            const skip = (page - 1) * perPage;

            let query = { brokerId: { $ne: null } }; // Only get invoices with brokers

            // Filter by specific broker if provided
            if (brokerId) {
                query.brokerId = brokerId;
            }

            // Apply additional filter if provided
            if (filter && filter.trim() !== '') {
                query = {
                    ...query,
                    $or: [
                        { invoiceNumber: new RegExp(filter, 'i') },
                        { customerName: new RegExp(filter, 'i') },
                        { brokerName: new RegExp(filter, 'i') }
                    ]
                };
            }

            // Get total count for pagination
            const count = await InvoiceModel.count(query);

            // Get paginated invoices
            const invoices = await InvoiceModel.findAll(query, {
                skip,
                limit: perPage,
                sort: { createdAt: -1 }
            });

            // Process invoices to include detailed item information
            const invoicesWithItems = await Promise.all(
                invoices.map(invoice => InvoiceModel.getInvoiceWithItemDetails(invoice))
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

    deleteInvoice: async (invoiceId) => {
        try {
            return await InvoiceModel.delete(invoiceId);
        } catch (error) {
            throw error;
        }
    },

    getCustomerInvoices: async (options = {}) => {
        try {
            const { page = 1, perPage = 10, filter = '', status = null } = options;
            const skip = (page - 1) * perPage;

            let query = {};

            // Filter by status if provided
            if (status === 'pending') {
                // Find invoices where remaining amount is greater than 0
                // Using a simpler query without $expr
                query = {
                    totalAmount: { $gt: 0 },     // Has a total amount
                    $or: [
                        { paidAmount: { $exists: false } },  // No payment recorded
                        { paidAmount: { $lt: 1 } }           // No payment or partial payment
                    ]
                };
            }

            // Apply additional filter if provided
            if (filter && filter.trim() !== '') {
                query = {
                    ...query,
                    $or: [
                        { invoiceNumber: new RegExp(filter, 'i') },
                        { customerName: new RegExp(filter, 'i') }
                    ]
                };
            }

            // Get total count for pagination
            const count = await InvoiceModel.count(query);

            // Get paginated invoices
            const invoices = await InvoiceModel.findAll(query, {
                skip,
                limit: perPage,
                sort: { createdAt: -1 }
            });

            // Process invoices to include detailed item information
            const invoicesWithItems = await Promise.all(
                invoices.map(invoice => InvoiceModel.getInvoiceWithItemDetails(invoice))
            );

            return {
                invoices: invoicesWithItems,
                total: count,
                page,
                totalPages: Math.ceil(count / perPage)
            };
        } catch (error) {
            console.error('Error getting customer invoices:', error);
            throw error;
        }
    }
};

module.exports = InvoiceController; 