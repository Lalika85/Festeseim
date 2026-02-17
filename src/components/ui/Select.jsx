import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function Select({
    label,
    error,
    value,
    onChange,
    options = [],
    placeholder,
    required = false,
    icon,
    className = '',
    name,
    disabled = false,
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
                <select
                    name={name}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-gray-900 appearance-none
                        ${icon ? 'pl-10' : ''} 
                        ${error ? 'border-red-500 ring-1 ring-red-500' : 'hover:border-gray-400'}
                        ${disabled ? 'bg-gray-100 opacity-60 cursor-not-allowed' : ''}
                    `}
                    {...props}
                >
                    {placeholder && <option value="" disabled>{placeholder}</option>}
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">
                    <ChevronDown size={16} />
                </div>
            </div>
            {error && <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <span>⚠️</span> {error}
            </p>}
        </div>
    );
}
