import React from 'react';

export default function Card({ children, className = '', header, title, icon, footer, id, ...props }) {
    const cardHeader = header || (title || icon ? (
        <div className="flex items-center gap-3">
            {icon && <span className="shrink-0">{icon}</span>}
            {title && <h3 className="text-lg font-bold text-gray-800">{title}</h3>}
        </div>
    ) : null);

    return (
        <div id={id} className={`card ${className}`} {...props}>
            {cardHeader && <div className="card-header">{cardHeader}</div>}
            <div className="p-4">{children}</div>
            {footer && <div className="mt-4 pt-4 border-t border-gray-200 p-4">{footer}</div>}
        </div>
    );
}
