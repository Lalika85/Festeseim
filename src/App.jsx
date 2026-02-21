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

function AppContent() {
    const { currentUser, isAdmin } = useAuth();
    const { projects } = useProjects();

    // Global notification listener
    useNotifications();

    return (
        <div className="app-container">
            {currentUser && <Header />}

            <main className="main-wrapper">
                <Routes>
                    <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" />} />
                    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

                    {/* Projects - Admin Only */}
                    <Route path="/projects" element={<AdminRoute><Projects /></AdminRoute>} />
                    <Route path="/projects/new" element={<AdminRoute><ProjectForm /></AdminRoute>} />
                    <Route path="/projects/:id" element={<AdminRoute><ProjectDetail /></AdminRoute>} />
                    <Route path="/projects/edit/:id" element={<AdminRoute><ProjectForm isEdit /></AdminRoute>} />

                    {/* Calendar - Admin Only */}
                    <Route path="/calendar" element={<AdminRoute><Calendar /></AdminRoute>} />

                    {/* Profile - Open to all */}
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                    {/* Settings - Accessible to all (content restricted inside) */}
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

                    {/* Tools */}
                    <Route path="/quote" element={<AdminRoute><QuoteList /></AdminRoute>} />
                    <Route path="/quote/new" element={<AdminRoute><QuoteEditor /></AdminRoute>} />
                    <Route path="/quote/edit/:id" element={<AdminRoute><QuoteEditor /></AdminRoute>} />

                    <Route path="/shop" element={<ProtectedRoute><ShopManager /></ProtectedRoute>} />
                    <Route path="/calculator" element={<ProtectedRoute><Calculator /></ProtectedRoute>} />
                    <Route path="/team" element={<AdminRoute><Team /></AdminRoute>} />

                    {/* Public Client View */}
                    <Route path="/quote/view/:userId/:quoteId" element={<ClientQuoteView />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </main>

            {currentUser && <BottomNav />}
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
