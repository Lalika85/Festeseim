import React from 'react';

export default function Input({
    label,
    error,
    type = 'text',
    value,
    onChange,
    placeholder,
    required = false,
    ...props
}) {
    return (
        <div className="mb-4">
            {label && (
                <label className="input-label">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`input ${error ? 'border-red-500' : ''}`}
                {...props}
            />
            {error && <p className="input-error">{error}</p>}
        </div>
    );
}
