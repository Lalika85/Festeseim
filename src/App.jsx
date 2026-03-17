import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ProjectsProvider, useProjects } from './hooks/useProjects';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import Login from './features/profile/Login';
import Dashboard from './features/dashboard/Dashboard';
import Projects from './features/projects/Projects';
import ProjectDetail from './features/projects/ProjectDetail';
import ProjectForm from './features/projects/ProjectForm';
import Calendar from './features/calendar/Calendar';
import Profile from './features/profile/Profile';
import Settings from './features/settings/Settings';
import QuoteList from './features/quote/QuoteList';
import QuoteEditor from './features/quote/QuoteEditor';
import ClientQuoteView from './features/quote/ClientQuoteView';
import ShopManager from './features/shop/ShopManager';
import Calculator from './features/calculator/Calculator';
import Team from './features/team/Team';

const ProtectedRoute = ({ children }) => {
    const { currentUser, loading } = useAuth();
    if (loading) return null;
    if (!currentUser) return <Navigate to="/login" />;
    return children;
};

const AdminRoute = ({ children }) => {
    const { isAdmin, loading } = useAuth();
    if (loading) return null;
    if (!isAdmin) return <Navigate to="/" />;
    return children;
};

import { useLocation } from 'react-router-dom';

function AppContent() {
    const { currentUser, loading } = useAuth();
    const location = useLocation();
    const isPublicQuoteView = location.pathname.includes('/quote/view/');

    // useNotifications should not be called if not authenticated or in public view ideally,
    // but its own logic handles internal guards.
    useNotifications();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-mesh overflow-x-hidden">
            {!isPublicQuoteView && currentUser && <Header />}

            <main className={!isPublicQuoteView ? 'view-container' : ''}>
                <Routes>
                    <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" />} />
                    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

                    {/* Projects - Open to all members */}
                    <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                    <Route path="/projects/new" element={<ProtectedRoute><ProjectForm /></ProtectedRoute>} />
                    <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
                    <Route path="/projects/edit/:id" element={<ProtectedRoute><ProjectForm isEdit /></ProtectedRoute>} />

                    {/* Calendar - Open to all members */}
                    <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />

                    {/* Profile - Open to all members */}
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                    {/* Settings - Accessible to all (content restricted inside) */}
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

                    {/* Tools */}
                    <Route path="/quote" element={<ProtectedRoute><QuoteList /></ProtectedRoute>} />
                    <Route path="/quote/new" element={<ProtectedRoute><QuoteEditor /></ProtectedRoute>} />
                    <Route path="/quote/edit/:id" element={<ProtectedRoute><QuoteEditor /></ProtectedRoute>} />

                    <Route path="/shop" element={<ProtectedRoute><ShopManager /></ProtectedRoute>} />
                    <Route path="/calculator" element={<ProtectedRoute><Calculator /></ProtectedRoute>} />
                    <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />

                    {/* Public Client View */}
                    <Route path="/quote/view/:userId/:quoteId" element={<ClientQuoteView />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </main>

            {!isPublicQuoteView && currentUser && <BottomNav />}
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <ProjectsProvider>
                <NotificationProvider>
                    <Router>
                        <AppContent />
                    </Router>
                </NotificationProvider>
            </ProjectsProvider>
        </AuthProvider>
    );
}

export default App;
