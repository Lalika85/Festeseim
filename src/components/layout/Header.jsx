import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const Header = () => {
    const { currentUser, logout } = useAuth();

    return (
        <header className="app-header">
            <div className="header-content">
                <div id="user-display">{currentUser?.email}</div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <button className="btn-icon" onClick={() => { }}>
                        <i className="fas fa-bars"></i>
                    </button>
                    <button id="header-logout-btn" className="btn-icon" onClick={logout}>
                        <i className="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
