import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import AdminDashboard from './AdminDashboard';
import EmployeeDashboard from './EmployeeDashboard';

export default function Dashboard() {
    const { currentUser, isAdmin, isEmployee, loading } = useAuth();

    if (loading) {
        return (
            <div className="view-container flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="view-container">
            {isAdmin ? (
                <AdminDashboard currentUser={currentUser} />
            ) : (
                <EmployeeDashboard currentUser={currentUser} />
            )}
        </div>
    );
}
