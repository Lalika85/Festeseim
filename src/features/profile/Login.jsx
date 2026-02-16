import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, register } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) return setError('Email és jelszó kötelező!');
        try {
            setError('');
            setLoading(true);
            await login(email, password);
        } catch (err) {
            setError('Hiba: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!email || !password) return setError('Email és jelszó kötelező!');
        if (password.length < 6) return setError('A jelszó legalább 6 karakter legyen!');
        try {
            setError('');
            setLoading(true);
            await register(email, password);
        } catch (err) {
            setError('Hiba: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div id="login-screen">
            <div className="login-card">
                <div className="brand-logo">
                    <i className="fas fa-paint-roller"></i>
                </div>
                <h2>Painter's Log</h2>
                <p>Vállalkozói napló és árajánlatkészítő</p>

                {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

                <form onSubmit={handleLogin}>
                    <input
                        type="email"
                        placeholder="Email cím"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Jelszó"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button type="submit" className="btn btn-primary full-width" disabled={loading}>
                        {loading ? 'Folyamatban...' : 'Bejelentkezés'}
                    </button>

                    <button type="button" className="btn btn-text full-width mt-2" onClick={handleRegister} disabled={loading}>
                        Regisztráció
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
