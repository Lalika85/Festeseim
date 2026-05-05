import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotes } from '../../hooks/useQuotes';
import { useAuth } from '../../hooks/useAuth';
import {
    Plus, Search, Filter, MoreVertical, Edit3,
    Trash2, Eye, Share2, FileText, ChevronRight,
    SearchX, AlertCircle, Palette, Receipt,
    CreditCard, Banknote, Landmark
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { Share } from '@capacitor/share';
import { createSzamlazzHuInvoice, createBillingoInvoice, createOtpEbizInvoice } from '../../services/billingService';
import { localDB } from '../../services/localDB';

export default function QuoteList() {
    const navigate = useNavigate();
    const { quotes, loading, deleteQuote, branding, updateStatus, companies = [] } = useQuotes();
    const { ownerUid } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [activeQuote, setActiveQuote] = useState(null);
    const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
    const [fulfillmentDate, setFulfillmentDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 8);
        return d.toISOString().split('T')[0];
    });

    const filteredQuotes = quotes.filter(q =>
        q.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.buyerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (window.confirm('Biztosan törlöd ezt az árajánlatot?')) {
            await deleteQuote(id);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'accepted': return <Badge variant="success">Elfogadva</Badge>;
            case 'viewed': return <Badge variant="info">Megtekintve</Badge>;
            case 'sent': return <Badge variant="warning">Elküldve</Badge>;
            default: return <Badge variant="neutral">Piszkozat</Badge>;
        }
    };

    const handleCreateInvoice = async (q, e) => {
        e.stopPropagation();
        
        if (!ownerUid) {
            alert('Be kell jelentkezned!');
            return;
        }

        setActiveQuote(q);
        setShowPaymentModal(true);
    };

    const executeInvoiceCreation = async (paymentMethod) => {
        if (!activeQuote || !ownerUid) return;

        let company = companies.find(c => c.id === activeQuote.sellerId);
        
        // Fallback for older quotes with missing sellerId
        if (!company && companies.length > 0) {
            company = companies.find(c => c.isDefault) || companies[0];
            console.log("Fallback company used for invoice:", company?.name);
        }

        if (!company) {
            alert(`HIBA: Nem található cég ehhez az árajánlathoz!\n(SellerId: ${activeQuote.sellerId || 'üres'})\n\nKérlek szerkeszd az árajánlatot és válassz egy céget a Megjelenés fülön.`);
            return;
        }
        
        if (!company.billingProvider || company.billingProvider === 'none') {
            alert(`HIBA: A(z) "${company.name}" (${company.id}) cégnél nincs beállítva a számlázó!\n\nKérlek menj a Beállítások / Saját Cégeim menübe, szerkeszd ezt a céget, és VÁLASZD KI a Számlázó Rendszert (Billingo vagy Számlázz.hu).`);
            return;
        }
        
        if (!activeQuote.buyerEmail) {
            if (!window.confirm('Nincs email cím megadva a vevőhöz. A számla kiállításra kerül, de nem lesz automatikusan elküldve. Folytatod?')) {
                return;
            }
        }

        setIsCreatingInvoice(true);
        try {
            if (company.billingProvider === 'szamlazzhu') {
                if (!company.szamlazzAgentKey) throw new Error('Nincs megadva a Számla Agent kulcs ehhez a céghez!');
                await createSzamlazzHuInvoice(activeQuote, company.szamlazzAgentKey, paymentMethod, fulfillmentDate, dueDate);
            } else if (company.billingProvider === 'billingo') {
                if (!company.billingoApiKey) throw new Error('Nincs megadva a Billingo API kulcs ehhez a céghez!');
                await createBillingoInvoice(activeQuote, company.billingoApiKey, paymentMethod, fulfillmentDate, dueDate, company.billingoBlockId);
            } else if (company.billingProvider === 'otpebiz') {
                if (!company.otpEbizApiKey) throw new Error('Nincs megadva az OTP eBIZ API kulcs ehhez a céghez!');
                await createOtpEbizInvoice(activeQuote, company.otpEbizApiKey, paymentMethod, fulfillmentDate, dueDate);
            }
            alert('A számla sikeresen kiállításra került, és a partner hamarosan megkapja emailben!');
            await updateStatus(activeQuote.id, 'accepted');
            setShowPaymentModal(false);
        } catch (err) {
            console.error('Invoice creation error:', err);
            alert(`Hiba történt a számla kiállításakor: ${err.message}`);
        } finally {
            setIsCreatingInvoice(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-500 font-medium">Betöltés...</p>
        </div>
    );

    return (
        <div className="pb-24 max-w-5xl mx-auto px-4">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-10">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Árajánlataim</h1>
                    <p className="text-sm text-gray-500 font-medium">Kezeld és küldd el professzionális ajánlataidat</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <Button
                        className="bg-primary-600 hover:bg-primary-700 text-white shadow-xl shadow-primary-100 px-6 py-3 rounded-2xl flex-1 sm:flex-none justify-center w-full"
                        onClick={() => navigate('/quote/new')}
                    >
                        <Plus size={20} className="mr-2" /> Új Árajánlat
                    </Button>
                </div>
            </div>

            {/* Stats & Search */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
                <Card className="!p-4 bg-white border-gray-100 shadow-sm">
                    <div className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Összes</div>
                    <div className="text-2xl font-black text-gray-900">{quotes.length} db</div>
                </Card>
                <Card className="!p-4 bg-green-50 border-green-100 shadow-sm">
                    <div className="text-[10px] uppercase font-bold text-green-600 tracking-widest mb-1">Elfogadva</div>
                    <div className="text-2xl font-black text-green-700">{quotes.filter(q => q.status === 'accepted').length} db</div>
                </Card>
                <div className="md:col-span-2 relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                        <Search size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Keresés ügyfél vagy sorszám alapján..."
                        className="w-full h-full pl-12 pr-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-sm outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            {filteredQuotes.length === 0 ? (
                <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-gray-100 shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        {searchTerm ? <SearchX size={40} className="text-gray-300" /> : <FileText size={40} className="text-gray-300" />}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {searchTerm ? 'Nincs találat' : 'Még nincs egyetlen árajánlatod sem'}
                    </h3>
                    <p className="text-gray-500 max-w-xs mx-auto mb-8">
                        {searchTerm ? 'Próbálkozz más kulcsszóval a kereséshez.' : 'Kattints az "Új Árajánlat" gombra az első dokumentumod elkészítéséhez.'}
                    </p>
                    {!searchTerm && (
                        <Button variant="secondary" onClick={() => navigate('/quote/new')}>Első ajánlat létrehozása</Button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredQuotes.map((q) => (
                        <div
                            key={q.id}
                            onClick={() => navigate(`/quote/edit/${q.id}`)}
                            className="group bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary-100 transition-all cursor-pointer relative overflow-hidden"
                        >
                            {/* Color accent if branding exists */}
                            <div
                                className="absolute left-0 top-0 bottom-0 w-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ backgroundColor: branding.primaryColor || '#2563eb' }}
                            ></div>

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-black text-gray-900">{q.number || 'N/A'}</span>
                                            {getStatusBadge(q.status)}
                                        </div>
                                        <div className="text-sm text-gray-500 font-medium">{q.buyerName || 'Névtelen ügyfél'}</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0">
                                    <div className="text-right">
                                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Végösszeg</div>
                                        <div className="font-black text-gray-900">{(q.totals?.gross || 0).toLocaleString()} Ft</div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleCreateInvoice(q, e)}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                            title="Számla készítése"
                                        >
                                            <Receipt size={20} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/quote/preview/${q.id}`);
                                            }}
                                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                            title="Előnézet megnyitása"
                                        >
                                            <Eye size={20} />
                                        </button>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                    const { generateQuotePDF } = await import('../../services/pdfGenerator');
                                                    
                                                    // Get seller info
                                                    // Note: We might need to fetch the specific company or use generic branding
                                                    // In list view, we usually use the default branding
                                                    // Resolve seller data based on the quote's selected company
                                                    const company = companies.find(c => c.id === q.sellerId) || {};
                                                    const sellerData = {
                                                        name: company.name || branding.companyName || "Saját Vállalkozás",
                                                        address: company.address || branding.companyAddress || "",
                                                        taxNumber: company.taxNumber || company.tax || branding.taxNumber || "",
                                                        phone: company.phone || branding.companyPhone || "",
                                                        email: company.email || branding.companyEmail || "",
                                                        bank: company.bankAccount || company.bank || branding.bankAccount || "",
                                                        logo: company.logoUrl || branding.logoUrl,
                                                        primaryColor: company.primaryColor || branding.primaryColor || '#2563eb'
                                                    };

                                                    await generateQuotePDF(q, sellerData, 'share');

                                                    if (!q.status || q.status === 'draft') {
                                                        await updateStatus(q.id, 'sent');
                                                    }
                                                } catch (err) {
                                                    console.warn('Share error:', err);
                                                    alert('Hiba a PDF megosztásakor!');
                                                }
                                            }}
                                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                                            title="Megosztás (PDF)"
                                        >
                                            <Share2 size={20} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(q.id, e)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            title="Törlés"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                        <div className="w-8 h-8 flex items-center justify-center text-gray-300 group-hover:text-primary-600 group-hover:translate-x-1 transition-all">
                                            <ChevronRight size={24} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={showPaymentModal}
                onClose={() => !isCreatingInvoice && setShowPaymentModal(false)}
                title="Számla kiállítása"
            >
                <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Teljesítés</label>
                            <input
                                type="date"
                                value={fulfillmentDate}
                                onChange={(e) => setFulfillmentDate(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Határidő</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">
                        Válaszd ki a fizetési módot a számlához:
                    </p>
                    
                    <div className="space-y-3">
                        <button
                            onClick={() => executeInvoiceCreation('Átutalás')}
                            disabled={isCreatingInvoice}
                            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-2xl transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <Landmark size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-900">Átutalás</p>
                                    <p className="text-xs text-gray-500">Banki utalásos számla</p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-gray-400" />
                        </button>

                        <button
                            onClick={() => executeInvoiceCreation('Készpénz')}
                            disabled={isCreatingInvoice}
                            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-green-50 border border-gray-100 hover:border-green-200 rounded-2xl transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-all">
                                    <Banknote size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-900">Készpénz</p>
                                    <p className="text-xs text-gray-500">Helyszíni fizetés</p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-gray-400" />
                        </button>

                        <button
                            onClick={() => executeInvoiceCreation('Bankkártya')}
                            disabled={isCreatingInvoice}
                            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-purple-50 border border-gray-100 hover:border-purple-200 rounded-2xl transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-all">
                                    <CreditCard size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-900">Bankkártya</p>
                                    <p className="text-xs text-gray-500">Online vagy terminál</p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-gray-400" />
                        </button>
                    </div>

                    {isCreatingInvoice && (
                        <div className="mt-6 flex items-center justify-center gap-3 text-primary-600 font-medium">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                            Számla kiállítása folyamatban...
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
