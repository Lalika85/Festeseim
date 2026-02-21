import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ToastProvider } from './hooks/useToast';

// Egyszerű hibakezelő komponens
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("Kritikus hiba:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', background: '#fff1f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', margin: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Hoppá! Hiba történt a betöltéskor.</h2>
                    <p style={{ fontSize: '14px' }}>{this.state.error?.toString()}</p>
                    <button onClick={() => window.location.reload()} style={{ marginTop: '10px', padding: '8px 16px', background: '#991b1b', color: 'white', border: 'none', borderRadius: '4px' }}>
                        Oldal újratöltése
                    </button>
                    <div style={{ marginTop: '20px', fontSize: '12px', color: '#6b7280' }}>
                        Tipp: Nézd meg a böngésző konzolt (F12) a részletekért.
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <ToastProvider>
                <App />
            </ToastProvider>
        </ErrorBoundary>
    </React.StrictMode>,
);
