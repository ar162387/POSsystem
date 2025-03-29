import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ipcRenderer } from 'electron';

const AccountSettings = () => {
    const { user, changePassword } = useAuth();
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [profileData, setProfileData] = useState({
        fullName: user?.fullName || user?.username || ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileData({
            ...profileData,
            [name]: value
        });
    };

    const validatePasswordForm = () => {
        if (!formData.currentPassword) {
            setErrorMessage('Current password is required');
            return false;
        }
        if (!formData.newPassword) {
            setErrorMessage('New password is required');
            return false;
        }
        if (formData.newPassword !== formData.confirmPassword) {
            setErrorMessage('New passwords do not match');
            return false;
        }
        return true;
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setSuccessMessage('');
        setErrorMessage('');

        if (!validatePasswordForm()) return;

        setLoading(true);
        try {
            const success = await changePassword(
                user._id,
                formData.currentPassword,
                formData.newPassword
            );

            if (success) {
                setSuccessMessage('Password changed successfully');
                setFormData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
            } else {
                setErrorMessage('Failed to change password. Please check your current password.');
            }
        } catch (error) {
            setErrorMessage('An error occurred. Please try again.');
            console.error('Error changing password:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setSuccessMessage('');
        setErrorMessage('');

        if (!profileData.fullName.trim()) {
            setErrorMessage('Full name is required');
            return;
        }

        setLoading(true);
        try {
            const success = await ipcRenderer.invoke('update-user', {
                _id: user._id,
                fullName: profileData.fullName
            });

            if (success) {
                // Update local storage with the new fullName
                const updatedUser = { ...user, fullName: profileData.fullName };
                localStorage.setItem('user', JSON.stringify(updatedUser));

                setSuccessMessage('Profile updated successfully');
            } else {
                setErrorMessage('Failed to update profile');
            }
        } catch (error) {
            setErrorMessage('An error occurred. Please try again.');
            console.error('Error updating profile:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Account Settings</h1>
                <p className="text-gray-600">Manage your account preferences</p>
            </div>

            {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 relative">
                    <span className="block sm:inline">{successMessage}</span>
                    <button
                        className="absolute top-0 right-0 mt-3 mr-4"
                        onClick={() => setSuccessMessage('')}
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

            {errorMessage && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
                    <span className="block sm:inline">{errorMessage}</span>
                    <button
                        className="absolute top-0 right-0 mt-3 mr-4"
                        onClick={() => setErrorMessage('')}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Information Section */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
                    <form onSubmit={handleProfileUpdate}>
                        <div className="mb-4">
                            <label htmlFor="username" className="block text-gray-700 font-medium mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                value={user?.username || ''}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
                        </div>

                        <div className="mb-4">
                            <label htmlFor="fullName" className="block text-gray-700 font-medium mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="fullName"
                                name="fullName"
                                value={profileData.fullName}
                                onChange={handleProfileChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="role" className="block text-gray-700 font-medium mb-2">
                                Role
                            </label>
                            <input
                                type="text"
                                id="role"
                                value={user?.role === 'admin' ? 'Administrator' : 'Cashier'}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">Contact an administrator to change your role</p>
                        </div>

                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Update Profile'}
                        </button>
                    </form>
                </div>

                {/* Change Password Section */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">Change Password</h2>
                    <form onSubmit={handlePasswordChange}>
                        <div className="mb-4">
                            <label htmlFor="currentPassword" className="block text-gray-700 font-medium mb-2">
                                Current Password
                            </label>
                            <input
                                type="password"
                                id="currentPassword"
                                name="currentPassword"
                                value={formData.currentPassword}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="newPassword" className="block text-gray-700 font-medium mb-2">
                                New Password
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="confirmPassword" className="block text-gray-700 font-medium mb-2">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>

                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            disabled={loading}
                        >
                            {loading ? 'Changing...' : 'Change Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AccountSettings; 