import React, { useState } from 'react';
import { PaintRoller, Mail, Lock, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const { login, register } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) return setError('Minden mező kitöltése kötelező!');
        if (!isLogin && password.length < 6) return setError('A jelszó legalább 6 karakter legyen!');

        try {
            setError('');
            setLoading(true);
            if (isLogin) {
                await login(email, password);
            } else {
                await register(email, password);
            }
        } catch (err) {
            setError('Hiba: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
            <Card className="w-full max-w-md !p-8 shadow-2xl border-0">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <PaintRoller className="text-primary-600" size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Festőnapló</h1>
                    <p className="text-gray-500 mt-1">Vállalkozói adminisztráció egyszerűen</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 flex items-center">
                        <span className="mr-2">⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4">
                        <Input
                            label="Email cím"
                            icon={<Mail size={18} />}
                            type="email"
                            placeholder="pelda@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="text-lg"
                        />
                        <Input
                            label="Jelszó"
                            icon={<Lock size={18} />}
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="text-lg"
                        />
                    </div>

                    <div className="pt-4">
                        <Button
                            type="submit"
                            className="w-full py-3 text-lg shadow-lg"
                            isLoading={loading}
                        >
                            {isLogin ? (
                                <>Bejelentkezés <LogIn size={20} className="ml-2" /></>
                            ) : (
                                <>Regisztráció <UserPlus size={20} className="ml-2" /></>
                            )}
                        </Button>
                    </div>
                </form>

                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                        }}
                        className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors flex items-center justify-center mx-auto"
                    >
                        {isLogin ? "Nincs még fiókod? Regisztrálj!" : "Már van fiókod? Jelentkezz be!"}
                        <ArrowRight size={16} className="ml-1" />
                    </button>

                    <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-center text-gray-400">
                        v6.0.0 &copy; 2024 Festőnapló App
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Login;
