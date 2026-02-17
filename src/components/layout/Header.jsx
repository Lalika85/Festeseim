import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';

export default function Header() {
    const { logout } = useAuth();

    return (
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
            <h1 className="text-xl font-bold text-primary-600">Festőnapló</h1>
            <Button variant="ghost" icon={<LogOut size={20} />} onClick={logout}>
                Kijelentkezés
            </Button>
        </header>
    );
}
