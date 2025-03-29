import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const Navbar = () => {
    const { user } = useAuth();

    return (
        <nav className="bg-white shadow-md">
            <div className="px-6 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-semibold text-gray-800">Inventory Management System</h1>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-3">
                        <div className="flex flex-col items-end">
                            <span className="text-sm text-gray-500">Logged in as</span>
                            <span className="text-base font-medium text-gray-800">{user?.username}</span>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${user?.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                            }`}>
                            {user?.role === 'admin' ? 'Administrator' : 'Cashier'}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar; 