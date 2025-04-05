const BrokerModel = require('../models/brokerModel');
const InvoiceModel = require('../models/invoiceModel');

const BrokerController = {
    getBrokers: async (options = {}) => {
        try {
            const { page = 1, perPage = 10, searchQuery = '' } = options;
            const skip = (page - 1) * perPage;

            let query = {};
            if (searchQuery) {
                query = {
                    $or: [
                        { name: new RegExp(searchQuery, 'i') },
                        { phone: new RegExp(searchQuery, 'i') },
                    ]
                };
            }

            const total = await BrokerModel.count(query);
            const brokers = await BrokerModel.findAll(query, {
                sort: { name: 1 },
                skip,
                limit: parseInt(perPage)
            });

            return {
                brokers,
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / perPage)
            };
        } catch (error) {
            console.error('Error getting brokers:', error);
            throw error;
        }
    },

    getBroker: async (brokerId) => {
        try {
            return await BrokerModel.findOne({ _id: brokerId });
        } catch (error) {
            console.error('Error getting broker:', error);
            throw error;
        }
    },

    createBroker: async (brokerData) => {
        try {
            // Initialize payment history array if it doesn't exist
            const brokerWithHistory = {
                ...brokerData,
                paymentHistory: []
            };

            return await BrokerModel.create(brokerWithHistory);
        } catch (error) {
            console.error('Error creating broker:', error);
            throw error;
        }
    },

    updateBroker: async (brokerId, updateData) => {
        try {
            return await BrokerModel.update(brokerId, updateData);
        } catch (error) {
            console.error('Error updating broker:', error);
            throw error;
        }
    },

    deleteBroker: async (brokerId) => {
        try {
            return await BrokerModel.delete(brokerId);
        } catch (error) {
            console.error('Error deleting broker:', error);
            throw error;
        }
    },

    recordCommissionPayment: async (paymentData) => {
        try {
            const { brokerId, brokerName, paymentAmount, paymentMethod, paymentDate } = paymentData;

            // Get the broker with the most current data
            const broker = await BrokerModel.findOne({ _id: brokerId });
            if (!broker) {
                throw new Error(`Broker with ID ${brokerId} not found`);
            }

            console.log(`Recording payment of ${paymentAmount} for broker ${brokerName}`);

            // Create payment record
            const paymentRecord = {
                amount: parseFloat(paymentAmount) || 0,
                method: paymentMethod || 'cash',
                date: paymentDate || new Date().toISOString().split('T')[0],
                createdAt: new Date()
            };

            // Get existing payment history or initialize empty array
            const paymentHistory = broker.paymentHistory || [];

            // Add new payment to history
            paymentHistory.push(paymentRecord);

            // Calculate total paid amount
            const totalPaid = paymentHistory.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

            // Get the broker commission summary for logging
            const commissionSummary = await module.exports.getBrokerCommissionSummary(brokerId);
            console.log('Broker commission summary after payment:', commissionSummary);

            // Update broker record with payment history and total paid
            return await BrokerModel.update(brokerId, {
                paymentHistory,
                totalPaid
            });
        } catch (error) {
            console.error('Error recording broker commission payment:', error);
            throw error;
        }
    },

    getPaymentHistory: async (brokerId) => {
        try {
            const broker = await BrokerModel.findOne({ _id: brokerId });
            if (!broker) {
                throw new Error(`Broker with ID ${brokerId} not found`);
            }

            // Return payment history sorted by date (newest first)
            return (broker.paymentHistory || []).sort((a, b) =>
                new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
            );
        } catch (error) {
            console.error('Error fetching broker payment history:', error);
            throw error;
        }
    },

    // Update broker commission info after an invoice is updated
    updateBrokerCommissionInfo: async (brokerId) => {
        try {
            console.log(`Updating commission info for broker ${brokerId}`);

            // Get the broker with the most current data
            const broker = await BrokerModel.findOne({ _id: brokerId });
            if (!broker) {
                throw new Error(`Broker with ID ${brokerId} not found`);
            }

            // Get the commission summary (which calculates total commission from invoices)
            const commissionSummary = await module.exports.getBrokerCommissionSummary(brokerId);

            console.log('Updated broker commission summary:', commissionSummary);

            // No need to update any broker records as the summary is calculated dynamically
            return commissionSummary;
        } catch (error) {
            console.error('Error updating broker commission info:', error);
            throw error;
        }
    },

    getBrokerCommissionSummary: async (brokerId) => {
        try {
            // Get the broker record
            const broker = await BrokerModel.findOne({ _id: brokerId });
            if (!broker) {
                throw new Error(`Broker with ID ${brokerId} not found`);
            }

            // Query invoices to calculate total commission
            const invoices = await InvoiceModel.findAll({ brokerId });

            // Calculate total commission from all invoices
            const totalCommission = invoices.reduce((sum, invoice) => {
                return sum + parseFloat(invoice.commissionAmount || 0);
            }, 0);

            // Get the total paid from broker record
            const totalPaid = parseFloat(broker.totalPaid || 0);

            // Calculate remaining amount
            const totalRemaining = Math.max(0, totalCommission - totalPaid);

            return {
                brokerId,
                brokerName: broker.name,
                totalCommission,
                totalPaid,
                totalRemaining
            };
        } catch (error) {
            console.error('Error getting broker commission summary:', error);
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