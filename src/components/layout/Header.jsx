import React from 'react';
import { Palette, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function Header() {
    const { currentUser, role } = useAuth();

    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-3 sticky top-0 z-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200">
                    <Palette className="text-white" size={20} />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-gray-900 leading-none">Festőnapló</h1>
                    <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Professzionális</p>
                </div>
            </div>

            {currentUser && (
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-2xl border border-gray-100">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-900 leading-tight truncate max-w-[80px]">
                            {currentUser.displayName || 'Felhasználó'}
                        </p>
                        <span className={`text-[8px] font-black uppercase tracking-tighter ${role === 'admin' ? 'text-amber-600' : 'text-blue-600'}`}>
                            {role === 'admin' ? 'Adminisztrátor' : 'Munkatárs'}
                        </span>
                    </div>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white shadow-sm ${role === 'admin' ? 'bg-amber-500' : 'bg-blue-500'}`}>
                        <User size={14} />
                    </div>
                </div>
            )}
        </header>
    );
}
