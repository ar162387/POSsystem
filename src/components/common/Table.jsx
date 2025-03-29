import React from 'react';

/**
 * Reusable Table Component
 * @param {Array} data - Array of objects to display in the table
 * @param {Array} columns - Array of column configuration objects
 * @param {Function} onRowClick - Optional callback for row click events
 * @param {Array} actions - Array of action objects for the actions column
 * @param {string} emptyMessage - Message to display when there is no data
 * @param {string} className - Additional CSS classes for the table
 * @param {boolean} striped - Whether to apply striped styling to rows
 * @param {boolean} hoverable - Whether rows should have hover styling
 */
const Table = ({
    data = [],
    columns = [],
    onRowClick,
    actions = [],
    emptyMessage = 'No data available',
    className = '',
    striped = true,
    hoverable = true
}) => {
    const hasActions = actions && actions.length > 0;

    if (!data || data.length === 0) {
        return (
            <div className="text-center py-6 text-gray-500">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className={`overflow-x-auto ${className}`}>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map((column, colIndex) => (
                            <th
                                key={column.key || `header-${colIndex}`}
                                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                                style={column.style}
                            >
                                {column.header || column.label || column.title || ''}
                            </th>
                        ))}
                        {hasActions && (
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((item, rowIndex) => (
                        <tr
                            key={item._id || item.id || `row-${rowIndex}-${Date.now()}`}
                            className={`
                ${striped && rowIndex % 2 === 1 ? 'bg-gray-50' : ''}
                ${hoverable ? 'hover:bg-gray-100' : ''}
                ${onRowClick ? 'cursor-pointer' : ''}
              `}
                            onClick={onRowClick ? () => onRowClick(item) : undefined}
                        >
                            {columns.map((column, colIndex) => (
                                <td
                                    key={`${item._id || item.id || rowIndex}-${column.key || colIndex}`}
                                    className={`px-4 py-2 whitespace-nowrap text-sm ${column.cellClassName || ''}`}
                                >
                                    {column.cell ? column.cell(item, rowIndex) : renderCellContent(item, column)}
                                </td>
                            ))}
                            {hasActions && (
                                <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    {actions.map((action, actionIndex) => (
                                        <button
                                            key={`action-${actionIndex}-${rowIndex}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                action.onClick(item);
                                            }}
                                            className={action.className || 'text-blue-600 hover:text-blue-900'}
                                            disabled={action.isDisabled ? action.isDisabled(item) : false}
                                            title={action.tooltip || action.label}
                                        >
                                            {action.icon && (
                                                <span className="mr-1">{action.icon}</span>
                                            )}
                                            {action.label}
                                        </button>
                                    ))}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Helper function to render cell content based on column configuration
const renderCellContent = (item, column) => {
    const value = item[column.key];

    // If a render function is provided, use it
    if (column.render) {
        return column.render(item);
    }

    // If a format function is provided, use it on the value
    if (column.format) {
        return column.format(value, item);
    }

    // For boolean values, render an appropriate indicator
    if (typeof value === 'boolean') {
        return value ? (
            <span className="text-green-600">Yes</span>
        ) : (
            <span className="text-red-600">No</span>
        );
    }

    // For numeric values, check if we should format as currency
    if (typeof value === 'number' && !column.format) {
        if (column.type === 'currency') {
            return new Intl.NumberFormat('en-PK', {
                style: 'currency',
                currency: 'PKR',
                minimumFractionDigits: 2
            }).format(value);
        }
        return value.toFixed(2);
    }

    // For dates, format appropriately
    if (column.isDate && value) {
        try {
            return new Date(value).toLocaleDateString();
        } catch (e) {
            return value;
        }
    }

    // For undefined or null values, show a placeholder
    if (value === undefined || value === null) {
        return <span className="text-gray-400">—</span>;
    }

    // Default: just return the value
    return value;
};

export default Table; 