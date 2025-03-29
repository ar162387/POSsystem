import React from 'react';

/**
 * Reusable Input Component
 * @param {string} type - Input type (text, number, email, etc.)
 * @param {string} id - Input id
 * @param {string} name - Input name
 * @param {any} value - Input value
 * @param {function} onChange - Change handler
 * @param {string} label - Input label
 * @param {string} placeholder - Input placeholder
 * @param {boolean} required - Whether the field is required
 * @param {string} error - Error message for the input
 * @param {boolean} disabled - Whether the input is disabled
 * @param {object} props - Additional props for the input
 */
export const Input = ({
    type = 'text',
    id,
    name,
    value,
    onChange,
    label,
    placeholder,
    required = false,
    error,
    disabled = false,
    className = '',
    ...props
}) => {
    return (
        <div className="mb-4">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <input
                type={type}
                id={id}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
                required={required}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
};

/**
 * Reusable Select Component
 * @param {string} id - Select id
 * @param {string} name - Select name
 * @param {any} value - Select value
 * @param {function} onChange - Change handler
 * @param {array} options - Array of options for the select
 * @param {string} label - Select label
 * @param {string} placeholder - Select placeholder
 * @param {boolean} required - Whether the field is required
 * @param {string} error - Error message for the select
 * @param {boolean} disabled - Whether the select is disabled
 * @param {object} props - Additional props for the select
 */
export const Select = ({
    id,
    name,
    value,
    onChange,
    options = [],
    label,
    placeholder = 'Select an option',
    required = false,
    error,
    disabled = false,
    className = '',
    ...props
}) => {
    return (
        <div className="mb-4">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <select
                id={id}
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
                required={required}
                {...props}
            >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
};

/**
 * Reusable TextArea Component
 * @param {string} id - TextArea id
 * @param {string} name - TextArea name
 * @param {any} value - TextArea value
 * @param {function} onChange - Change handler
 * @param {string} label - TextArea label
 * @param {string} placeholder - TextArea placeholder
 * @param {boolean} required - Whether the field is required
 * @param {string} error - Error message for the textarea
 * @param {boolean} disabled - Whether the textarea is disabled
 * @param {number} rows - Number of rows for the textarea
 * @param {object} props - Additional props for the textarea
 */
export const TextArea = ({
    id,
    name,
    value,
    onChange,
    label,
    placeholder,
    required = false,
    error,
    disabled = false,
    rows = 4,
    className = '',
    ...props
}) => {
    return (
        <div className="mb-4">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <textarea
                id={id}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={rows}
                disabled={disabled}
                className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
                required={required}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
};

/**
 * Reusable Checkbox Component
 * @param {string} id - Checkbox id
 * @param {string} name - Checkbox name
 * @param {boolean} checked - Whether the checkbox is checked
 * @param {function} onChange - Change handler
 * @param {string} label - Checkbox label
 * @param {string} error - Error message for the checkbox
 * @param {boolean} disabled - Whether the checkbox is disabled
 * @param {object} props - Additional props for the checkbox
 */
export const Checkbox = ({
    id,
    name,
    checked,
    onChange,
    label,
    error,
    disabled = false,
    className = '',
    ...props
}) => {
    return (
        <div className="mb-4 flex items-center">
            <input
                type="checkbox"
                id={id}
                name={name}
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
                {...props}
            />
            {label && (
                <label htmlFor={id} className="ml-2 block text-sm text-gray-700">
                    {label}
                </label>
            )}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
};

/**
 * Reusable alert component
 * @param {string} type - Alert type (success, error, warning, info)
 * @param {string} message - Alert message
 * @param {function} onClose - Close handler
 * @param {boolean} showCloseButton - Whether to show the close button
 */
export const Alert = ({
    type = 'info',
    message,
    onClose,
    showCloseButton = true,
    className = '',
}) => {
    if (!message) return null;

    const alertClasses = {
        success: 'bg-green-100 text-green-700 border-green-200',
        error: 'bg-red-100 text-red-700 border-red-200',
        warning: 'bg-amber-100 text-amber-700 border-amber-200',
        info: 'bg-blue-100 text-blue-700 border-blue-200',
    };

    return (
        <div className={`mb-4 p-3 rounded-md border ${alertClasses[type]} flex justify-between items-start ${className}`}>
            <div className="flex-1">{message}</div>
            {showCloseButton && onClose && (
                <button
                    onClick={onClose}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                    aria-label="Close"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
};

/**
 * Form component with standardized styling
 */
export const Form = ({
    onSubmit,
    children,
    className = '',
    ...props
}) => {
    return (
        <form
            onSubmit={onSubmit}
            className={`space-y-4 ${className}`}
            {...props}
        >
            {children}
        </form>
    );
};

/**
 * Form section component for grouping form elements
 */
export const FormSection = ({
    title,
    description,
    children,
    className = '',
}) => {
    return (
        <div className={`border border-gray-200 rounded-md p-4 ${className}`}>
            {title && <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>}
            {description && <p className="mb-3 text-sm text-gray-500">{description}</p>}
            <div className="space-y-4">
                {children}
            </div>
        </div>
    );
};

/**
 * Submit button component with standardized styling
 */
export const SubmitButton = ({
    children,
    loading = false,
    disabled = false,
    className = '',
    ...props
}) => {
    return (
        <button
            type="submit"
            disabled={disabled || loading}
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed ${className}`}
            {...props}
        >
            {loading ? (
                <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                </span>
            ) : (
                children
            )}
        </button>
    );
};

/**
 * Button component with standardized styling
 */
export const Button = ({
    type = 'button',
    variant = 'primary',
    size = 'md',
    children,
    className = '',
    isLoading = false,
    ...props
}) => {
    const variantClasses = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        success: 'bg-green-600 text-white hover:bg-green-700',
        outline: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    };

    const sizeClasses = {
        sm: 'px-2 py-1 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg',
    };

    return (
        <button
            type={type}
            disabled={isLoading}
            className={`rounded-md ${variantClasses[variant]} ${sizeClasses[size]} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            {...props}
        >
            {isLoading ? (
                <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                </span>
            ) : (
                children
            )}
        </button>
    );
}; 