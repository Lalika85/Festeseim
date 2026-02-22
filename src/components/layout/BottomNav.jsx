import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Calendar, Settings, User, ShoppingBag, Calculator } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function BottomNav() {
    const { isAdmin, isEmployee } = useAuth();

    const navItems = isAdmin ? [
        { path: '/', icon: Home, label: 'Főoldal' },
        { path: '/projects', icon: Users, label: 'Ügyfelek' },
        { path: '/calendar', icon: Calendar, label: 'Naptár' },
        { path: '/profile', icon: User, label: 'Profil' }
    ] : [
        { path: '/', icon: Briefcase, label: 'Feladatok' },
        { path: '/shop', icon: ShoppingBag, label: 'Bolt' },
        { path: '/calculator', icon: Calculator, label: 'Kalkulátor' },
        { path: '/profile', icon: User, label: 'Profil' }
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom z-50 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)]">
            <div className="flex justify-around items-center h-16">
                {navItems.map(({ path, icon: Icon, label }) => (
                    <NavLink
                        key={path}
                        to={path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${isActive
                                ? 'text-primary-600'
                                : 'text-gray-400 hover:text-gray-600'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-primary-50' : ''}`}>
                                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className={`text-[10px] font-bold mt-1 uppercase tracking-tighter ${isActive ? 'text-primary-600' : 'text-gray-400'}`}>
                                    {label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
