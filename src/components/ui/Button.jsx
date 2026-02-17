import React from 'react';

export default function Button({
    children,
    variant = 'primary',
    icon,
    onClick,
    type = 'button',
    disabled = false,
    loading = false,
    className = ''
}) {
    const variants = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        danger: 'btn-danger',
        ghost: 'btn-ghost',
        icon: 'btn-icon'
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`btn ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
            {loading ? (
                <span className="animate-spin">⏳</span>
            ) : (
                <>
                    {icon && <span>{icon}</span>}
                    {children}
                </>
            )}
        </button>
    );
}
