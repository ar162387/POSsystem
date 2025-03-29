const VendorModel = require('../models/vendorModel');

const VendorController = {
    addVendor: async (vendorData) => {
        try {
            return await VendorModel.create(vendorData);
        } catch (error) {
            throw error;
        }
    },

    getVendors: async (options) => {
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
            const count = await VendorModel.count(query);

            // Get paginated vendors
            const vendors = await VendorModel.findAll(query, {
                skip,
                limit: perPage,
                sort: { createdAt: -1 }
            });

            return {
                vendors,
                total: count,
                page,
                totalPages: Math.ceil(count / perPage)
            };
        } catch (error) {
            throw error;
        }
    },

    updateVendor: async (vendorData) => {
        try {
            const { _id, ...updateData } = vendorData;
            const updatedVendor = await VendorModel.update(_id, updateData);
            if (!updatedVendor) {
                throw new Error('Vendor not found');
            }
            return updatedVendor;
        } catch (error) {
            throw error;
        }
    },

    deleteVendor: async (vendorId) => {
        try {
            return await VendorModel.delete(vendorId);
        } catch (error) {
            throw error;
        }
    }
};

module.exports = VendorController; 