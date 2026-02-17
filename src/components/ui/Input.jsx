import React from 'react';

export default function Input({
    label,
    error,
    type = 'text',
    value,
    onChange,
    placeholder,
    required = false,
    icon,
    className = '',
    ...props
}) {
    return (
        <div className={`mb-4 w-full ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
                    {label} {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        {icon}
                    </div>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400
                        ${icon ? 'pl-10' : ''} 
                        ${error ? 'border-red-500 ring-1 ring-red-500' : 'hover:border-gray-400'}
                    `}
                    {...props}
                />
            </div>
            {error && <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <span>⚠️</span> {error}
            </p>}
        </div>
    );
}
