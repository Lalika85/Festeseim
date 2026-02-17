import React from 'react';
import { Palette } from 'lucide-react';

export default function Header() {
    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 sticky top-0 z-50">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200">
                    <Palette className="text-white" size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 leading-none">Festőnapló</h1>
                    <p className="text-xs text-gray-500 font-medium tracking-wide">PROFESSZIONÁLIS MUNKAVÉGZÉS</p>
                </div>
            </div>
        </header>
    );
}
