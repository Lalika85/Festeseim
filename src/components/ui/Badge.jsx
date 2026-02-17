import React from 'react';

export default function Badge({ children, variant = 'info' }) {
    const variants = {
        success: 'badge-success',
        warning: 'badge-warning',
        danger: 'badge-danger',
        info: 'badge-info'
    };

    return (
        <span className={`badge ${variants[variant]}`}>
            {children}
        </span>
    );
}
