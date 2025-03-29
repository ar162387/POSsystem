import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ipcRenderer } from 'electron';
import PermissionsManager from '../../components/settings/PermissionsManager.jsx';

const UserManagement = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        fullName: '',
        password: '',
        confirmPassword: '',
        role: 'cashier'
    });
    const [formErrors, setFormErrors] = useState({});

    // Load users on component mount
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const fetchedUsers = await ipcRenderer.invoke('get-users');
            setUsers(fetchedUsers);
        } catch (err) {
            setError('Failed to load users. Please try again.');
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.username.trim()) {
            errors.username = 'Username is required';
        }

        if (showAddModal && !formData.password) {
            errors.password = 'Password is required';
        }

        if ((showAddModal || formData.password) && formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAddUser = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setLoading(true);
            const newUser = await ipcRenderer.invoke('create-user', {
                username: formData.username,
                fullName: formData.fullName,
                password: formData.password,
                role: formData.role
            });

            if (newUser) {
                setUsers([...users, newUser]);
                setSuccess(`User ${newUser.username} created successfully`);
                setShowAddModal(false);
                resetForm();
            }
        } catch (err) {
            setError('Failed to create user. Please try again.');
            console.error('Error creating user:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setLoading(true);
            const updatedData = {
                _id: selectedUser._id,
                username: formData.username,
                fullName: formData.fullName,
                role: formData.role
            };

            // Only include password if it was changed
            if (formData.password) {
                updatedData.password = formData.password;
            }

            const success = await ipcRenderer.invoke('update-user', updatedData);

            if (success) {
                setUsers(users.map(u =>
                    u._id === selectedUser._id ? { ...u, ...updatedData } : u
                ));
                setSuccess(`User ${updatedData.username} updated successfully`);
                setShowEditModal(false);
                resetForm();
            }
        } catch (err) {
            setError('Failed to update user. Please try again.');
            console.error('Error updating user:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        try {
            setLoading(true);
            const success = await ipcRenderer.invoke('delete-user', selectedUser._id);

            if (success) {
                setUsers(users.filter(u => u._id !== selectedUser._id));
                setSuccess(`User ${selectedUser.username} deleted successfully`);
                setShowDeleteModal(false);
            }
        } catch (err) {
            setError('Failed to delete user. Please try again.');
            console.error('Error deleting user:', err);
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({
            username: user.username,
            fullName: user.fullName || '',
            password: '',
            confirmPassword: '',
            role: user.role || 'cashier'
        });
        setShowEditModal(true);
        setError('');
    };

    const openDeleteModal = (user) => {
        setSelectedUser(user);
        setShowDeleteModal(true);
    };

    const openPermissionsModal = (user) => {
        setSelectedUser(user);
        setShowPermissionsModal(true);
    };

    const resetForm = () => {
        setFormData({
            username: '',
            fullName: '',
            password: '',
            confirmPassword: '',
            role: 'cashier'
        });
        setFormErrors({});
    };

    const handlePermissionsSave = async (updatedPermissions) => {
        try {
            setLoading(true);
            const success = await ipcRenderer.invoke('update-user-permissions', {
                userId: selectedUser._id,
                permissions: updatedPermissions
            });

            if (success) {
                setUsers(users.map(u =>
                    u._id === selectedUser._id
                        ? { ...u, permissions: updatedPermissions }
                        : u
                ));
                setSuccess(`Permissions for ${selectedUser.username} updated successfully`);
                setShowPermissionsModal(false);
            }
        } catch (err) {
            setError('Failed to update user permissions. Please try again.');
            console.error('Error updating permissions:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
                    <p className="text-gray-600">Manage system users and their permissions</p>
                </div>
                <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    onClick={() => setShowAddModal(true)}
                >
                    Add New User
                </button>
            </div>

            {/* Error/Success Alerts */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
                    <span className="block sm:inline">{error}</span>
                    <button
                        className="absolute top-0 right-0 mt-3 mr-4"
                        onClick={() => setError('')}
                    >
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M10 8.586L6.707 5.293a1 1 0 00-1.414 1.414L8.586 10l-3.293 3.293a1 1 0 101.414 1.414L10 11.414l3.293 3.293a1 1 0 001.414-1.414L11.414 10l3.293-3.293a1 1 0 00-1.414-1.414L10 8.586z"
                                clipRule="evenodd"
                            ></path>
                        </svg>
                    </button>
                </div>
            )}

            {success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 relative">
                    <span className="block sm:inline">{success}</span>
                    <button
                        className="absolute top-0 right-0 mt-3 mr-4"
                        onClick={() => setSuccess('')}
                    >
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M10 8.586L6.707 5.293a1 1 0 00-1.414 1.414L8.586 10l-3.293 3.293a1 1 0 101.414 1.414L10 11.414l3.293 3.293a1 1 0 001.414-1.414L11.414 10l3.293-3.293a1 1 0 00-1.414-1.414L10 8.586z"
                                clipRule="evenodd"
                            ></path>
                        </svg>
                    </button>
                </div>
            )}

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Username
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Full Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Last Updated
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-4 text-center">
                                    Loading users...
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-4 text-center">
                                    No users found
                                </td>
                            </tr>
                        ) : (
                            users.map((userItem) => (
                                <tr key={userItem._id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                                                {userItem.username?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {userItem.username}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {userItem.fullName || userItem.username}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${userItem.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                            {userItem.role === 'admin' ? 'Administrator' : 'Cashier'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {userItem.lastUpdated ? new Date(userItem.lastUpdated).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {/* Don't allow editing the current user or the main admin if you're not that user */}
                                        {(user._id !== userItem._id && userItem.username !== 'admin') || user.username === userItem.username ? (
                                            <div className="flex justify-end space-x-2">
                                                <button
                                                    onClick={() => openPermissionsModal(userItem)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                >
                                                    Permissions
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(userItem)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    Edit
                                                </button>
                                                {/* Only show delete for non-admin users */}
                                                {user._id !== userItem._id && userItem.username !== 'admin' && (
                                                    <button
                                                        onClick={() => openDeleteModal(userItem)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">Current User</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 overflow-auto bg-gray-800 bg-opacity-50 flex items-center justify-center">
                    <div className="relative bg-white rounded-lg max-w-md w-full mx-4 md:mx-auto shadow-lg">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium">Add New User</h3>
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        resetForm();
                                    }}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleAddUser} className="space-y-4">
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-2 border rounded-lg ${formErrors.username ? 'border-red-500' : 'border-gray-300'}`}
                                    />
                                    {formErrors.username && (
                                        <p className="text-red-500 text-xs mt-1">{formErrors.username}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-2 border rounded-lg ${formErrors.password ? 'border-red-500' : 'border-gray-300'}`}
                                    />
                                    {formErrors.password && (
                                        <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Confirm Password
                                    </label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-2 border rounded-lg ${formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                                    />
                                    {formErrors.confirmPassword && (
                                        <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Role
                                    </label>
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="cashier">Cashier</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>
                                <div className="flex justify-end mt-6">
                                    <button
                                        type="button"
                                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md mr-2 hover:bg-gray-400"
                                        onClick={() => {
                                            setShowAddModal(false);
                                            resetForm();
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                        disabled={loading}
                                    >
                                        {loading ? 'Creating...' : 'Create User'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <div className="fixed inset-0 z-50 overflow-auto bg-gray-800 bg-opacity-50 flex items-center justify-center">
                    <div className="relative bg-white rounded-lg max-w-md w-full mx-4 md:mx-auto shadow-lg">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium">Edit User</h3>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        resetForm();
                                    }}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleEditUser} className="space-y-4">
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-2 border rounded-lg ${formErrors.username ? 'border-red-500' : 'border-gray-300'}`}
                                    />
                                    {formErrors.username && (
                                        <p className="text-red-500 text-xs mt-1">{formErrors.username}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        New Password (leave empty to keep current)
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                {formData.password && (
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">
                                            Confirm New Password
                                        </label>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className={`w-full px-4 py-2 border rounded-lg ${formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                                        />
                                        {formErrors.confirmPassword && (
                                            <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>
                                        )}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Role
                                    </label>
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                        disabled={selectedUser.username === 'admin'}
                                    >
                                        <option value="cashier">Cashier</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                    {selectedUser.username === 'admin' && (
                                        <p className="text-gray-500 text-xs mt-1">The main admin role cannot be changed</p>
                                    )}
                                </div>
                                <div className="flex justify-end mt-6">
                                    <button
                                        type="button"
                                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md mr-2 hover:bg-gray-400"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            resetForm();
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                        disabled={loading}
                                    >
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete User Confirmation Modal */}
            {showDeleteModal && selectedUser && (
                <div className="fixed inset-0 z-50 overflow-auto bg-gray-800 bg-opacity-50 flex items-center justify-center">
                    <div className="relative bg-white rounded-lg max-w-md w-full mx-4 md:mx-auto shadow-lg">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-red-600">Confirm Delete</h3>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <p className="mb-4">
                                Are you sure you want to delete user <span className="font-bold">{selectedUser.username}</span>? This action cannot be undone.
                            </p>
                            <div className="flex justify-end">
                                <button
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md mr-2 hover:bg-gray-400"
                                    onClick={() => setShowDeleteModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                    onClick={handleDeleteUser}
                                    disabled={loading}
                                >
                                    {loading ? 'Deleting...' : 'Delete User'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Permissions Modal */}
            {showPermissionsModal && selectedUser && (
                <div className="fixed inset-0 z-50 overflow-auto bg-gray-800 bg-opacity-50 flex items-center justify-center">
                    <div className="relative bg-white rounded-lg max-w-2xl w-full mx-4 md:mx-auto shadow-lg">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium">User Permissions</h3>
                                <button
                                    onClick={() => setShowPermissionsModal(false)}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="max-h-[70vh] overflow-y-auto">
                                <PermissionsManager
                                    user={selectedUser}
                                    onSave={handlePermissionsSave}
                                    onCancel={() => setShowPermissionsModal(false)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement; 