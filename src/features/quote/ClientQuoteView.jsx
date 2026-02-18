import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuotes } from '../../hooks/useQuotes';
import { CheckCircle2, FileText, Download, Printer, User, Building2, MapPin, Mail, Phone, Calendar, Info } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SignaturePad from '../../components/ui/SignaturePad';

export default function ClientQuoteView() {
    const { userId, quoteId } = useParams();
    const { getPublicQuote, updateStatus, saveQuote } = useQuotes();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAccepted, setIsAccepted] = useState(false);
    const [showSignPad, setShowSignPad] = useState(false);

    useEffect(() => {
        const fetchQuote = async () => {
            const result = await getPublicQuote(userId, quoteId);
            if (result) {
                setData(result);
                if (result.quote.status === 'accepted') {
                    setIsAccepted(true);
                } else if (result.quote.status === 'sent') {
                    // Update to 'viewed' automatically
                    // updateStatus(quoteId, 'viewed'); // Need to handle public permission or use a logic
                }
            }
            setLoading(false);
        };
        fetchQuote();
    }, [userId, quoteId]);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-12 w-12 border-b-2 border-primary-600 rounded-full"></div></div>;
    if (!data) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium font-inter">Az árajánlat nem található vagy lejárt.</div>;

    const { quote, branding } = data;
    const primaryColor = branding.primaryColor || '#2563eb';

    const handleAccept = async (signatureData) => {
        try {
            // In a real app, updateStatus would work here if rules allow or use a cloud function
            // For now we'll assume we update the quote doc directly if rules allow public write to status
            // Note: security rules should be updated later to allow this specific field
            await updateStatus(quoteId, 'accepted'); // This uses useQuotes which requires auth
            // Since this is CLIENT view, useQuotes might fail if not logged in.
            // Ideally we need a separate service call. But for this MVP prototype:
            setIsAccepted(true);
            setShowSignPad(false);
            alert('Árajánlat elfogadva! Köszönjük.');
        } catch (err) {
            console.error(err);
            alert('Hiba az elfogadás során.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20 font-inter">
            {/* Branded Header Stripe */}
            <div style={{ backgroundColor: primaryColor }} className="h-2 w-full sticky top-0 z-50 shadow-sm"></div>

            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Logo & Header */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
                    <div>
                        {branding.logoUrl ? (
                            <img src={branding.logoUrl} alt="Logo" className="max-h-20 mb-6 object-contain" />
                        ) : (
                            <div className="flex items-center gap-3 mb-6">
                                <FileText size={40} style={{ color: primaryColor }} />
                                <span className="text-xl font-bold tracking-tight text-gray-900 uppercase">Árajánlat</span>
                            </div>
                        )}
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-none mb-2"># {quote.number}</h1>
                        <div className="flex items-center gap-2">
                            <Badge className={`${isAccepted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'} border-0 px-3 py-1 font-bold uppercase tracking-wider text-[10px]`}>
                                {isAccepted ? 'Elfogadva' : 'Hivatalos Ajánlat'}
                            </Badge>
                            <span className="text-sm text-gray-400">|</span>
                            <span className="text-sm text-gray-500 flex items-center gap-1.5 font-medium"><Calendar size={14} /> {quote.date}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" className="bg-white border-gray-200 text-gray-600 hover:bg-gray-50" onClick={() => window.print()}>
                            <Printer size={18} className="mr-2" /> Nyomtatás
                        </Button>
                        {!isAccepted && (
                            <Button style={{ backgroundColor: primaryColor }} className="text-white shadow-xl shadow-blue-100" onClick={() => setShowSignPad(true)}>
                                <CheckCircle2 size={18} className="mr-2" /> Elfogadom & Aláírom
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    {/* Parties */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4 text-gray-400 uppercase tracking-widest text-[10px] font-bold">
                            <Building2 size={12} /> Kivitelező
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1">Cég Neve / Vállalkozó</h3>
                        <p className="text-gray-500 text-sm leading-relaxed mb-4">Adószám: 12345678-1-12<br />Minta utca 12, Budapest</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4 text-gray-400 uppercase tracking-widest text-[10px] font-bold">
                            <User size={12} /> Ügyfél
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{quote.buyerName}</h3>
                        <div className="space-y-1.5">
                            <p className="text-gray-500 text-sm flex items-center gap-2"><MapPin size={14} className="text-gray-300" /> {quote.buyerAddress}</p>
                            <p className="text-gray-500 text-sm flex items-center gap-2"><Mail size={14} className="text-gray-300" /> {quote.buyerEmail}</p>
                        </div>
                    </div>
                </div>

                {/* Main Content Card */}
                <Card className="!p-0 overflow-hidden border-0 shadow-2xl rounded-3xl mb-12">
                    <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                                <tr>
                                    <th className="py-3 pr-4">Leírás</th>
                                    <th className="py-3 px-4 text-right">Mennyiség</th>
                                    <th className="py-3 px-4 text-right">Egységár</th>
                                    <th className="py-3 px-4 text-right">ÁFA</th>
                                    <th className="py-3 pl-4 text-right">Összesen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {quote.items.map((item, idx) => (
                                    <tr key={idx} className={`group ${item.isOptional ? 'bg-amber-50/50 italic opacity-80' : ''}`}>
                                        <td className="py-5 pr-4 border-l-4 border-transparent group-hover:border-primary-500 transition-all font-medium text-gray-800">
                                            {item.description}
                                            {item.isOptional && <p className="text-[10px] text-amber-600 not-italic font-bold uppercase mt-1">Opcionális</p>}
                                        </td>
                                        <td className="py-5 px-4 text-right text-gray-600 whitespace-nowrap">{item.qty} {item.unit}</td>
                                        <td className="py-5 px-4 text-right text-gray-600 whitespace-nowrap">{item.price?.toLocaleString()} Ft</td>
                                        <td className="py-5 px-4 text-right text-gray-500 whitespace-nowrap">{item.vat}%</td>
                                        <td className="py-5 pl-4 text-right font-bold text-gray-900 whitespace-nowrap">
                                            {(item.qty * item.price * (1 + (typeof item.vat === 'number' ? item.vat : 0) / 100)).toLocaleString()} Ft
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-8 bg-gray-900 text-white flex flex-col md:flex-row justify-between gap-8">
                        <div className="max-w-xs">
                            <h4 className="flex items-center gap-2 text-primary-400 font-bold mb-3 uppercase tracking-widest text-xs">
                                <Info size={14} /> Megjegyzés
                            </h4>
                            <p className="text-gray-400 text-xs leading-relaxed italic">{quote.note || 'Nincs további megjegyzés az ajánlathoz.'}</p>
                        </div>
                        <div className="space-y-4 w-full md:w-64">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400 font-medium">Nettó összesen</span>
                                <span className="font-bold">{quote.totals?.net.toLocaleString()} Ft</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-gray-800 pb-4">
                                <span className="text-gray-400 font-medium">ÁFA tartalom</span>
                                <span className="font-bold">{quote.totals?.vat.toLocaleString()} Ft</span>
                            </div>
                            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                                <span className="text-primary-400 font-extrabold uppercase tracking-widest text-[10px]">Végösszeg</span>
                                <span className="text-2xl font-black">{quote.totals?.gross.toLocaleString()} Ft</span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Signature View */}
                {isAccepted && (
                    <div className="bg-white p-8 rounded-3xl border-2 border-green-100 shadow-xl shadow-green-50 flex flex-col md:flex-row items-center justify-between gap-8 mb-12 animate-in fade-in zoom-in duration-500">
                        <div>
                            <div className="flex items-center gap-2 text-green-600 font-bold mb-1 uppercase tracking-widest text-xs">
                                <CheckCircle2 size={16} /> Digitálisan aláírva és elfogadva
                            </div>
                            <p className="text-gray-400 text-xs italic">A dokumentum jogerősnek minősül az aláírás pillanatától.</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="text-center text-[10px] text-gray-300 uppercase font-black mb-2 opacity-50">Ügyfél aláírása</div>
                            <div className="bg-white p-2 rounded border border-gray-100">
                                <div className="h-10 w-40 flex items-center justify-center text-gray-200 text-xs italic">Signature Image placeholder</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Signature Modal Overlay */}
            {showSignPad && (
                <div className="fixed inset-0 z-[100] bg-gray-900/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 relative animate-in slide-in-from-bottom-8 duration-300">
                        <button onClick={() => setShowSignPad(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"> Nyitás/zárás </button>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Ajánlat Elfogadása</h2>
                        <p className="text-gray-500 text-sm mb-8 leading-relaxed">Kérjük, írd alá az ujjaddal vagy egérrel a lenti mezőben az érvényesítéshez.</p>
                        <SignaturePad onSave={handleAccept} onClear={() => { }} />
                    </div>
                </div>
            )}
        </div>
    );
}
