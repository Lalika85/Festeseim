import React, { useState, useRef, useEffect } from 'react';
import { Bot, Mic, Send, X, MessageSquare, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { useAI } from '../../contexts/AIContext';
import Button from '../ui/Button';

export default function AIAssistant() {
    const { messages, processMessage, isListening, isThinking, startListening, stopListening, clearMessages } = useAI();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = () => {
        if (!input.trim()) return;
        processMessage(input);
        setInput('');
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[1000] group"
            >
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold animate-bounce border-2 border-white">
                    AI
                </div>
                <Bot size={28} className="group-hover:rotate-12 transition-transform" />
            </button>
        );
    }

    return (
        <div className="fixed inset-x-4 bottom-24 md:inset-x-auto md:right-6 md:bottom-24 md:w-96 bg-white rounded-[2rem] shadow-2xl border border-gray-100 flex flex-col z-[1000] animate-in slide-in-from-bottom-8 duration-300 overflow-hidden max-h-[70vh]">
            {/* Header */}
            <div className="bg-primary-600 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <Bot size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Festő Al Segéd</h3>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${isThinking ? 'bg-amber-400 animate-pulse' : 'bg-green-400'}`}></div>
                            <span className="text-[10px] opacity-80 uppercase tracking-widest font-bold">
                                {isThinking ? 'Gondolkodik...' : 'Online'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            if (window.confirm('Törlöd a beszélgetést?')) clearMessages();
                        }}
                        className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors"
                    >
                        Törlés
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <Minimize2 size={20} />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 min-h-[300px]">
                {/* Warning Banner */}
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-3 animate-pulse">
                    <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600 shrink-0">
                        <Maximize2 size={14} className="rotate-45" />
                    </div>
                    <div className="text-[10px] text-amber-800 leading-tight">
                        <span className="font-bold block mb-0.5">FIGYELEM!</span>
                        Ellenőrizd az AI által rögzített adatokat, mert félreértheti a diktált adatokat.
                    </div>
                </div>

                {messages.length === 0 && (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquare size={32} />
                        </div>
                        <h4 className="text-gray-900 font-bold mb-1">Miben segíthetek?</h4>
                        <p className="text-xs text-gray-500 px-8">Mondd el mit szeretnél, és én megcsinálom. Pl.: "Keress meg egy ügyfelet", vagy "Adj hozzá egy tételt".</p>
                    </div>
                )}

                {messages.map((m, idx) => {
                    if (!m.content) return null;
                    return (
                        <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm text-sm ${m.role === 'user'
                                    ? 'bg-primary-600 text-white rounded-tr-none'
                                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                }`}>
                                {m.content}
                            </div>
                        </div>
                    );
                })}

                {isThinking && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-primary-600" />
                            <span className="text-xs text-gray-400">Dolgozom rajta...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-50">
                <div className="flex items-center gap-2">
                    <button
                        onMouseDown={(e) => { e.preventDefault(); startListening(); }}
                        onMouseUp={(e) => { e.preventDefault(); stopListening(); }}
                        onTouchStart={(e) => { e.preventDefault(); startListening(); }}
                        onTouchEnd={(e) => { e.preventDefault(); stopListening(); }}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isListening
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                        title="Tartsd nyomva a beszédhez"
                    >
                        <Mic size={20} />
                    </button>

                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Írj ide..."
                            className="w-full h-12 pl-4 pr-12 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-sm"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isThinking}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary-600 disabled:opacity-30"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
                <div className="mt-2 text-[9px] text-center text-gray-400 font-medium uppercase tracking-widest">
                    {isListening ? 'Hallgatlak...' : 'Kattints és tarts nyomva a mikrofont'}
                </div>
            </div>
        </div>
    );
}
