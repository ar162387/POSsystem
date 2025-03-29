import React, { useState, useEffect, useRef } from 'react';

/**
 * Reusable Searchable Select Component
 * Provides an input with search functionality and dropdown for selecting items
 * 
 * @param {Array} items - Array of items to search and select from
 * @param {String} searchValue - Current search term value
 * @param {Function} onSearchChange - Handler for search term changes
 * @param {Function} onSelect - Handler for item selection
 * @param {Function} getOptionLabel - Function to get display text for option (item => string)
 * @param {Function} getOptionValue - Function to get value for option (item => string|number)
 * @param {String} placeholder - Placeholder text for the input
 * @param {Object} selectedItem - Currently selected item
 * @param {Boolean} required - Whether the field is required
 * @param {String} label - Label text for the input
 * @param {String} error - Error message
 * @param {Array} filteredItems - Filtered items to display (if not computed internally)
 * @param {Boolean} disabled - Whether the input is disabled
 * @param {Function} filterFunction - Custom filter function (items, searchValue) => filteredItems
 */
const SearchableSelect = ({
    items = [],
    searchValue = '',
    onSearchChange,
    onSelect,
    getOptionLabel = (item) => item.name || item.label || item.toString(),
    getOptionValue = (item) => item._id || item.id || item.value,
    placeholder = 'Search...',
    selectedItem = null,
    required = false,
    label = '',
    error = '',
    filteredItems,
    disabled = false,
    filterFunction,
    className = '',
    emptyMessage = 'No results found',
    maxHeight = '250px',
    displayField = null,
    idField = null
}) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [internalFilteredItems, setInternalFilteredItems] = useState([]);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Determine which filtered items to use
    const displayItems = filteredItems || internalFilteredItems;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                inputRef.current && !inputRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Handle internal filtering when not provided externally
    useEffect(() => {
        if (!filteredItems && items && items.length > 0) {
            let filtered;

            if (filterFunction) {
                // Use custom filter function if provided
                filtered = filterFunction(items, searchValue);
            } else {
                // Default filtering logic
                const searchLower = searchValue.toLowerCase();

                filtered = items.filter(item => {
                    const label = getOptionLabel(item).toLowerCase();

                    // If ID field is specified, also search by ID
                    if (idField && item[idField]) {
                        const id = item[idField].toString().toLowerCase();
                        return label.includes(searchLower) || id.includes(searchLower);
                    }

                    return label.includes(searchLower);
                });
            }

            setInternalFilteredItems(filtered);
        }
    }, [items, searchValue, filteredItems, filterFunction, getOptionLabel, idField]);

    // Handle search input change
    const handleSearchChange = (e) => {
        if (onSearchChange) {
            onSearchChange(e);
        }
        setShowDropdown(true);
    };

    // Handle item selection
    const handleSelect = (item) => {
        if (onSelect) {
            onSelect(item);
        }
        setShowDropdown(false);
    };

    return (
        <div className={`relative ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={searchValue}
                    onChange={handleSearchChange}
                    onFocus={() => setShowDropdown(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />

                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <button
                        type="button"
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showDropdown ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
                        </svg>
                    </button>
                </div>
            </div>

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

            {showDropdown && (
                <div
                    ref={dropdownRef}
                    className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg"
                    style={{ maxHeight, overflowY: 'auto' }}
                >
                    {displayItems.length > 0 ? (
                        <ul className="py-1">
                            {displayItems.map((item, index) => {
                                const displayText = getOptionLabel(item);

                                // If a display field is specified, extract extra display info
                                let extraDisplayInfo = '';
                                if (displayField && item[displayField]) {
                                    extraDisplayInfo = ` (${item[displayField]})`;
                                }

                                // If an ID field is specified, add ID info
                                if (idField && item[idField]) {
                                    extraDisplayInfo += extraDisplayInfo ? ` - ID: ${item[idField]}` : ` (ID: ${item[idField]})`;
                                }

                                return (
                                    <li
                                        key={getOptionValue(item) || index}
                                        className="px-3 py-2 hover:bg-blue-100 cursor-pointer text-sm"
                                        onClick={() => handleSelect(item)}
                                    >
                                        <span className="font-medium">{displayText}</span>
                                        {extraDisplayInfo && <span className="text-gray-600">{extraDisplayInfo}</span>}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                            {emptyMessage}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableSelect; 