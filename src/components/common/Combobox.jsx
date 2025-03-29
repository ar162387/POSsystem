import React, { useState, useRef, useEffect } from 'react';

const Combobox = ({
    options,
    value,
    onChange,
    getDisplayValue,
    placeholder,
    className = '',
    disabled = false,
    onInputChange,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [filteredOptions, setFilteredOptions] = useState(options);
    const wrapperRef = useRef(null);

    useEffect(() => {
        // Set initial input value based on selected value
        if (value) {
            setInputValue(getDisplayValue(value));
        }
    }, [value, getDisplayValue]);

    useEffect(() => {
        // Filter options based on input
        const filtered = options.filter(option =>
            getDisplayValue(option)
                .toLowerCase()
                .includes(inputValue.toLowerCase())
        );
        setFilteredOptions(filtered);
    }, [inputValue, options, getDisplayValue]);

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setIsOpen(true);
        if (onInputChange) {
            onInputChange(newValue);
        }
    };

    const handleOptionSelect = (option) => {
        onChange(option);
        setInputValue(getDisplayValue(option));
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className={`w-full border rounded p-2 ${className}`}
                disabled={disabled}
            />
            {isOpen && filteredOptions.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredOptions.map((option, index) => (
                        <li
                            key={index}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleOptionSelect(option)}
                        >
                            {getDisplayValue(option)}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Combobox; 