import React, { useState } from 'react';
const { ipcRenderer } = window.require('electron');

const DatabaseCleanup = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleCleanup = async () => {
        if (!window.confirm('WARNING: This will delete ALL data except user credentials. This action cannot be undone. Are you sure you want to proceed?')) {
            return;
        }

        try {
            setIsLoading(true);
            setResult(null);

            const response = await ipcRenderer.invoke('clean-databases');

            setResult({
                success: response.success,
                message: response.message
            });
        } catch (error) {
            setResult({
                success: false,
                message: `Error cleaning databases: ${error.message}`
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Database Cleanup</h2>
            <div className="space-y-4">
                <p className="text-gray-600">
                    This utility will clean all databases except for user credentials.
                    This is useful for testing purposes or when you want to start fresh while keeping user accounts.
                </p>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={handleCleanup}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-md text-white ${isLoading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                    >
                        {isLoading ? 'Cleaning...' : 'Clean Databases'}
                    </button>
                    {result && (
                        <div className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {result.message}
                        </div>
                    )}
                </div>
                {!isLoading && !result && (
                    <p className="text-sm text-red-600">
                        Warning: This action cannot be undone!
                    </p>
                )}
            </div>
        </div>
    );
};

export default DatabaseCleanup; 