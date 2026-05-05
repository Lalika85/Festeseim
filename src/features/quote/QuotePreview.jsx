import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuotes } from '../../hooks/useQuotes';
import { useAuth } from '../../hooks/useAuth';
import { 
    ArrowLeft, FileText, Share2, Printer, 
    Calendar, User, Home, MapPin, Mail, 
    Phone, Download, CheckCircle2, Building2, Info, AlertCircle
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { imageStore } from '../../services/imageStore';

export default function QuotePreview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { getPublicQuote } = useQuotes();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAccepted, setIsAccepted] = useState(false);

    useEffect(() => {
        const fetchQuote = async () => {
            if (!currentUser || !id) return;
            try {
                const result = await getPublicQuote(currentUser.uid, id);
                if (result) {
                    setData(result);
                    if (result.quote.status === 'accepted') {
                        setIsAccepted(true);
                    }
                } else {
                    console.error("Quote not found");
                }
            } catch (err) {
                console.error("Error loading quote preview:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchQuote();
    }, [id, currentUser, getPublicQuote, navigate]);


    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-500 font-medium tracking-wide">Árajánlat betöltése...</p>
        </div>
    );

    if (!data) return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <AlertCircle size={48} className="text-amber-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Árajánlat nem található</h2>
            <p className="text-gray-500 mb-6">Az adatokat nem sikerült betölteni a helyi adatbázisból.</p>
            <Button onClick={() => navigate(-1)} className="bg-primary-600 text-white">Vissza a szerkesztőhöz</Button>
        </div>
    );

    const { quote, branding } = data;
    const primaryColor = branding.primaryColor || '#2563eb';

    const handleSharePDF = async () => {
        try {
            const { generateQuotePDF } = await import('../../services/pdfGenerator');
            
            const sellerData = {
                name: branding.companyName || "Saját Vállalkozás",
                address: branding.companyAddress || "",
                taxNumber: branding.taxNumber || "",
                phone: branding.companyPhone || "",
                email: branding.companyEmail || "",
                bank: branding.bankAccount || "",
                logo: branding.logoUrl,
                primaryColor: branding.primaryColor || '#2563eb'
            };

            await generateQuotePDF(quote, sellerData, 'share');
        } catch (err) {
            console.error("PDF Error:", err);
            alert("Hiba a PDF generálásakor!");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20 font-inter">
            {/* Action Bar */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-50 px-4 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={() => navigate(-1)} className="!p-2 shadow-none border-0 bg-gray-100 rounded-full hover:bg-gray-200">
                        <ArrowLeft size={20} />
                    </Button>
                    <div className="hidden sm:block">
                        <h1 className="text-lg font-bold text-gray-900 leading-none">Dokumentum Előnézet</h1>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Valós nézet</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        onClick={handleSharePDF} 
                        className="bg-primary-600 hover:bg-primary-700 text-white !px-5 !py-2.5 rounded-xl shadow-lg shadow-primary-100 flex items-center gap-2"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <Share2 size={18} /> <span className="hidden xs:inline">PDF Megosztása</span>
                    </Button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Logo & Header */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
                    <div>
                        {branding.logoUrl ? (
                            <img src={imageStore.getUrl(branding.logoUrl)} alt="Logo" className="max-h-20 mb-6 object-contain" />
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
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    {/* Parties */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4 text-gray-400 uppercase tracking-widest text-[10px] font-bold">
                            <Building2 size={12} /> Kivitelező
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{branding.companyName || 'Saját Vállalkozás'}</h3>
                        <div className="text-gray-500 text-sm space-y-1 mb-4">
                            {branding.taxNumber && <p>Adószám: {branding.taxNumber}</p>}
                            {branding.companyAddress && <p>{branding.companyAddress}</p>}
                            {branding.companyPhone && <p>Tel: {branding.companyPhone}</p>}
                            {branding.companyEmail && <p>Email: {branding.companyEmail}</p>}
                            {branding.bankAccount && <p className="pt-1 text-gray-400 text-xs">Bankszámla: {branding.bankAccount}</p>}
                            {!branding.companyAddress && !branding.taxNumber && <p>Nincs cím megadva</p>}
                        </div>
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
                                {(quote.items || []).map((item, idx) => (
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
                                <span className="font-bold">{(quote.totals?.net || 0).toLocaleString()} Ft</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-gray-800 pb-4">
                                <span className="text-gray-400 font-medium">ÁFA tartalom</span>
                                <span className="font-bold">{(quote.totals?.vat || 0).toLocaleString()} Ft</span>
                            </div>
                            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl" style={{ borderLeft: `4px solid ${primaryColor}` }}>
                                <span className="text-primary-400 font-extrabold uppercase tracking-widest text-[10px]">Végösszeg</span>
                                <span className="text-2xl font-black">{(quote.totals?.gross || 0).toLocaleString()} Ft</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
