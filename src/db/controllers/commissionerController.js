const CommissionerModel = require('../models/commissionerModel');

const CommissionerController = {
    getCommissioners: async (options = {}) => {
        try {
            const { page = 1, perPage = 10, search = '' } = options;
            const skip = (page - 1) * perPage;

            let query = {};
            if (search && search.trim() !== '') {
                query = {
                    $or: [
                        { name: new RegExp(search, 'i') },
                        { city: new RegExp(search, 'i') },
                        { phone: new RegExp(search, 'i') }
                    ]
                };
            }

            const total = await CommissionerModel.count(query);
            const commissioners = await CommissionerModel.findAll(query, {
                skip,
                limit: perPage,
                sort: { name: 1 }
            });

            return {
                commissioners,
                total,
                page,
                totalPages: Math.ceil(total / perPage)
            };
        } catch (error) {
            console.error('Error fetching commissioners:', error);
            throw error;
        }
    },

    getCommissioner: async (id) => {
        try {
            const commissioner = await CommissionerModel.findOne({ _id: id });
            if (!commissioner) {
                throw new Error('Commissioner not found');
            }
            return commissioner;
        } catch (error) {
            console.error('Error fetching commissioner:', error);
            throw error;
        }
    },

    createCommissioner: async (commissionerData) => {
        try {
            const newCommissioner = await CommissionerModel.create(commissionerData);
            return newCommissioner;
        } catch (error) {
            console.error('Error creating commissioner:', error);
            throw error;
        }
    },

    updateCommissioner: async (id, updateData) => {
        try {
            const updated = await CommissionerModel.update(id, updateData);
            if (!updated) {
                throw new Error('Commissioner not found or not updated');
            }
            return updated;
        } catch (error) {
            console.error('Error updating commissioner:', error);
            throw error;
        }
    },

    deleteCommissioner: async (id) => {
        try {
            const deleted = await CommissionerModel.delete(id);
            if (!deleted) {
                throw new Error('Commissioner not found or not deleted');
            }
            return deleted;
        } catch (error) {
            console.error('Error deleting commissioner:', error);
            throw error;
        }
    }
};

module.exports = CommissionerController; 