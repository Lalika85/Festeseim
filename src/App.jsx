import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ProjectsProvider, useProjects } from './hooks/useProjects';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import Login from './features/profile/Login';
import Dashboard from './features/dashboard/Dashboard';
import Projects from './features/projects/Projects';
import ProjectDetail from './features/projects/ProjectDetail';
import ProjectForm from './features/projects/ProjectForm';
import Calendar from './features/calendar/Calendar';
import Settings from './features/settings/Settings';
import QuoteList from './features/quote/QuoteList';
import QuoteEditor from './features/quote/QuoteEditor';
import ShopManager from './features/shop/ShopManager';
import Calculator from './features/calculator/Calculator';
import QuotePreview from './features/quote/QuotePreview';
import QuoteBranding from './features/quote/QuoteBranding';

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
import PinLock from './components/auth/PinLock';
import { localDB } from './services/localDB';

function AppContent() {
    const { currentUser, loading } = useAuth();
    const [isUnlocked, setIsUnlocked] = React.useState(false);
    const [isInitializingSec, setIsInitializingSec] = React.useState(true);
    
    React.useEffect(() => {
        const initSec = async () => {
            if (!localDB.isSecureStorageInitialized) {
                await localDB.initSecureStorage();
            }
            setIsInitializingSec(false);
        };
        initSec();
    }, []);

    // Check if security PIN is enabled
    const hasPin = !!localDB.cachedPin;

    // useNotifications() call removed as it's now handled by NotificationProvider

    if (loading || isInitializingSec) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    // Security Lockdown: If PIN is set and not yet unlocked this session
    if (currentUser && hasPin && !isUnlocked) {
        return <PinLock onUnlock={() => setIsUnlocked(true)} />;
    }

    return (
        <div className="min-h-screen bg-mesh overflow-x-hidden safe-area-inset-top">
            {currentUser && <Header />}

            <main className="view-container">
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


                    {/* Settings - Accessible to all (content restricted inside) */}
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

                    {/* Tools */}
                    <Route path="/quote" element={<ProtectedRoute><QuoteList /></ProtectedRoute>} />
                    <Route path="/quote/new" element={<ProtectedRoute><QuoteEditor /></ProtectedRoute>} />
                    <Route path="/quote/edit/:id" element={<ProtectedRoute><QuoteEditor /></ProtectedRoute>} />
                    <Route path="/quote/preview/:id" element={<ProtectedRoute><QuotePreview /></ProtectedRoute>} />
                    <Route path="/quote/branding" element={<ProtectedRoute><QuoteBranding /></ProtectedRoute>} />
                    <Route path="/shop" element={<ProtectedRoute><ShopManager /></ProtectedRoute>} />
                    <Route path="/calculator" element={<ProtectedRoute><Calculator /></ProtectedRoute>} />


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
                    <SubscriptionProvider>
                        <Router>
                            <AppContent />
                        </Router>
                    </SubscriptionProvider>
                </NotificationProvider>
            </ProjectsProvider>
        </AuthProvider>
    );
}

export default App;
