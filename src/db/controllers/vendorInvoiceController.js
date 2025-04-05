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
            const { invoiceId, paidAmount, dueDate, payment } = paymentData;

            // First get the current invoice
            const invoice = await VendorInvoiceModel.findOne({ _id: invoiceId });
            if (!invoice) {
                throw new Error('Vendor invoice not found');
            }

            // Calculate values based on paid amount
            const totalAmount = parseFloat(invoice.totalAmount || 0);
            const newPaidAmount = parseFloat(paidAmount || 0);
            const newRemainingAmount = Math.max(0, totalAmount - newPaidAmount);

            // Determine payment status using universal logic
            const newPaymentStatus = VendorInvoiceController.calculatePaymentStatus(totalAmount, newRemainingAmount);

            // Prepare updated data
            const updateData = {
                paidAmount: newPaidAmount,
                remainingAmount: newRemainingAmount,
                paymentStatus: newPaymentStatus,
                dueDate: dueDate || invoice.dueDate
            };

            // Add payment to history if it exists
            if (payment && payment.amount) {
                const paymentHistory = invoice.paymentHistory || [];
                paymentHistory.push({
                    amount: parseFloat(payment.amount),
                    method: payment.method,
                    date: payment.date || new Date().toISOString()
                });
                updateData.paymentHistory = paymentHistory;
            }

            console.log('Processing vendor payment:', {
                invoiceNumber: invoice.invoiceNumber,
                currentPaid: invoice.paidAmount,
                newPaid: updateData.paidAmount,
                newStatus: updateData.paymentStatus,
                hasPaymentHistory: !!payment
            });

            // Update invoice with payment data
            return await VendorInvoiceModel.update(invoiceId, updateData);
        } catch (error) {
            console.error('Error updating vendor invoice payment:', error);
            throw error;
        }
    },

    delete: async (invoiceId) => {
        try {
            // First get the invoice to be deleted
            const invoice = await VendorInvoiceModel.findOne({ _id: invoiceId });
            if (!invoice) {
                throw new Error('Vendor invoice not found');
            }

            console.log(`Preparing to delete vendor invoice #${invoice.invoiceNumber}`);

            // Revert inventory changes - remove items that were added from vendor
            await revertVendorInventoryChanges(invoice);

            // Delete payment history if any
            if (invoice.paymentHistory && invoice.paymentHistory.length > 0) {
                console.log(`Deleting ${invoice.paymentHistory.length} payment records for vendor invoice`);
                // No need to do anything if using embedded payment history
                // If using separate collection, you would delete them here
            }

            // Delete the invoice
            return await VendorInvoiceModel.delete(invoiceId);
        } catch (error) {
            console.error('Error deleting vendor invoice:', error);
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
                labourTransportCost
            } = invoiceData;

            // First get the current invoice
            const invoice = await VendorInvoiceModel.findOne({ _id: invoiceId });
            if (!invoice) {
                throw new Error('Vendor invoice not found');
            }

            // Process items to ensure proper data types
            const processedItems = items.map(item => ({
                ...item,
                quantity: parseFloat(item.quantity || 0),
                netWeight: parseFloat(item.netWeight || 0),
                grossWeight: parseFloat(item.grossWeight || 0),
                purchasePrice: parseFloat(item.purchasePrice || 0),
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
            await adjustInventoryForVendorItemChanges(processedItems, processedOriginalItems);

            // Calculate new total amount
            const newSubtotal = parseFloat(subtotal || 0);
            const newLabourTransportCost = parseFloat(labourTransportCost || 0);
            const newTotalAmount = newSubtotal + newLabourTransportCost;

            // Keep the existing paid amount
            const paidAmount = parseFloat(invoice.paidAmount || 0);

            // Calculate remaining amount
            const newRemainingAmount = Math.max(0, newTotalAmount - paidAmount);

            // Determine payment status using universal logic
            const newPaymentStatus = VendorInvoiceController.calculatePaymentStatus(newTotalAmount, newRemainingAmount);

            console.log('Updating vendor invoice with recalculated values:', {
                invoiceNumber: invoice.invoiceNumber,
                totalAmount: newTotalAmount,
                paidAmount,
                remainingAmount: newRemainingAmount,
                status: newPaymentStatus
            });

            // Update invoice data
            return await VendorInvoiceModel.update(invoiceId, {
                items: processedItems,
                subtotal: newSubtotal,
                labourTransportCost: newLabourTransportCost,
                totalAmount: newTotalAmount,
                paymentStatus: newPaymentStatus,
                remainingAmount: newRemainingAmount,
                updatedAt: new Date()
            });
        } catch (error) {
            console.error('Error updating vendor invoice items:', error);
            throw error;
        }
    }
};

// Helper function to adjust inventory based on vendor invoice item changes
async function adjustInventoryForVendorItemChanges(newItems, originalItems) {
    const InventoryModel = require('../models/inventoryModel');

    try {
        console.log('Adjusting inventory for vendor item changes');

        // Track items that were removed completely - for vendor invoices, these need to be removed from inventory
        const removedItems = originalItems.filter(original =>
            !newItems.some(newItem => newItem.itemId === original.itemId)
        );

        // Remove items that were deleted from the invoice (remove from inventory)
        for (const item of removedItems) {
            console.log(`Item ${item.itemId} (${item.name}) was removed from vendor invoice, removing from inventory`);

            // Get current inventory item
            const inventoryItem = await InventoryModel.findOne({ itemId: item.itemId });
            if (!inventoryItem) {
                console.warn(`Inventory item ${item.itemId} not found for adjustment`);
                continue;
            }

            // Calculate new values - remove the quantities that were originally added
            const newQuantity = Math.max(0, inventoryItem.quantity - item.quantity);
            const newNetWeight = Math.max(0, inventoryItem.netWeight - item.netWeight);
            const newGrossWeight = Math.max(0, inventoryItem.grossWeight - (item.grossWeight || 0));

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

            // If no original item, this is a new addition - add to inventory
            if (!originalItem) {
                console.log(`Item ${newItem.itemId} (${newItem.name}) is new in vendor invoice, adding to inventory`);

                // Get current inventory item
                const inventoryItem = await InventoryModel.findOne({ itemId: newItem.itemId });
                if (!inventoryItem) {
                    console.warn(`Inventory item ${newItem.itemId} not found for adjustment`);
                    continue;
                }

                // Add the full quantities to inventory
                const newQuantity = inventoryItem.quantity + newItem.quantity;
                const newNetWeight = inventoryItem.netWeight + newItem.netWeight;
                const newGrossWeight = inventoryItem.grossWeight + (newItem.grossWeight || 0);

                // Update inventory
                await InventoryModel.update(inventoryItem._id, {
                    quantity: newQuantity,
                    netWeight: newNetWeight,
                    grossWeight: newGrossWeight
                });

                console.log(`Added to inventory for ${newItem.itemId}: quantity ${inventoryItem.quantity} -> ${newQuantity}`);
                continue;
            }

            // Calculate deltas (positive means more was added in the new version)
            const quantityDelta = newItem.quantity - originalItem.quantity;
            const netWeightDelta = newItem.netWeight - originalItem.netWeight;
            const grossWeightDelta = (newItem.grossWeight || 0) - (originalItem.grossWeight || 0);

            // Skip if nothing changed
            if (quantityDelta === 0 && netWeightDelta === 0 && grossWeightDelta === 0) {
                continue;
            }

            console.log(`Item ${newItem.itemId} (${newItem.name}) changed in vendor invoice:`, {
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

            // Update inventory (add deltas - for vendor invoices, positive delta means add to inventory)
            const newQuantity = Math.max(0, inventoryItem.quantity + quantityDelta);
            const newNetWeight = Math.max(0, inventoryItem.netWeight + netWeightDelta);
            const newGrossWeight = Math.max(0, inventoryItem.grossWeight + grossWeightDelta);

            await InventoryModel.update(inventoryItem._id, {
                quantity: newQuantity,
                netWeight: newNetWeight,
                grossWeight: newGrossWeight
            });

            console.log(`Updated inventory for ${newItem.itemId} from vendor invoice:`, {
                quantity: `${inventoryItem.quantity} -> ${newQuantity}`,
                netWeight: `${inventoryItem.netWeight} -> ${newNetWeight}`,
                grossWeight: `${inventoryItem.grossWeight} -> ${newGrossWeight}`
            });
        }

    } catch (error) {
        console.error('Error adjusting inventory for vendor invoice:', error);
        throw error;
    }
}

// Helper function to revert inventory changes when deleting a vendor invoice
async function revertVendorInventoryChanges(invoice) {
    const InventoryModel = require('../models/inventoryModel');

    try {
        console.log(`Reverting inventory changes for vendor invoice #${invoice.invoiceNumber}`);

        // For each item in the vendor invoice, remove it from inventory
        for (const item of invoice.items) {
            console.log(`Removing item ${item.itemId} (${item.name}) from inventory due to vendor invoice deletion`);

            // Get current inventory item
            const inventoryItem = await InventoryModel.findOne({ itemId: item.itemId });
            if (!inventoryItem) {
                console.warn(`Inventory item ${item.itemId} not found for reversal`);
                continue;
            }

            // Calculate new values - subtract the quantities that were added
            const newQuantity = Math.max(0, inventoryItem.quantity - (item.quantity || 0));
            const newNetWeight = Math.max(0, inventoryItem.netWeight - (item.netWeight || 0));
            const newGrossWeight = Math.max(0, inventoryItem.grossWeight - (item.grossWeight || 0));

            // Update inventory
            await InventoryModel.update(inventoryItem._id, {
                quantity: newQuantity,
                netWeight: newNetWeight,
                grossWeight: newGrossWeight
            });

            console.log(`Reverted inventory for ${item.itemId} from vendor invoice:`, {
                quantity: `${inventoryItem.quantity} -> ${newQuantity}`,
                netWeight: `${inventoryItem.netWeight} -> ${newNetWeight}`,
                grossWeight: `${inventoryItem.grossWeight} -> ${newGrossWeight}`
            });
        }
    } catch (error) {
        console.error('Error reverting vendor inventory changes:', error);
        throw error;
    }
}

module.exports = VendorInvoiceController; 