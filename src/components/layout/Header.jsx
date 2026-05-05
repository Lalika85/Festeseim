import React from 'react';
import { Palette, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function Header() {
    const { currentUser, userProfile } = useAuth();
    
    // Fallback data
    const displayName = userProfile?.name || currentUser?.displayName || 'Felhasználó';
    const photoURL = userProfile?.logo || null;

    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-3 sticky top-0 z-50 flex items-center justify-between safe-area-inset-top">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 leading-none">Kisvállalkozói Napló</h1>
                    <p className="text-xs text-gray-500 font-medium tracking-wide">PROFESSZIONÁLIS MUNKAVÉGZÉS</p>
                </div>

        </header>
    );
}
