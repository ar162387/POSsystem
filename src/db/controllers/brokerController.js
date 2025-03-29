const BrokerModel = require('../models/brokerModel');
const InvoiceModel = require('../models/invoiceModel');

const BrokerController = {
    getBrokers: async (options) => {
        try {
            const { page = 1, perPage = 10, filter = '' } = options;
            const skip = (page - 1) * perPage;

            let query = {};
            if (filter && filter.trim() !== '') {
                query = {
                    $or: [
                        { name: new RegExp(filter, 'i') },
                        { phone: new RegExp(filter, 'i') },
                        { city: new RegExp(filter, 'i') }
                    ]
                };
            }

            // Get total count for pagination
            const count = await BrokerModel.count(query);

            // Get paginated brokers
            const brokers = await BrokerModel.findAll(query, {
                skip,
                limit: perPage,
                sort: { name: 1 }
            });

            return {
                brokers,
                total: count,
                page,
                totalPages: Math.ceil(count / perPage)
            };
        } catch (error) {
            throw error;
        }
    },

    addBroker: async (brokerData) => {
        try {
            // Validate required fields
            if (!brokerData.name) {
                throw new Error('Broker name is required');
            }

            // Create broker
            const newBroker = await BrokerModel.create(brokerData);
            return newBroker;
        } catch (error) {
            throw error;
        }
    },

    updateBroker: async (brokerData) => {
        try {
            const { _id, ...updateData } = brokerData;

            if (!_id) {
                throw new Error('Broker ID is required');
            }

            // Update broker
            const updated = await BrokerModel.update(_id, updateData);
            return { success: updated, _id };
        } catch (error) {
            throw error;
        }
    },

    deleteBroker: async (brokerId) => {
        try {
            if (!brokerId) {
                throw new Error('Broker ID is required');
            }

            // Delete broker
            const deleted = await BrokerModel.delete(brokerId);
            return deleted;
        } catch (error) {
            throw error;
        }
    },

    getPendingBrokerPayments: async (options = {}) => {
        try {
            const { status = 'pending' } = options;

            // Using a simpler query without $expr
            const query = {
                brokerId: { $ne: null },      // Has a broker
                commissionAmount: { $gt: 0 }, // Has commission amount
                brokerPaidAmount: { $lt: 1 }  // No payment or partial payment
            };

            // Count the invoices
            const count = await InvoiceModel.count(query);

            return {
                total: count
            };
        } catch (error) {
            console.error('Error getting pending broker payments:', error);
            throw error;
        }
    }
};

module.exports = BrokerController; 