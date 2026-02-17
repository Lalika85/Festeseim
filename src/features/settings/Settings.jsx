import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { LogOut, User, Bell, Info } from 'lucide-react';

export default function Settings() {
    const { currentUser, logout } = useAuth();

    return (
        <div className="view-container">
            <h1 className="text-2xl font-bold mb-6">Beállítások</h1>

            <Card header="Fiók">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="text-primary-600" size={24} />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">{currentUser?.email}</p>
                        <p className="text-sm text-gray-500">Bejelentkezett felhasználó</p>
                    </div>
                </div>
                <Button variant="danger" icon={<LogOut size={20} />} onClick={logout} className="w-full">
                    Kijelentkezés
                </Button>
            </Card>

            <Card header="Értesítések">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <Bell size={20} className="text-gray-600" />
                        <span className="text-gray-900">Push értesítések</span>
                    </div>
                    <input type="checkbox" className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-500">Értesítések a közelgő munkákról</p>
            </Card>

            <Card header="Alkalmazás info">
                <div className="flex items-center gap-3 text-gray-600">
                    <Info size={20} />
                    <div>
                        <p className="font-medium text-gray-900">Festőnapló</p>
                        <p className="text-sm text-gray-500">Verzió 6.0.0</p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
