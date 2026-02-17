import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Calendar, Settings } from 'lucide-react';

export default function BottomNav() {
    const navItems = [
        { path: '/', icon: Home, label: 'Főoldal' },
        { path: '/projects', icon: Users, label: 'Ügyfelek' },
        { path: '/calendar', icon: Calendar, label: 'Naptár' },
        { path: '/settings', icon: Settings, label: 'Beállítások' }
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom z-50">
            <div className="flex justify-around items-center h-16">
                {navItems.map(({ path, icon: Icon, label }) => (
                    <NavLink
                        key={path}
                        to={path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive
                                ? 'text-primary-600'
                                : 'text-gray-600 hover:text-gray-900'
                            }`
                        }
                    >
                        <Icon size={24} />
                        <span className="text-xs mt-1">{label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
