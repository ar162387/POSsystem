import React from 'react';
import DatabaseCleanup from '../../components/settings/DatabaseCleanup';

const SystemUtilities = () => {
    return (
        <div className="container mx-auto px-4 py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">System Utilities</h1>
                <p className="text-gray-600">Advanced system maintenance and utilities</p>
            </div>

            <div className="space-y-6">
                <DatabaseCleanup />

                {/* Add more utility components here in the future */}
            </div>
        </div>
    );
};

export default SystemUtilities; 