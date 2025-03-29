const CommissionSheetModel = require('../models/commissionSheetModel');
const CommissionerModel = require('../models/commissionerModel');
const InventoryModel = require('../models/inventoryModel');

console.log('Loading CommissionSheetController...');

const CommissionSheetController = {
    getCommissionSheets: async (options = {}) => {
        try {
            const { page = 1, perPage = 10, search = '', filter = {} } = options;
            const skip = (page - 1) * perPage;

            console.log('CommissionSheetController: getCommissionSheets called with options:', options);

            let query = { ...filter };
            if (search && search.trim() !== '') {
                query = {
                    ...query,
                    $or: [
                        { invoiceKey: new RegExp(search, 'i') },
                        { 'commissioner.name': new RegExp(search, 'i') }
                    ]
                };
            }

            console.log('CommissionSheetController: Querying with:', query);
            const total = await CommissionSheetModel.count(query);
            console.log('CommissionSheetController: Found', total, 'commission sheets');

            const sheets = await CommissionSheetModel.findAll(query, {
                skip,
                limit: perPage,
                sort: { createdAt: -1 }
            });
            console.log('CommissionSheetController: Retrieved', sheets.length, 'commission sheets');

            // Enrich with commissioner data if needed
            const enrichedSheets = await Promise.all(sheets.map(async (sheet) => {
                if (sheet.commissionerId) {
                    try {
                        const commissioner = await CommissionerModel.findOne({ _id: sheet.commissionerId });
                        if (commissioner) {
                            return {
                                ...sheet,
                                commissioner: {
                                    name: commissioner.name,
                                    city: commissioner.city,
                                    phone: commissioner.phone
                                }
                            };
                        }
                    } catch (err) {
                        console.error(`Error fetching commissioner for sheet ${sheet._id}:`, err);
                    }
                }
                return sheet;
            }));

            return {
                sheets: enrichedSheets,
                total,
                page,
                totalPages: Math.ceil(total / perPage)
            };
        } catch (error) {
            console.error('Error fetching commission sheets:', error);
            throw error;
        }
    },

    getCommissionSheet: async (id) => {
        try {
            const sheet = await CommissionSheetModel.findOne({ _id: id });
            if (!sheet) {
                throw new Error('Commission sheet not found');
            }

            // Enrich with commissioner data
            if (sheet.commissionerId) {
                const commissioner = await CommissionerModel.findOne({ _id: sheet.commissionerId });
                if (commissioner) {
                    sheet.commissioner = {
                        name: commissioner.name,
                        city: commissioner.city,
                        phone: commissioner.phone
                    };
                }
            }

            // Enrich items with inventory data
            if (sheet.items && sheet.items.length > 0) {
                const enrichedItems = await Promise.all(sheet.items.map(async (item) => {
                    if (item.itemId) {
                        try {
                            const inventoryItem = await InventoryModel.findOne({ _id: item.itemId });
                            if (inventoryItem) {
                                return {
                                    ...item,
                                    name: inventoryItem.name,
                                    description: inventoryItem.description
                                };
                            }
                        } catch (err) {
                            console.error(`Error fetching inventory item for sheet ${sheet._id}:`, err);
                        }
                    }
                    return item;
                }));

                sheet.items = enrichedItems;
            }

            return sheet;
        } catch (error) {
            console.error('Error fetching commission sheet:', error);
            throw error;
        }
    },

    createCommissionSheet: async (sheetData) => {
        try {
            console.log('CommissionSheetController: createCommissionSheet called with data:', sheetData);

            // Generate invoice number if not provided
            if (!sheetData.invoiceKey) {
                sheetData.invoiceKey = await CommissionSheetModel.generateInvoiceNumber();
                console.log('CommissionSheetController: Generated invoice number:', sheetData.invoiceKey);
            }

            // Ensure commission price is an integer
            if (sheetData.commissionPrice !== undefined) {
                sheetData.commissionPrice = Math.round(sheetData.commissionPrice);
                console.log('CommissionSheetController: Rounded commission price to integer:', sheetData.commissionPrice);
            }

            // Calculate pending amount based on commissionPrice, not totalPrice
            if (sheetData.commissionPrice !== undefined && sheetData.receivedAmount !== undefined) {
                sheetData.pendingAmount = Math.max(0, sheetData.commissionPrice - sheetData.receivedAmount);
                console.log('CommissionSheetController: Calculated pending amount:', sheetData.pendingAmount);
            }

            // Determine status based on payment received vs commission - only 'paid' or 'not paid'
            sheetData.status = sheetData.pendingAmount <= 0 ? 'paid' : 'not paid';

            const newSheet = await CommissionSheetModel.create(sheetData);
            console.log('CommissionSheetController: Commission sheet created successfully:', newSheet._id);
            return newSheet;
        } catch (error) {
            console.error('Error creating commission sheet:', error);
            throw error;
        }
    },

    updateCommissionSheet: async (id, updateData) => {
        try {
            // Ensure commission price is an integer if it's being updated
            if (updateData.commissionPrice !== undefined) {
                updateData.commissionPrice = Math.round(updateData.commissionPrice);
            }

            // Calculate pending amount if total price, commission price or received amount changes
            if (updateData.totalPrice !== undefined ||
                updateData.receivedAmount !== undefined ||
                updateData.commissionPrice !== undefined) {

                const sheet = await CommissionSheetModel.findOne({ _id: id });
                if (!sheet) {
                    throw new Error('Commission sheet not found');
                }

                const totalPrice = updateData.totalPrice !== undefined ? updateData.totalPrice : sheet.totalPrice;
                const receivedAmount = updateData.receivedAmount !== undefined ? updateData.receivedAmount : sheet.receivedAmount;
                const commissionPrice = updateData.commissionPrice !== undefined ? updateData.commissionPrice : sheet.commissionPrice;

                // Calculate pending amount based on commission price, not total price
                updateData.pendingAmount = Math.max(0, commissionPrice - receivedAmount);

                // Determine status based on pendingAmount - only 'paid' or 'not paid'
                updateData.status = updateData.pendingAmount <= 0 ? 'paid' : 'not paid';
            }

            const updated = await CommissionSheetModel.update(id, updateData);
            if (!updated) {
                throw new Error('Commission sheet not found or not updated');
            }

            return true;
        } catch (error) {
            console.error('Error updating commission sheet:', error);
            throw error;
        }
    },

    deleteCommissionSheet: async (id) => {
        try {
            const deleted = await CommissionSheetModel.delete(id);
            if (!deleted) {
                throw new Error('Commission sheet not found or not deleted');
            }

            return true;
        } catch (error) {
            console.error('Error deleting commission sheet:', error);
            throw error;
        }
    },

    generateInvoicePreview: async (sheetData) => {
        try {
            // Generate invoice number if not exists
            if (!sheetData.invoiceKey || sheetData.invoiceKey === 'ATC-XXXX') {
                sheetData.invoiceKey = await CommissionSheetModel.generateInvoiceNumber();
            }

            // Ensure commission price is an integer
            if (sheetData.commissionPrice !== undefined) {
                sheetData.commissionPrice = Math.round(sheetData.commissionPrice);
            }

            // Enrich with commissioner data
            let commissionerDetails = {};
            if (sheetData.commissionerId) {
                const commissioner = await CommissionerModel.findOne({ _id: sheetData.commissionerId });
                if (commissioner) {
                    commissionerDetails = {
                        name: commissioner.name,
                        city: commissioner.city,
                        phone: commissioner.phone
                    };
                }
            }

            // Enrich items with inventory data
            let enrichedItems = [];
            if (sheetData.items && sheetData.items.length > 0) {
                enrichedItems = await Promise.all(sheetData.items.map(async (item) => {
                    if (item.itemId) {
                        try {
                            const inventoryItem = await InventoryModel.findOne({ _id: item.itemId });
                            if (inventoryItem) {
                                return {
                                    ...item,
                                    name: inventoryItem.name,
                                    description: inventoryItem.description
                                };
                            }
                        } catch (err) {
                            console.error(`Error fetching inventory item:`, err);
                        }
                    }
                    return item;
                }));
            }

            // Calculate pending amount based on commissionPrice
            const pendingAmount = Math.max(0, sheetData.commissionPrice - sheetData.receivedAmount);

            // Calculate status based on receivedAmount compared to commissionPrice
            let status = 'not paid';
            if (sheetData.receivedAmount <= 0) {
                status = 'not paid';
            } else if (pendingAmount <= 0 || sheetData.receivedAmount >= sheetData.commissionPrice) {
                status = 'paid';
            } else {
                status = 'partially paid';
            }

            return {
                ...sheetData,
                commissioner: commissionerDetails,
                items: enrichedItems,
                status,
                pendingAmount,
                commissionPrice: sheetData.commissionPrice // Ensure rounded value is returned
            };
        } catch (error) {
            console.error('Error generating invoice preview:', error);
            throw error;
        }
    },

    getPendingCommissionSheets: async (options = {}) => {
        try {
            const { status = 'pending' } = options;

            // Define the query for pending commission sheets
            let query = {};

            if (status === 'pending') {
                // Find sheets where pending amount > 0
                // Using a simpler query without $expr
                query = {
                    pendingAmount: { $gt: 0 }  // Has pending amount greater than 0
                };
            }

            // Count the sheets
            const count = await CommissionSheetModel.count(query);

            return {
                total: count
            };
        } catch (error) {
            console.error('Error getting pending commission sheets:', error);
            throw error;
        }
    }
};

module.exports = CommissionSheetController; 