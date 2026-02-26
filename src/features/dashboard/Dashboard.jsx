import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import AdminDashboard from './AdminDashboard';

export default function Dashboard() {
    const { currentUser, loading } = useAuth();

    if (loading) {
        return (
            <div className="view-container flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="view-container">
            <AdminDashboard currentUser={currentUser} />
        </div>
    );
}
