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
            const { invoiceId, payment, paidAmount, dueDate } = paymentData;

            // First get the current invoice
            const invoice = await InvoiceModel.findOne({ _id: invoiceId });
            if (!invoice) {
                throw new Error('Invoice not found');
            }

            // Calculate values based on paid amount
            const totalAmount = parseFloat(invoice.totalAmount || 0);
            const newPaidAmount = parseFloat(paidAmount || 0);
            const newRemainingAmount = Math.max(0, totalAmount - newPaidAmount);

            // Determine payment status using universal logic
            const newPaymentStatus = InvoiceController.calculatePaymentStatus(totalAmount, newRemainingAmount);

            // Prepare payment data including new payment history entry
            const processedPaymentData = {
                paidAmount: newPaidAmount,
                remainingAmount: newRemainingAmount,
                paymentStatus: newPaymentStatus,
                dueDate: dueDate || invoice.dueDate,
                payment: payment || null // This contains amount, method, date for payment history
            };

            console.log('Processing payment with history:', {
                invoiceNumber: invoice.invoiceNumber,
                currentPaid: invoice.paidAmount,
                newPaid: processedPaymentData.paidAmount,
                newStatus: processedPaymentData.paymentStatus,
                payment: processedPaymentData.payment
            });

            // Update customer payment with payment history
            return await InvoiceModel.updateCustomerPayment(invoiceId, processedPaymentData);
        } catch (error) {
            console.error('Error in updateInvoicePayment:', error);
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

    delete: async (invoiceId) => {
        try {
            // First get the invoice to be deleted
            const invoice = await InvoiceModel.findOne({ _id: invoiceId });
            if (!invoice) {
                throw new Error('Invoice not found');
            }

            console.log(`Preparing to delete invoice #${invoice.invoiceNumber}`);

            // Revert inventory changes - return all items back to inventory
            await revertInventoryChanges(invoice);

            // Delete payment history if any
            if (invoice.paymentHistory && invoice.paymentHistory.length > 0) {
                console.log(`Deleting ${invoice.paymentHistory.length} payment records`);
                // No need to do anything if using embedded payment history
                // If using separate collection, you would delete them here
            }

            // Delete broker commission record if exists
            if (invoice.brokerId) {
                try {
                    console.log(`Removing broker commission for broker ID: ${invoice.brokerId}`);
                    await ipcMain.invoke('delete-broker-commission', {
                        brokerId: invoice.brokerId,
                        invoiceId: invoice._id
                    });
                } catch (brokerErr) {
                    console.error('Error deleting broker commission:', brokerErr);
                    // Continue with invoice deletion even if broker commission deletion fails
                }
            }

            // Delete the invoice
            return await InvoiceModel.delete(invoiceId);
        } catch (error) {
            console.error('Error deleting invoice:', error);
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
    },

    // Helper function to calculate payment status using universal logic
    calculatePaymentStatus: (totalAmount, remainingAmount) => {
        // Unpaid: remainingAmount === totalAmount
        if (remainingAmount === totalAmount) {
            return 'unpaid';
        }
        // Partially Paid: remainingAmount < totalAmount && remainingAmount > 0
        else if (remainingAmount < totalAmount && remainingAmount > 0) {
            return 'partially_paid';
        }
        // Paid: remainingAmount === 0
        else if (remainingAmount === 0) {
            return 'paid';
        }
        // Fallback (shouldn't happen with correct math)
        return 'unpaid';
    },

    // Update invoice items and costs
    updateInvoiceItems: async (invoiceData) => {
        try {
            const {
                invoiceId,
                items,
                originalItems,
                subtotal,
                laborTransportCost,
                commissionAmount,
                commissionPercentage,
                brokerName
            } = invoiceData;

            // First get the current invoice
            const invoice = await InvoiceModel.findOne({ _id: invoiceId });
            if (!invoice) {
                throw new Error('Invoice not found');
            }

            // Process items to ensure proper data types
            const processedItems = items.map(item => ({
                ...item,
                quantity: parseFloat(item.quantity || 0),
                netWeight: parseFloat(item.netWeight || 0),
                grossWeight: parseFloat(item.grossWeight || 0),
                sellingPrice: parseFloat(item.sellingPrice || 0),
                packagingCost: parseFloat(item.packagingCost || 0)
            }));

            // Process original items for comparison
            const processedOriginalItems = originalItems
                ? originalItems.map(item => ({
                    ...item,
                    quantity: parseFloat(item.quantity || 0),
                    netWeight: parseFloat(item.netWeight || 0),
                    grossWeight: parseFloat(item.grossWeight || 0)
                }))
                : invoice.items;

            // Handle inventory adjustments based on what changed
            await adjustInventoryForItemChanges(processedItems, processedOriginalItems);

            // Calculate new total amount
            const newSubtotal = parseFloat(subtotal || 0);
            const newLaborTransportCost = parseFloat(laborTransportCost || 0);
            const newTotalAmount = newSubtotal + newLaborTransportCost;

            // Keep the existing paid amount
            const paidAmount = parseFloat(invoice.paidAmount || 0);

            // Calculate new remaining amount
            const newRemainingAmount = Math.max(0, newTotalAmount - paidAmount);

            // Determine payment status
            const newPaymentStatus = newRemainingAmount <= 0
                ? 'paid'
                : (paidAmount > 0 ? 'partially_paid' : 'not paid');

            // Handle broker commission updates
            const newCommissionPercentage = parseFloat(commissionPercentage || invoice.commissionPercentage || 0);
            const newCommissionAmount = Math.round(parseFloat(commissionAmount) ||
                InvoiceModel.calculateBrokerCommission(newTotalAmount, newCommissionPercentage));

            console.log('Updating invoice with commission data:', {
                invoiceId,
                broker: invoice.brokerName || brokerName,
                brokerId: invoice.brokerId,
                oldCommission: invoice.commissionAmount,
                newCommission: newCommissionAmount,
                commissionPercentage: newCommissionPercentage
            });

            // If there's a broker associated with this invoice and the commission amount changed
            if (invoice.brokerId && invoice.commissionAmount !== newCommissionAmount) {
                console.log(`Commission amount changed for broker ${invoice.brokerName}: ${invoice.commissionAmount} → ${newCommissionAmount}`);

                try {
                    // Get BrokerController to update commission summaries
                    const BrokerController = require('./brokerController');

                    // Request an update of the broker's commission summary
                    await BrokerController.updateBrokerCommissionInfo(invoice.brokerId);
                } catch (brokerUpdateError) {
                    console.error('Error updating broker commission info:', brokerUpdateError);
                    // Continue with invoice update even if broker update fails
                }
            }

            // Update invoice data
            return await InvoiceModel.update(invoiceId, {
                items: processedItems,
                subtotal: newSubtotal,
                laborTransportCost: newLaborTransportCost,
                totalAmount: newTotalAmount,
                paymentStatus: newPaymentStatus,
                remainingAmount: newRemainingAmount,
                commissionAmount: newCommissionAmount,
                commissionPercentage: newCommissionPercentage,
                updatedAt: new Date()
            });
        } catch (error) {
            console.error('Error updating invoice items:', error);
            throw error;
        }
    }
};

// Helper function to adjust inventory based on invoice item changes
async function adjustInventoryForItemChanges(newItems, originalItems) {
    const InventoryModel = require('../models/inventoryModel');

    try {
        console.log('Adjusting inventory for item changes');

        // Track items that were removed completely
        const removedItems = originalItems.filter(original =>
            !newItems.some(newItem => newItem.itemId === original.itemId)
        );

        // Return removed items to inventory (add back)
        for (const item of removedItems) {
            console.log(`Item ${item.itemId} (${item.name}) was removed from invoice, returning to inventory`);

            // Get current inventory item
            const inventoryItem = await InventoryModel.findOne({ itemId: item.itemId });
            if (!inventoryItem) {
                console.warn(`Inventory item ${item.itemId} not found for adjustment`);
                continue;
            }

            // Calculate new values
            const newQuantity = inventoryItem.quantity + item.quantity;
            const newNetWeight = inventoryItem.netWeight + item.netWeight;
            const newGrossWeight = inventoryItem.grossWeight + (item.grossWeight || 0);

            // Update inventory
            await InventoryModel.update(inventoryItem._id, {
                quantity: newQuantity,
                netWeight: newNetWeight,
                grossWeight: newGrossWeight
            });

            console.log(`Updated inventory for ${item.itemId}: quantity ${inventoryItem.quantity} -> ${newQuantity}`);
        }

        // Process modified items
        for (const newItem of newItems) {
            // Find matching original item
            const originalItem = originalItems.find(item => item.itemId === newItem.itemId);

            // If no original item, this is a new addition - should be handled elsewhere
            if (!originalItem) {
                console.warn(`Item ${newItem.itemId} wasn't in original invoice - skipping inventory adjustment`);
                continue;
            }

            // Calculate deltas (positive means more was used, negative means some was returned)
            const quantityDelta = newItem.quantity - originalItem.quantity;
            const netWeightDelta = newItem.netWeight - originalItem.netWeight;
            const grossWeightDelta = (newItem.grossWeight || 0) - (originalItem.grossWeight || 0);

            // Skip if nothing changed
            if (quantityDelta === 0 && netWeightDelta === 0 && grossWeightDelta === 0) {
                continue;
            }

            console.log(`Item ${newItem.itemId} (${newItem.name}) changed:`, {
                quantityDelta,
                netWeightDelta,
                grossWeightDelta
            });

            // Get current inventory item
            const inventoryItem = await InventoryModel.findOne({ itemId: newItem.itemId });
            if (!inventoryItem) {
                console.warn(`Inventory item ${newItem.itemId} not found for adjustment`);
                continue;
            }

            // Update inventory (subtract deltas - if delta is negative, this will add to inventory)
            const newQuantity = Math.max(0, inventoryItem.quantity - quantityDelta);
            const newNetWeight = Math.max(0, inventoryItem.netWeight - netWeightDelta);
            const newGrossWeight = Math.max(0, inventoryItem.grossWeight - grossWeightDelta);

            await InventoryModel.update(inventoryItem._id, {
                quantity: newQuantity,
                netWeight: newNetWeight,
                grossWeight: newGrossWeight
            });

            console.log(`Updated inventory for ${newItem.itemId}:`, {
                quantity: `${inventoryItem.quantity} -> ${newQuantity}`,
                netWeight: `${inventoryItem.netWeight} -> ${newNetWeight}`,
                grossWeight: `${inventoryItem.grossWeight} -> ${newGrossWeight}`
            });
        }

    } catch (error) {
        console.error('Error adjusting inventory:', error);
        throw error;
    }
}

// Helper function to revert inventory changes when deleting a customer invoice
async function revertInventoryChanges(invoice) {
    const InventoryModel = require('../models/inventoryModel');

    try {
        console.log(`Reverting inventory changes for invoice #${invoice.invoiceNumber}`);

        // For each item in the invoice, add it back to inventory
        for (const item of invoice.items) {
            console.log(`Returning item ${item.itemId} (${item.name}) to inventory`);

            // Get current inventory item
            const inventoryItem = await InventoryModel.findOne({ itemId: item.itemId });
            if (!inventoryItem) {
                console.warn(`Inventory item ${item.itemId} not found for reversal`);
                continue;
            }

            // Calculate new values - add back the quantities that were used
            const newQuantity = inventoryItem.quantity + (item.quantity || 0);
            const newNetWeight = inventoryItem.netWeight + (item.netWeight || 0);
            const newGrossWeight = inventoryItem.grossWeight + (item.grossWeight || 0);

            // Update inventory
            await InventoryModel.update(inventoryItem._id, {
                quantity: newQuantity,
                netWeight: newNetWeight,
                grossWeight: newGrossWeight
            });

            console.log(`Reverted inventory for ${item.itemId}:`, {
                quantity: `${inventoryItem.quantity} -> ${newQuantity}`,
                netWeight: `${inventoryItem.netWeight} -> ${newNetWeight}`,
                grossWeight: `${inventoryItem.grossWeight} -> ${newGrossWeight}`
            });
        }
    } catch (error) {
        console.error('Error reverting inventory changes:', error);
        throw error;
    }
}

module.exports = InvoiceController; 