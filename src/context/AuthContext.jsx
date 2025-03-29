import React, { createContext, useContext, useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initialize database and check for existing admin user
        const initializeApp = async () => {
            try {
                // Check if admin user exists, if not create one
                const adminExists = await ipcRenderer.invoke('check-admin-exists');

                if (!adminExists) {
                    // Create default admin user
                    await ipcRenderer.invoke('create-user', {
                        username: 'admin',
                        password: 'admin123', // Default password
                        role: 'admin'
                    });
                    console.log('Default admin user created');
                }

                // Check for stored auth token
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    // Verify user is still valid
                    const isValid = await ipcRenderer.invoke('verify-user', parsedUser);
                    if (isValid) {
                        setUser(parsedUser);
                    } else {
                        localStorage.removeItem('user');
                    }
                }
            } catch (error) {
                console.error('Error initializing app:', error);
            } finally {
                setLoading(false);
            }
        };

        initializeApp();
    }, []);

    const login = async (username, password) => {
        try {
            const userData = await ipcRenderer.invoke('login', { username, password });
            if (userData) {
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
                return userData;
            }
            return null;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('user');
        setUser(null);
    };

    const changePassword = async (userId, currentPassword, newPassword) => {
        try {
            const success = await ipcRenderer.invoke('change-password', {
                userId,
                currentPassword,
                newPassword
            });
            return success;
        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        }
    };

    // Permission checking methods
    const hasPermission = (permissionPath) => {
        if (!user) return false;

        // Admin has all permissions
        if (user.role === 'admin') return true;

        if (!user.permissions) return false;

        // For simple string paths like 'dashboard'
        if (!permissionPath.includes('.')) {
            return user.permissions[permissionPath] === true;
        }

        // For nested paths like 'inventory.manage'
        const parts = permissionPath.split('.');
        let current = user.permissions;

        for (const part of parts) {
            if (current[part] === undefined) return false;
            current = current[part];
            if (typeof current !== 'object' && typeof current !== 'boolean') return false;
            if (typeof current === 'boolean') return current;
        }

        return true;
    };

    // Check if user can view a section
    const canView = (section) => {
        return hasPermission(`${section}.view`) || hasPermission(section);
    };

    // Get permission templates (for admin)
    const getPermissionTemplates = async () => {
        try {
            return await ipcRenderer.invoke('get-permission-templates');
        } catch (error) {
            console.error('Error getting permission templates:', error);
            throw error;
        }
    };

    // Update user permissions (admin only)
    const updateUserPermissions = async (userId, permissions) => {
        try {
            const success = await ipcRenderer.invoke('update-user-permissions', {
                userId,
                permissions
            });

            // If updating the current user, refresh the user object
            if (user && user._id === userId) {
                const updatedUser = { ...user, permissions };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }

            return success;
        } catch (error) {
            console.error('Error updating user permissions:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
                changePassword,
                hasPermission,
                canView,
                getPermissionTemplates,
                updateUserPermissions
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}; 