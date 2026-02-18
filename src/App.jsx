import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ProjectsProvider } from './hooks/useProjects';
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

const ProtectedRoute = ({ children }) => {
    const { currentUser } = useAuth();
    if (!currentUser) return <Navigate to="/login" />;
    return children;
};

function AppContent() {
    const { currentUser } = useAuth();

    return (
        <div className="app-container">
            {currentUser && <Header />}

            <main className="main-wrapper">
                <Routes>
                    <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" />} />
                    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

                    {/* Projects */}
                    <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                    <Route path="/projects/new" element={<ProtectedRoute><ProjectForm /></ProtectedRoute>} />
                    <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
                    <Route path="/projects/edit/:id" element={<ProtectedRoute><ProjectForm isEdit /></ProtectedRoute>} />

                    {/* Calendar */}
                    <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />

                    {/* Profile */}
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                    {/* Settings */}
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

                    {/* Tools */}
                    <Route path="/quote" element={<ProtectedRoute><QuoteList /></ProtectedRoute>} />
                    <Route path="/quote/new" element={<ProtectedRoute><QuoteEditor /></ProtectedRoute>} />
                    <Route path="/quote/edit/:id" element={<ProtectedRoute><QuoteEditor /></ProtectedRoute>} />
                    <Route path="/shop" element={<ProtectedRoute><ShopManager /></ProtectedRoute>} />

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
                <Router>
                    <AppContent />
                </Router>
            </ProjectsProvider>
        </AuthProvider>
    );
}

export default App;
