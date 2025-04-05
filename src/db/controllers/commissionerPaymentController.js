const CommissionerPaymentModel = require('../models/commissionerPaymentModel');
const CommissionerModel = require('../models/commissionerModel');

const CommissionerPaymentController = {
    getAllCommissionerPayments: async () => {
        try {
            // Get all payments
            const payments = await CommissionerPaymentModel.findAll();

            return {
                payments
            };
        } catch (error) {
            console.error('Error fetching all commissioner payments:', error);
            throw error;
        }
    },

    getCommissionerPayments: async (commissionerId) => {
        try {
            if (!commissionerId) {
                throw new Error('Commissioner ID is required');
            }

            // Verify commissioner exists
            const commissioner = await CommissionerModel.findOne({ _id: commissionerId });
            if (!commissioner) {
                throw new Error('Commissioner not found');
            }

            // Get all payments for this commissioner
            const payments = await CommissionerPaymentModel.getPaymentsByCommissioner(commissionerId);

            return {
                commissioner: {
                    id: commissioner._id,
                    name: commissioner.name
                },
                payments
            };
        } catch (error) {
            console.error('Error fetching commissioner payments:', error);
            throw error;
        }
    },

    addPayment: async (paymentData) => {
        try {
            const { commissionerId, amount, method, date } = paymentData;

            if (!commissionerId) {
                throw new Error('Commissioner ID is required');
            }

            // Verify commissioner exists
            const commissioner = await CommissionerModel.findOne({ _id: commissionerId });
            if (!commissioner) {
                throw new Error('Commissioner not found');
            }

            // Create payment record
            const newPayment = await CommissionerPaymentModel.create({
                commissionerId,
                amount: parseFloat(amount),
                method,
                date,
                createdAt: new Date()
            });

            return newPayment;
        } catch (error) {
            console.error('Error adding commissioner payment:', error);
            throw error;
        }
    },

    updatePayment: async (id, updateData) => {
        try {
            if (!id) {
                throw new Error('Payment ID is required');
            }

            // Verify payment exists
            const payment = await CommissionerPaymentModel.findOne({ _id: id });
            if (!payment) {
                throw new Error('Payment not found');
            }

            // Update payment
            const updated = await CommissionerPaymentModel.update(id, updateData);
            return updated;
        } catch (error) {
            console.error('Error updating commissioner payment:', error);
            throw error;
        }
    },

    deletePayment: async (id) => {
        try {
            if (!id) {
                throw new Error('Payment ID is required');
            }

            // Delete the payment
            const deleted = await CommissionerPaymentModel.delete(id);
            return deleted;
        } catch (error) {
            console.error('Error deleting commissioner payment:', error);
            throw error;
        }
    },

    getPaymentStats: async (commissionerId) => {
        try {
            let query = {};

            // If commissioner ID is provided, filter payments by that commissioner
            if (commissionerId) {
                query.commissionerId = commissionerId;
            }

            // Get all matching payments
            const payments = await CommissionerPaymentModel.findAll(query);

            // Calculate total paid
            const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

            return {
                totalPaid,
                paymentCount: payments.length
            };
        } catch (error) {
            console.error('Error getting payment stats:', error);
            throw error;
        }
    }
};

module.exports = CommissionerPaymentController;
