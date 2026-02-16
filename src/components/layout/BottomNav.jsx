import React from 'react';
import { NavLink } from 'react-router-dom';

const BottomNav = () => {
    return (
        <nav className="bottom-nav">
            <NavLink to="/" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
                <i className="fas fa-home"></i>
                <span>Kezdőlap</span>
            </NavLink>
            <NavLink to="/projects" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
                <i className="fas fa-tasks"></i>
                <span>Munkák</span>
            </NavLink>
            <NavLink to="/calendar" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
                <i className="fas fa-calendar-alt"></i>
                <span>Naptár</span>
            </NavLink>
            <NavLink to="/shop" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
                <i className="fas fa-shopping-cart"></i>
                <span>Bolt</span>
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
                <i className="fas fa-user"></i>
                <span>Profil</span>
            </NavLink>
        </nav>
    );
};

export default BottomNav;
