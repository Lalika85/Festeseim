import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight, UserPlus, LogIn, ScrollText, Briefcase } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import LegalDocuments from '../../components/ui/LegalDocuments';

const Login = () => {
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
    const [showLegalDocs, setShowLegalDocs] = useState(false);
    const [legalDocTab, setLegalDocTab] = useState('aszf');
    const [successMessage, setSuccessMessage] = useState('');
    const { login, register, resetPassword } = useAuth();

    useEffect(() => {
        const emailParam = searchParams.get('email');
        const modeParam = searchParams.get('mode');

        if (emailParam) {
            setEmail(emailParam);
        }

        if (modeParam === 'register') {
            setIsLogin(false);
        }
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (isForgotPassword) {
            if (!email) return setError('Kérjük, add meg az email címedet!');
            try {
                setError('');
                setSuccessMessage('');
                setLoading(true);
                await resetPassword(email);
                setSuccessMessage('A jelszóvisszaállító e-mailt elküldtük az e-mail címedre!');
            } catch (err) {
                setError('Hiba a visszaállítás során: ' + err.message);
            } finally {
                setLoading(false);
            }
            return;
        }

        if (!email || !password) return setError('Minden mező kitöltése kötelező!');
        if (!isLogin && password.length < 6) return setError('A jelszó legalább 6 karakter legyen!');
        if (!isLogin && (!acceptedTerms || !acceptedPrivacy)) return setError('A regisztrációhoz kötelező elfogadni a jogi feltételeket!');

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
        <div className="min-h-screen bg-gradient-to-br from-primary-600 to-indigo-800 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="!p-8 sm:!p-10 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-0 rounded-[2.5rem] bg-white/95 backdrop-blur-sm animate-fade-in card relative">
                    <div className="flex flex-col items-center text-center mb-10 w-full">
                        <div className="w-20 h-20 bg-primary-100 rounded-3xl flex items-center justify-center mb-6 shadow-inner animate-bounce-subtle">
                            <Briefcase size={40} className="text-primary-600" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight w-full text-center">
                            KISVÁLLALKOZÓI<br />
                            <span className="text-primary-600">NAPLÓ</span>
                        </h1>
                        <p className="text-gray-500 mt-3 font-medium text-sm w-full text-center">
                            {isForgotPassword ? "Jelszó visszaállítása" : "Vállalkozói adminisztráció egyszerűen"}
                        </p>
                    </div>

                    {successMessage && (
                        <div className="bg-green-50 text-green-600 p-4 rounded-2xl text-sm mb-8 flex items-center border border-green-100 animate-fade-in">
                            <span className="mr-2 text-base">✅</span> {successMessage}
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm mb-8 flex items-center border border-red-100 animate-shake">
                            <span className="mr-2 text-base">⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-5">
                            <Input
                                label="Email cím"
                                icon={<Mail size={20} />}
                                type="email"
                                placeholder="pelda@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                readOnly={!!searchParams.get('email')}
                                className="!mb-0"
                                inputClassName="h-14 !rounded-2xl bg-gray-50/50 border-gray-200 focus:bg-white transition-all shadow-sm"
                            />
                            {!isForgotPassword && (
                                <Input
                                    label="Jelszó"
                                    icon={<Lock size={20} />}
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="!mb-0"
                                    inputClassName="h-14 !rounded-2xl bg-gray-50/50 border-gray-200 focus:bg-white transition-all shadow-sm"
                                />
                            )}
                        </div>

                        {isLogin && !isForgotPassword && (
                            <div className="flex justify-end -mt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsForgotPassword(true);
                                        setError('');
                                    }}
                                    className="text-xs font-bold text-primary-600 hover:text-primary-800 transition-colors py-1"
                                >
                                    Elfelejtett jelszó?
                                </button>
                            </div>
                        )}

                        {/* Jogi nyilatkozatok - only in register mode */}
                        {!isLogin && (
                            <div className="space-y-3">
                                {/* ÁSZF + EULA Checkbox */}
                                <div className="flex items-start gap-3 p-4 bg-primary-50/50 rounded-2xl border border-primary-100 transition-all hover:bg-primary-50">
                                    <div className="pt-0.5">
                                        <input
                                            type="checkbox"
                                            id="acceptTerms"
                                            checked={acceptedTerms}
                                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                                            className="w-5 h-5 text-primary-600 border-gray-300 rounded-lg focus:ring-primary-500 cursor-pointer transition-transform active:scale-90"
                                        />
                                    </div>
                                    <label htmlFor="acceptTerms" className="text-xs text-gray-600 leading-relaxed cursor-pointer select-none">
                                        Megismertem és elfogadom az{' '}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); setLegalDocTab('aszf'); setShowLegalDocs(true); }}
                                            className="text-primary-600 font-bold underline underline-offset-4 hover:text-primary-800 transition-colors"
                                        >
                                            ÁSZF-et
                                        </button>
                                        {' '}és a{' '}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); setLegalDocTab('eula'); setShowLegalDocs(true); }}
                                            className="text-primary-600 font-bold underline underline-offset-4 hover:text-primary-800 transition-colors"
                                        >
                                            Felhasználási Feltételeket
                                        </button>. <span className="text-red-500">*</span>
                                    </label>
                                </div>

                                {/* Adatvédelmi Checkbox */}
                                <div className="flex items-start gap-3 p-4 bg-green-50/50 rounded-2xl border border-green-100 transition-all hover:bg-green-50">
                                    <div className="pt-0.5">
                                        <input
                                            type="checkbox"
                                            id="acceptPrivacy"
                                            checked={acceptedPrivacy}
                                            onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                                            className="w-5 h-5 text-green-600 border-gray-300 rounded-lg focus:ring-green-500 cursor-pointer transition-transform active:scale-90"
                                        />
                                    </div>
                                    <label htmlFor="acceptPrivacy" className="text-xs text-gray-600 leading-relaxed cursor-pointer select-none">
                                        Kifejezetten hozzájárulok a személyes adataim kezeléséhez az{' '}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); setLegalDocTab('privacy'); setShowLegalDocs(true); }}
                                            className="text-green-600 font-bold underline underline-offset-4 hover:text-green-800 transition-colors"
                                        >
                                            Adatvédelmi Tájékoztatóban
                                        </button>{' '}
                                        foglaltak szerint. <span className="text-red-500">*</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="pt-2">
                            <Button
                                type="submit"
                                className={`w-full py-4 text-lg font-bold shadow-xl rounded-2xl transition-all active:scale-[0.98] ${
                                    !isLogin && (!acceptedTerms || !acceptedPrivacy) 
                                        ? 'opacity-50 cursor-not-allowed !bg-gray-400 hover:!bg-gray-400 shadow-none' 
                                        : 'shadow-primary-600/20'
                                }`}
                                isLoading={loading}
                                disabled={!isLogin && (!acceptedTerms || !acceptedPrivacy) && !isForgotPassword}
                            >
                                {isForgotPassword ? (
                                    <>Visszaállító e-mail küldése <ArrowRight size={22} className="ml-2" /></>
                                ) : isLogin ? (
                                    <>Bejelentkezés <LogIn size={22} className="ml-2" /></>
                                ) : (
                                    <>Regisztráció <UserPlus size={22} className="ml-2" /></>
                                )}
                            </Button>
                        </div>
                    </form>

                    <div className="mt-10 text-center">
                        {isForgotPassword ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsForgotPassword(false);
                                    setError('');
                                    setSuccessMessage('');
                                }}
                                className="group text-sm text-gray-500 hover:text-primary-600 font-bold transition-all flex items-center justify-center mx-auto py-2"
                            >
                                Vissza a bejelentkezéshez
                                <LogIn size={16} className="ml-2 group-hover:-translate-x-1 transition-transform" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError('');
                                    setAcceptedTerms(false);
                                    setSuccessMessage('');
                                }}
                                className="group text-sm text-gray-500 hover:text-primary-600 font-bold transition-all flex items-center justify-center mx-auto py-2"
                            >
                                {isLogin ? "Nincs még fiókod? Regisztrálj!" : "Már van fiókod? Jelentkezz be!"}
                                <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}

                        <div className="mt-8 pt-8 border-t border-gray-100 text-[10px] text-center text-gray-400 uppercase tracking-[0.2em] font-bold">
                            &copy; 2024 Kisvállalkozói Napló App
                        </div>
                        <div className="mt-2 text-center">
                            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Verzió: 2.3 (Cég mentés javítva)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legal Documents Modal */}
            <LegalDocuments 
                isOpen={showLegalDocs} 
                onClose={() => setShowLegalDocs(false)} 
                initialTab={legalDocTab} 
            />
        </div>
    );
};

export default Login;
