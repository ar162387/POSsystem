const UserModel = require('../models/userModel');

// Define default permission templates
const permissionTemplates = {
    admin: {
        dashboard: true,
        inventory: {
            view: true,
            manage: true
        },
        financial: {
            view: true,
            details: true,
            profitLoss: true,
            salesReport: true
        },
        customers: {
            view: true,
            list: true,
            invoices: true,
            payables: true
        },
        vendors: {
            view: true,
            list: true,
            invoices: true,
            payables: true
        },
        brokers: {
            view: true,
            list: true,
            payments: true
        },
        commissioners: {
            view: true,
            list: true,
            addSheet: true,
            sheets: true
        },
        settings: {
            view: true,
            account: true,
            userManagement: true
        }
    },
    cashier: {
        dashboard: true,
        inventory: {
            view: true,
            manage: false
        },
        financial: {
            view: false,
            details: false,
            profitLoss: false,
            salesReport: false
        },
        customers: {
            view: true,
            list: true,
            invoices: true,
            payables: false
        },
        vendors: {
            view: false,
            list: false,
            invoices: false,
            payables: false
        },
        brokers: {
            view: false,
            list: false,
            payments: false
        },
        commissioners: {
            view: false,
            list: false,
            addSheet: false,
            sheets: false
        },
        settings: {
            view: true,
            account: true,
            userManagement: false
        }
    }
};

const UserController = {
    getPermissionTemplates: () => {
        return permissionTemplates;
    },

    checkAdminExists: async () => {
        try {
            const admin = await UserModel.findOne({ role: 'admin' });
            return !!admin;
        } catch (error) {
            throw error;
        }
    },

    createUser: async (userData) => {
        try {
            // Apply default permissions based on role if not explicitly provided
            if (!userData.permissions) {
                const role = userData.role || 'cashier';
                userData.permissions = permissionTemplates[role] || permissionTemplates.cashier;
            }
            return await UserModel.create(userData);
        } catch (error) {
            throw error;
        }
    },

    login: async (credentials) => {
        try {
            const { username, password } = credentials;

            // Find user by username
            const user = await UserModel.findOne({ username });
            if (!user) return null;

            // Verify password
            const isMatch = await UserModel.comparePassword(password, user.password);
            if (!isMatch) return null;

            // Return user data without password
            const { password: pwd, ...userWithoutPassword } = user;
            return userWithoutPassword;
        } catch (error) {
            throw error;
        }
    },

    verifyUser: async (userData) => {
        try {
            const { _id } = userData;
            const user = await UserModel.findOne({ _id });
            return !!user;
        } catch (error) {
            throw error;
        }
    },

    changePassword: async (data) => {
        try {
            const { userId, currentPassword, newPassword } = data;

            // Find user by ID
            const user = await UserModel.findOne({ _id: userId });
            if (!user) return false;

            // Verify current password
            const isMatch = await UserModel.comparePassword(currentPassword, user.password);
            if (!isMatch) return false;

            // Hash new password
            const hashedPassword = await UserModel.hashPassword(newPassword);

            // Update user's password
            await UserModel.update(userId, {
                password: hashedPassword,
                lastUpdated: new Date()
            });
            return true;
        } catch (error) {
            throw error;
        }
    },

    getUsers: async () => {
        try {
            return await UserModel.findAll();
        } catch (error) {
            throw error;
        }
    },

    updateUser: async (userData) => {
        try {
            const { _id, password, ...updateData } = userData;
            updateData.lastUpdated = new Date();

            // If updating password, hash it before saving
            if (password) {
                // Hash the new password
                const hashedPassword = await UserModel.hashPassword(password);
                updateData.password = hashedPassword;
            }

            return await UserModel.update(_id, updateData);
        } catch (error) {
            throw error;
        }
    },

    updateUserPermissions: async (userId, permissions) => {
        try {
            return await UserModel.update(userId, {
                permissions,
                lastUpdated: new Date()
            });
        } catch (error) {
            throw error;
        }
    },

    deleteUser: async (userId) => {
        try {
            return await UserModel.delete(userId);
        } catch (error) {
            throw error;
        }
    }
};

module.exports = UserController; 