import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

const PermissionsManager = ({ user, onSave, onCancel }) => {
    const { getPermissionTemplates, updateUserPermissions } = useAuth();
    const [permissions, setPermissions] = useState(user?.permissions || {});
    const [templates, setTemplates] = useState({});
    const [loading, setLoading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState('');

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const availableTemplates = await getPermissionTemplates();
            setTemplates(availableTemplates);
        } catch (error) {
            console.error('Error loading permission templates:', error);
        }
    };

    const handlePermissionChange = (key, value) => {
        setPermissions(prev => {
            const updated = { ...prev };

            // Handle nested permissions
            if (key.includes('.')) {
                const [section, subkey] = key.split('.');
                updated[section] = { ...updated[section], [subkey]: value };
            } else {
                updated[key] = value;
            }

            return updated;
        });
    };

    const handleApplyTemplate = (templateName) => {
        if (templates[templateName]) {
            setPermissions(templates[templateName]);
        }
    };

    const handleSavePermissions = async () => {
        setLoading(true);
        try {
            await updateUserPermissions(user._id, permissions);
            onSave(permissions);
        } catch (error) {
            console.error('Error saving permissions:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to render permission checkboxes
    const renderPermissionCheckbox = (label, permissionKey) => {
        // Get current permission value
        let value = false;

        if (permissionKey.includes('.')) {
            const [section, subkey] = permissionKey.split('.');
            value = permissions[section]?.[subkey] === true;
        } else {
            value = permissions[permissionKey] === true;
        }

        return (
            <div className="flex items-center">
                <input
                    type="checkbox"
                    id={permissionKey}
                    checked={value}
                    onChange={(e) => handlePermissionChange(permissionKey, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <label htmlFor={permissionKey} className="ml-2 text-sm text-gray-700">
                    {label}
                </label>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Manage Permissions for {user.username}</h3>
                <p className="text-sm text-gray-500">Control which areas of the system this user can access</p>
            </div>

            {/* Template Selection */}
            <div className="border-b pb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apply Permission Template
                </label>
                <div className="flex items-center space-x-2">
                    <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    >
                        <option value="">Select a template</option>
                        {Object.keys(templates).map(template => (
                            <option key={template} value={template}>
                                {template.charAt(0).toUpperCase() + template.slice(1)}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        disabled={!selectedTemplate}
                        className={`px-3 py-1 rounded-md ${!selectedTemplate ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        onClick={() => handleApplyTemplate(selectedTemplate)}
                    >
                        Apply
                    </button>
                </div>
            </div>

            {/* Permission Sections */}
            <div className="space-y-4">
                {/* Dashboard */}
                <div className="border-b pb-4">
                    <h4 className="font-medium text-gray-800 mb-2">Dashboard</h4>
                    {renderPermissionCheckbox('Access Dashboard', 'dashboard')}
                    {renderPermissionCheckbox('Access Fake Invoices', 'fakeInvoices')}
                </div>

                {/* Inventory */}
                <div className="border-b pb-4">
                    <h4 className="font-medium text-gray-800 mb-2">Inventory Management</h4>
                    {renderPermissionCheckbox('View Inventory Section', 'inventory.view')}
                    {renderPermissionCheckbox('Manage Inventory', 'inventory.manage')}
                </div>

                {/* Financial */}
                <div className="border-b pb-4">
                    <h4 className="font-medium text-gray-800 mb-2">Financial Management</h4>
                    {renderPermissionCheckbox('View Financial Section', 'financial.view')}
                    {/* {renderPermissionCheckbox('Access Financial Details', 'financial.details')} */}
                    {/* {renderPermissionCheckbox('Access Profit & Loss', 'financial.profitLoss')} */}
                    {renderPermissionCheckbox('Access Sales Report', 'financial.salesReport')}
                    {renderPermissionCheckbox('Access Balance Sheet', 'financial.balanceSheet')}
                </div>

                {/* Customers */}
                <div className="border-b pb-4">
                    <h4 className="font-medium text-gray-800 mb-2">Customer Management</h4>
                    {renderPermissionCheckbox('View Customers Section', 'customers.view')}
                    {renderPermissionCheckbox('Customer List', 'customers.list')}
                    {renderPermissionCheckbox('Customer Invoices', 'customers.invoices')}
                    {renderPermissionCheckbox('Generate Customer Invoice', 'customers.generateInvoice')}
                    {renderPermissionCheckbox('Customer Payables', 'customers.payables')}
                </div>

                {/* Vendors */}
                <div className="border-b pb-4">
                    <h4 className="font-medium text-gray-800 mb-2">Vendor Management</h4>
                    {renderPermissionCheckbox('View Vendors Section', 'vendors.view')}
                    {renderPermissionCheckbox('Vendor List', 'vendors.list')}
                    {renderPermissionCheckbox('Vendor Invoices', 'vendors.invoices')}
                    {renderPermissionCheckbox('Generate Vendor Invoice', 'vendors.generateInvoice')}
                    {renderPermissionCheckbox('Vendor Payables', 'vendors.payables')}
                </div>

                {/* Brokers */}
                <div className="border-b pb-4">
                    <h4 className="font-medium text-gray-800 mb-2">Broker Management</h4>
                    {renderPermissionCheckbox('View Brokers Section', 'brokers.view')}
                    {renderPermissionCheckbox('Broker List', 'brokers.list')}
                    {renderPermissionCheckbox('Broker Payments', 'brokers.payments')}
                </div>

                {/* Commissioners */}
                <div className="border-b pb-4">
                    <h4 className="font-medium text-gray-800 mb-2">Commissioner Management</h4>
                    {renderPermissionCheckbox('View Commissioners Section', 'commissioners.view')}
                    {renderPermissionCheckbox('Commissioner List', 'commissioners.list')}
                    {renderPermissionCheckbox('Add Commission Sheet', 'commissioners.addSheet')}
                    {renderPermissionCheckbox('View Commission Sheets', 'commissioners.sheets')}
                </div>

                {/* Settings */}
                <div className="border-b pb-4">
                    <h4 className="font-medium text-gray-800 mb-2">Settings</h4>
                    {renderPermissionCheckbox('View Settings Section', 'settings.view')}
                    {renderPermissionCheckbox('Account Settings', 'settings.account')}
                    {renderPermissionCheckbox('User Management', 'settings.userManagement')}
                    {renderPermissionCheckbox('System Utilities', 'settings.utilities')}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-4">
                <button
                    type="button"
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md mr-2 hover:bg-gray-400"
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    onClick={handleSavePermissions}
                    disabled={loading}
                >
                    {loading ? 'Saving...' : 'Save Permissions'}
                </button>
            </div>
        </div>
    );
};

export default PermissionsManager; 