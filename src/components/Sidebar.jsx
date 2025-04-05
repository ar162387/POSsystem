import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Sidebar = ({ collapsed, toggleSidebar }) => {
    const { user, logout, canView, hasPermission } = useAuth();
    const location = useLocation();
    const [expandedItems, setExpandedItems] = useState({
        inventory: false,
        financial: false,
        customers: false,
        vendors: false,
        brokers: false,
        commissioners: false,
        profitLoss: false,
        salesReport: false
    });

    const toggleExpand = (section) => {
        setExpandedItems(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Check if a path is active
    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(`${path}/`);
    };

    // Get the active item class
    const activeClass = 'bg-blue-700 text-white';
    const inactiveClass = 'text-gray-300 hover:bg-gray-700 hover:text-white';

    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

    const toggleProfileDropdown = () => {
        setProfileDropdownOpen(!profileDropdownOpen);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                {!collapsed && <h1 className="text-xl font-semibold">Inventory System</h1>}
                <button
                    className="text-gray-300 hover:text-white"
                    onClick={toggleSidebar}
                >
                    {collapsed ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 overflow-y-auto py-4 px-2">
                <ul className="space-y-1">
                    {/* Dashboard - Always visible */}
                    {(hasPermission('dashboard') || user?.role === 'admin') && (
                        <li>
                            <Link
                                to="/"
                                className={`flex items-center p-2 rounded-md ${isActive('/') ? activeClass : inactiveClass}`}
                            >
                                <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                {!collapsed && <span>Dashboard</span>}
                            </Link>
                        </li>
                    )}

                    {/* Fake Invoices - Always visible */}
                    {(hasPermission('dashboard') || user?.role === 'admin') && (
                        <li>
                            <Link
                                to="/fake-invoices"
                                className={`flex items-center p-2 rounded-md ${isActive('/fake-invoices') ? activeClass : inactiveClass}`}
                            >
                                <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {!collapsed && <span>Fake Invoices</span>}
                            </Link>
                        </li>
                    )}

                    {/* Inventory Management */}
                    {canView('inventory') && (
                        <li>
                            <button
                                onClick={() => toggleExpand('inventory')}
                                className={`w-full flex items-center justify-between p-2 rounded-md ${isActive('/inventory') ? activeClass : inactiveClass}`}
                            >
                                <div className="flex items-center">
                                    <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                    {!collapsed && <span>Inventory</span>}
                                </div>
                                {!collapsed && (
                                    <svg className={`w-4 h-4 transition-transform duration-200 ${expandedItems.inventory ? 'transform rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                            </button>
                            {expandedItems.inventory && !collapsed && (
                                <ul className="pl-10 mt-1 space-y-1">
                                    <li>
                                        <Link
                                            to="/inventory"
                                            className={`block p-2 rounded-md ${location.pathname === '/inventory' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            Manage Inventory
                                        </Link>
                                    </li>
                                </ul>
                            )}
                        </li>
                    )}

                    {/* Financial Management */}
                    {canView('financial') && (
                        <li>
                            <button
                                onClick={() => toggleExpand('financial')}
                                className={`w-full flex items-center justify-between p-2 rounded-md ${isActive('/financial') ? activeClass : inactiveClass}`}
                            >
                                <div className="flex items-center">
                                    <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {!collapsed && <span>Financial</span>}
                                </div>
                                {!collapsed && (
                                    <svg className={`w-4 h-4 transition-transform duration-200 ${expandedItems.financial ? 'transform rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                            </button>
                            {expandedItems.financial && !collapsed && (
                                <ul className="pl-10 mt-1 space-y-1">
                                    {/* {hasPermission('financial.details') && (
                                        <li>
                                            <Link
                                                to="/financial/details"
                                                className={`block p-2 rounded-md ${location.pathname === '/financial/details' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                            >
                                                Financial Details
                                            </Link>
                                        </li>
                                    )}
                                    {hasPermission('financial.profitLoss') && (
                                        <li>
                                            <Link
                                                to="/financial/profit-loss"
                                                className={`block p-2 rounded-md ${location.pathname === '/financial/profit-loss' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                            >
                                                Profit & Loss
                                            </Link>
                                        </li>
                                    )} */}
                                    {hasPermission('financial.salesReport') && (
                                        <li>
                                            <Link
                                                to="/financial/sales-report"
                                                className={`block p-2 rounded-md ${location.pathname === '/financial/sales-report' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                            >
                                                Sales Report
                                            </Link>
                                        </li>
                                    )}
                                    {user?.role === 'admin' && (
                                        <Link
                                            to="/financial/balance-sheet"
                                            className={`block p-2 rounded-md ${location.pathname === '/financial/balance-sheet' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            Balance Sheet
                                        </Link>
                                    )}
                                </ul>
                            )}
                        </li>
                    )}

                    {/* Customer Management */}
                    {canView('customers') && (
                        <li>
                            <button
                                onClick={() => toggleExpand('customers')}
                                className={`w-full flex items-center justify-between p-2 rounded-md ${isActive('/customers') ? activeClass : inactiveClass}`}
                            >
                                <div className="flex items-center">
                                    <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    {!collapsed && <span>Customers</span>}
                                </div>
                                {!collapsed && (
                                    <svg className={`w-4 h-4 transition-transform duration-200 ${expandedItems.customers ? 'transform rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                            </button>
                            {expandedItems.customers && !collapsed && (
                                <div className="mt-1 pl-6 space-y-1">
                                    {hasPermission('customers.list') && (
                                        <Link
                                            to="/customers/list"
                                            className={`block p-2 rounded-md ${location.pathname === '/customers/list' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            List Customers
                                        </Link>
                                    )}
                                    {hasPermission('customers.invoices') && (
                                        <Link
                                            to="/customers/invoices"
                                            className={`block p-2 rounded-md ${location.pathname === '/customers/invoices' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            Customer Invoices
                                        </Link>
                                    )}
                                    {hasPermission('customers.invoices') && (
                                        <Link
                                            to="/customers/invoice"
                                            className={`block p-2 rounded-md ${location.pathname === '/customers/invoice' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            Generate Customer Invoice
                                        </Link>
                                    )}
                                    {hasPermission('customers.payables') && (
                                        <Link
                                            to="/customers/payables"
                                            className={`block p-2 rounded-md ${location.pathname === '/customers/payables' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            Customer Payables
                                        </Link>
                                    )}
                                </div>
                            )}
                        </li>
                    )}

                    {/* Vendor Management */}
                    {canView('vendors') && (
                        <li>
                            <button
                                onClick={() => toggleExpand('vendors')}
                                className={`w-full flex items-center justify-between p-2 rounded-md ${isActive('/vendors') ? activeClass : inactiveClass}`}
                            >
                                <div className="flex items-center">
                                    <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    {!collapsed && <span>Vendors</span>}
                                </div>
                                {!collapsed && (
                                    <svg className={`w-4 h-4 transition-transform duration-200 ${expandedItems.vendors ? 'transform rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                            </button>
                            {expandedItems.vendors && !collapsed && (
                                <div className="mt-1 pl-6 space-y-1">
                                    {hasPermission('vendors.list') && (
                                        <Link
                                            to="/vendors/list"
                                            className={`block p-2 rounded-md ${location.pathname === '/vendors/list' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            List Vendors
                                        </Link>
                                    )}
                                    {hasPermission('vendors.invoices') && (
                                        <Link
                                            to="/vendors/invoices"
                                            className={`block p-2 rounded-md ${location.pathname === '/vendors/invoices' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            Vendor Invoices
                                        </Link>
                                    )}
                                    {hasPermission('vendors.invoices') && (
                                        <Link
                                            to="/vendors/generate"
                                            className={`block p-2 rounded-md ${location.pathname === '/vendors/generate' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            Generate Vendor Invoice
                                        </Link>
                                    )}
                                    {hasPermission('vendors.payables') && (
                                        <Link
                                            to="/vendors/payables"
                                            className={`block p-2 rounded-md ${location.pathname === '/vendors/payables' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            Vendor Payables
                                        </Link>
                                    )}
                                </div>
                            )}
                        </li>
                    )}

                    {/* Broker Management */}
                    {canView('brokers') && (
                        <li>
                            <button
                                onClick={() => toggleExpand('brokers')}
                                className={`w-full flex items-center justify-between p-2 rounded-md ${isActive('/brokers') ? activeClass : inactiveClass}`}
                            >
                                <div className="flex items-center">
                                    <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {!collapsed && <span>Brokers</span>}
                                </div>
                                {!collapsed && (
                                    <svg className={`w-4 h-4 transition-transform duration-200 ${expandedItems.brokers ? 'transform rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                            </button>
                            {expandedItems.brokers && !collapsed && (
                                <div className="mt-1 pl-6 space-y-1">
                                    {hasPermission('brokers.list') && (
                                        <Link
                                            to="/brokers/list"
                                            className={`block p-2 rounded-md ${location.pathname === '/brokers/list' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            List Brokers
                                        </Link>
                                    )}
                                    {hasPermission('brokers.payments') && (
                                        <Link
                                            to="/brokers/payments"
                                            className={`block p-2 rounded-md ${location.pathname === '/brokers/payments' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            Broker Payments
                                        </Link>
                                    )}
                                </div>
                            )}
                        </li>
                    )}

                    {/* Commissioner Management */}
                    {canView('commissioners') && (
                        <li>
                            <button
                                onClick={() => toggleExpand('commissioners')}
                                className={`w-full flex items-center justify-between p-2 rounded-md ${isActive('/commissioners') ? activeClass : inactiveClass}`}
                            >
                                <div className="flex items-center">
                                    <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                    {!collapsed && <span>Commissioners</span>}
                                </div>
                                {!collapsed && (
                                    <svg className={`w-4 h-4 transition-transform duration-200 ${expandedItems.commissioners ? 'transform rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                            </button>
                            {expandedItems.commissioners && !collapsed && (
                                <div className="mt-1 pl-6 space-y-1">
                                    {hasPermission('commissioners.list') && (
                                        <Link
                                            to="/commissioners/list"
                                            className={`block p-2 rounded-md ${location.pathname === '/commissioners/list' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            List Commissioners
                                        </Link>
                                    )}
                                    {hasPermission('commissioners.addSheet') && (
                                        <Link
                                            to="/commissioners/add-sheet"
                                            className={`block p-2 rounded-md ${location.pathname === '/commissioners/add-sheet' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            Add Commission Sheet
                                        </Link>
                                    )}
                                    {hasPermission('commissioners.sheets') && (
                                        <Link
                                            to="/commissioners/sheets"
                                            className={`block p-2 rounded-md ${location.pathname === '/commissioners/sheets' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            Commission Sheets
                                        </Link>
                                    )}
                                </div>
                            )}
                        </li>
                    )}

                    {/* Settings */}
                    {hasPermission('settings.view') && (
                        <li>
                            <button
                                onClick={() => toggleExpand('settings')}
                                className={`w-full flex items-center justify-between p-2 rounded-md ${isActive('/settings') ? activeClass : inactiveClass}`}
                            >
                                <div className="flex items-center">
                                    <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {!collapsed && <span>Settings</span>}
                                </div>
                                {!collapsed && (
                                    <svg className={`w-4 h-4 transition-transform duration-200 ${expandedItems.settings ? 'transform rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                            </button>
                            {expandedItems.settings && !collapsed && (
                                <div className="mt-1 pl-6 space-y-1">
                                    {hasPermission('settings.account') && (
                                        <Link
                                            to="/settings/account"
                                            className={`block p-2 rounded-md ${location.pathname === '/settings/account' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            Account Settings
                                        </Link>
                                    )}
                                    {(hasPermission('settings.userManagement') || user?.role === 'admin') && (
                                        <Link
                                            to="/settings/users"
                                            className={`block p-2 rounded-md ${location.pathname === '/settings/users' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            User Management
                                        </Link>
                                    )}
                                    {user?.role === 'admin' && (
                                        <Link
                                            to="/settings/utilities"
                                            className={`block p-2 rounded-md ${location.pathname === '/settings/utilities' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        >
                                            System Utilities
                                        </Link>
                                    )}
                                </div>
                            )}
                        </li>
                    )}
                </ul>
            </nav>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-gray-700">
                <button
                    onClick={logout}
                    className="w-full flex items-center p-2 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                    <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar; 