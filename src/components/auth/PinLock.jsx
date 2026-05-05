import React, { useState } from 'react';
import { Lock, Delete } from 'lucide-react';
import { localDB } from '../../services/localDB';

const PinLock = ({ onUnlock }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    
    const correctPin = localDB.cachedPin;

    const handleNumberClick = (num) => {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            setError(false);
            
            if (newPin.length === 4) {
                if (newPin === correctPin) {
                    onUnlock();
                } else {
                    setTimeout(() => {
                        setError(true);
                        setPin('');
                    }, 300);
                }
            }
        }
    };

    const handleDelete = () => {
        setPin(pin.slice(0, -1));
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center p-6 transition-all duration-500">
            <div className="mb-8 text-center">
                <div className={`w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 ${error ? 'border-red-500 animate-shake' : 'border-primary/50'}`}>
                    <Lock className={`w-10 h-10 ${error ? 'text-red-500' : 'text-primary'}`} />
                </div>
                <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Kisvállalkozói Napló</h2>
                <p className="text-slate-400">Adja meg a PIN kódot a folytatáshoz</p>
            </div>

            {/* PIN Dots */}
            <div className="flex gap-4 mb-12">
                {[...Array(4)].map((_, i) => (
                    <div 
                        key={i}
                        className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                            pin.length > i 
                                ? 'bg-primary border-primary scale-110' 
                                : 'border-slate-600'
                        } ${error ? 'border-red-500' : ''}`}
                    />
                ))}
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                        key={num}
                        onClick={() => handleNumberClick(num.toString())}
                        className="w-16 h-16 rounded-full bg-slate-800 text-white text-2xl font-semibold flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all"
                    >
                        {num}
                    </button>
                ))}
                <div />
                <button
                    onClick={() => handleNumberClick('0')}
                    className="w-16 h-16 rounded-full bg-slate-800 text-white text-2xl font-semibold flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all"
                >
                    0
                </button>
                <button
                    onClick={handleDelete}
                    className="w-16 h-16 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all"
                >
                    <Delete className="w-8 h-8" />
                </button>
            </div>

            {error && (
                <p className="mt-8 text-red-500 font-medium animate-fade-in">
                    Hibás PIN kód! Próbálja újra.
                </p>
            )}
        </div>
    );
};

export default PinLock;
