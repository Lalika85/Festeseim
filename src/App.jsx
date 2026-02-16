import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import Login from './features/profile/Login';
import Dashboard from './features/dashboard/Dashboard';
import Projects from './features/projects/Projects';
import ProjectDetail from './features/projects/ProjectDetail';
import ProjectForm from './features/projects/ProjectForm';
import Shop from './features/shop/Shop';
import Calendar from './features/calendar/Calendar';
import Profile from './features/profile/Profile';
import Quote from './features/quote/Quote';
import QuoteForm from './features/quote/QuoteForm';
import Calculator from './features/dashboard/Calculator';

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

                    {/* Shop */}
                    <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />

                    {/* Calendar */}
                    <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />

                    {/* Profile */}
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                    {/* Quote */}
                    <Route path="/quote" element={<ProtectedRoute><Quote /></ProtectedRoute>} />
                    <Route path="/quote/new" element={<ProtectedRoute><QuoteForm /></ProtectedRoute>} />
                    <Route path="/quote/edit/:id" element={<ProtectedRoute><QuoteForm isEdit /></ProtectedRoute>} />

                    {/* Tools */}
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
            <Router>
                <AppContent />
            </Router>
        </AuthProvider>
    );
}

export default App;
