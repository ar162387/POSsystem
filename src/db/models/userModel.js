const db = require('../index');
const bcrypt = require('bcryptjs');

const UserModel = {
    findAll: () => {
        return new Promise((resolve, reject) => {
            db.users.find({}, { password: 0 }, (err, users) => {
                if (err) reject(err);
                resolve(users);
            });
        });
    },

    findOne: (query) => {
        return new Promise((resolve, reject) => {
            db.users.findOne(query, (err, user) => {
                if (err) reject(err);
                resolve(user);
            });
        });
    },

    create: async (userData) => {
        const { username, password, role, fullName, permissions } = userData;

        // Hash the password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        return new Promise((resolve, reject) => {
            db.users.insert({
                username,
                password: hashedPassword,
                role,
                fullName: fullName || username,
                permissions: permissions || {},
                createdAt: new Date(),
                lastUpdated: new Date()
            }, (err, newUser) => {
                if (err) reject(err);
                // Remove password from response
                const { password, ...userWithoutPassword } = newUser;
                resolve(userWithoutPassword);
            });
        });
    },

    update: (id, updateData) => {
        return new Promise((resolve, reject) => {
            db.users.update(
                { _id: id },
                { $set: updateData },
                {},
                (err) => {
                    if (err) reject(err);
                    resolve(true);
                }
            );
        });
    },

    delete: (id) => {
        return new Promise((resolve, reject) => {
            db.users.remove({ _id: id }, {}, (err, numRemoved) => {
                if (err) reject(err);
                resolve(numRemoved > 0);
            });
        });
    },

    comparePassword: async (plainPassword, hashedPassword) => {
        return await bcrypt.compare(plainPassword, hashedPassword);
    },

    hashPassword: async (password) => {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    }
};

module.exports = UserModel; 