import React from 'react';

const ShopItem = ({ item, project, onToggle, onDelete }) => {
    return (
        <div className={`list-item ${item.done ? 'item-done' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div className="check-circle" onClick={onToggle}>
                    <i className="fas fa-check" style={{ fontSize: '12px' }}></i>
                </div>
                <div>
                    <div className="item-text" style={{ fontWeight: 'bold' }}>
                        {item.qty}x {item.text}
                    </div>
                    {(item.code || item.note) && (
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            {item.code} {item.note && `(${item.note})`}
                        </div>
                    )}
                    {project && (
                        <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold', marginTop: '2px' }}>
                            {project.client} {item.room ? ` • ${item.room}` : ''}
                        </div>
                    )}
                </div>
            </div>
            <button className="btn-icon" onClick={onDelete} style={{ color: 'var(--danger)', opacity: 0.3 }}>
                <i className="fas fa-trash"></i>
            </button>
        </div>
    );
};

export default ShopItem;
