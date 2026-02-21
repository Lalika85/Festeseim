import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotes } from '../../hooks/useQuotes';
import { useAuth } from '../../hooks/useAuth';
import {
    Plus, Search, Filter, MoreVertical, Edit3,
    Trash2, Eye, Share2, FileText, ChevronRight,
    SearchX, AlertCircle
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Share } from '@capacitor/share';
import { PUBLIC_BASE_URL } from '../../hooks/useQuotes';

export default function QuoteList() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { quotes, loading, deleteQuote, branding, updateStatus } = useQuotes();
    const [searchTerm, setSearchTerm] = useState('');

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

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-500 font-medium">Betöltés...</p>
        </div>
    );

    return (
        <div className="pb-24 max-w-5xl mx-auto px-4">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Árajánlataim</h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Kezeld és kövesd nyomon az összes ajánlatodat egy helyen</p>
                </div>
                <Button
                    className="bg-primary-600 hover:bg-primary-700 text-white shadow-xl shadow-primary-100 px-6 py-3 rounded-2xl"
                    onClick={() => navigate('/quote/new')}
                >
                    <Plus size={20} className="mr-2" /> Új Árajánlat
                </Button>
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
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const url = `${PUBLIC_BASE_URL}/quote/view/${currentUser.uid}/${q.id}`;
                                                window.open(url, '_blank');
                                            }}
                                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                            title="Ügyfél nézet megnyitása"
                                        >
                                            <Eye size={20} />
                                        </button>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const url = `${PUBLIC_BASE_URL}/quote/view/${currentUser.uid}/${q.id}`;

                                                try {
                                                    await Share.share({
                                                        title: `Árajánlat #${q.number}`,
                                                        text: `Küldtem neked egy árajánlatot (${q.buyerName}). Itt tudod megtekinteni és aláírni:`,
                                                        url: url,
                                                        dialogTitle: 'Árajánlat megosztása',
                                                    });

                                                    if (!q.status || q.status === 'draft') {
                                                        await updateStatus(q.id, 'sent');
                                                    }
                                                } catch (err) {
                                                    console.warn('Share error:', err);
                                                    navigator.clipboard.writeText(url);
                                                    alert('Link másolva a vágólapra!');
                                                }
                                            }}
                                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                                            title="Megosztás"
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
        </div>
    );
}
