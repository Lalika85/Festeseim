import React from 'react';

export default function Card({ children, className = '', header, footer }) {
    return (
        <div className={`card ${className}`}>
            {header && <div className="card-header">{header}</div>}
            <div>{children}</div>
            {footer && <div className="mt-4 pt-4 border-t border-gray-200">{footer}</div>}
        </div>
    );
}
