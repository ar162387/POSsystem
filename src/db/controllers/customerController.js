const CustomerModel = require('../models/customerModel');

const CustomerController = {
    addCustomer: async (customerData) => {
        try {
            return await CustomerModel.create(customerData);
        } catch (error) {
            throw error;
        }
    },

    getCustomers: async (options) => {
        try {
            const { page = 1, perPage = 10, filter = '' } = options;
            const skip = (page - 1) * perPage;

            let query = {};

            // Apply filter if provided
            if (filter && filter.trim() !== '') {
                query = {
                    $or: [
                        { name: new RegExp(filter, 'i') },
                        { city: new RegExp(filter, 'i') },
                        { phone: new RegExp(filter, 'i') }
                    ]
                };
            }

            // Get total count for pagination
            const count = await CustomerModel.count(query);

            // Get paginated customers
            const customers = await CustomerModel.findAll(query, {
                skip,
                limit: perPage,
                sort: { createdAt: -1 }
            });

            return {
                customers,
                total: count,
                page,
                totalPages: Math.ceil(count / perPage)
            };
        } catch (error) {
            throw error;
        }
    },

    updateCustomer: async (customerData) => {
        try {
            const { _id, ...updateData } = customerData;
            return await CustomerModel.update(_id, updateData);
        } catch (error) {
            throw error;
        }
    },

    deleteCustomer: async (customerId) => {
        try {
            return await CustomerModel.delete(customerId);
        } catch (error) {
            throw error;
        }
    }
};

module.exports = CustomerController; 