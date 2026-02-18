import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useQuotes } from '../../hooks/useQuotes';
import { db, storage } from '../../services/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
    ArrowLeft, Plus, Trash2, Save, Eye, Palette,
    Image as ImageIcon, CheckCircle2, ChevronUp, ChevronDown,
    Settings, FileText, Send, Share2, Download, AlertCircle,
    MessageCircle, Mail, Copy, ExternalLink
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';

const VAT_RATES = [
    { value: 27, label: '27% (Általános)' },
    { value: 18, label: '18%' },
    { value: 5, label: '5%' },
    { value: 0, label: '0% (TAM)' },
    { value: 'AAM', label: 'AAM (Alanyi Adómentes)' }
];

const UNITS = ['m²', 'fm', 'db', 'óra', 'kg', 'l', 'm³'];

export default function QuoteEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser } = useAuth();
    const { saveQuote, branding, updateBranding, quotes } = useQuotes();

    const [companies, setCompanies] = useState([]);
    const [formData, setFormData] = useState({
        number: `AJ-${new Date().getFullYear()}/${String(Math.floor(Math.random() * 9000) + 1000)}`,
        date: new Date().toISOString().split('T')[0],
        expirationDays: 15,
        sellerId: '',
        buyerName: '',
        buyerAddress: '',
        buyerEmail: '',
        items: [{ id: Date.now().toString(), description: '', qty: 1, unit: 'm²', price: 0, vat: 27, isOptional: false }],
        note: '',
        status: 'draft'
    });

    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('editor'); // editor, branding

    useEffect(() => {
        const fetchCompanies = async () => {
            if (!currentUser) return;
            const snap = await getDocs(collection(db, 'users', currentUser.uid, 'companies'));
            let list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Fallback to Profile data if no companies defined
            if (list.length === 0) {
                const profileSnap = await getDoc(doc(db, 'users', currentUser.uid, 'settings', 'profile'));
                if (profileSnap.exists()) {
                    const p = profileSnap.data();
                    list = [{ id: 'profile', name: p.name || 'Saját Vállalkozás', address: p.address, taxNumber: p.tax, phone: p.phone }];
                }
            }

            setCompanies(list);
            if (list.length > 0 && !formData.sellerId) {
                setFormData(prev => ({ ...prev, sellerId: list[0].id }));
            }
        };

        if (id) {
            const existing = quotes.find(q => q.id === id);
            if (existing) setFormData(existing);
        } else if (location.state?.clientData) {
            // Pre-fill from ProjectDetail
            const { name, address, email } = location.state.clientData;
            setFormData(prev => ({
                ...prev,
                buyerName: name || '',
                buyerAddress: address || '',
                buyerEmail: email || ''
            }));
        }

        fetchCompanies();
    }, [currentUser, id, quotes, location.state]);

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { id: Date.now().toString(), description: '', qty: 1, unit: 'm²', price: 0, vat: 27, isOptional: false }]
        });
    };

    const handleRemoveItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const updateItem = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData({ ...formData, items: newItems });
    };

    const moveItem = (index, direction) => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === formData.items.length - 1) return;

        const newItems = [...formData.items];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
        setFormData({ ...formData, items: newItems });
    };

    const calculateTotals = () => {
        let net = 0;
        let vatAmount = 0;

        formData.items.forEach(item => {
            if (item.isOptional) return;
            const lineNet = (item.qty || 0) * (item.price || 0);
            let rate = typeof item.vat === 'number' ? item.vat : 0;
            const lineVat = lineNet * (rate / 100);
            net += lineNet;
            vatAmount += lineVat;
        });

        return {
            net: Math.round(net),
            vat: Math.round(vatAmount),
            gross: Math.round(net + vatAmount)
        };
    };

    const totals = calculateTotals();

    const handleDownloadPDF = async () => {
        try {
            const seller = companies.find(c => c.id === formData.sellerId) || {};
            const { generateQuotePDF } = await import('../../services/pdfGenerator');
            await generateQuotePDF(formData, seller, 'download');
        } catch (err) {
            console.error(err);
            alert('Hiba a PDF generálásakor!');
        }
    };

    const handleShare = (platform) => {
        const text = `Tisztelt Ügyfelünk! Az alábbi linken tekintheti meg árajánlatunkat:`;
        const url = publicUrl;
        const fullText = `${text} ${url}`;

        switch (platform) {
            case 'whatsapp':
                window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, '_blank');
                break;
            case 'viber':
                window.open(`viber://forward?text=${encodeURIComponent(fullText)}`, '_blank');
                break;
            case 'email':
                window.open(`mailto:?subject=${encodeURIComponent('Árajánlat - ' + (formData.number || ''))}&body=${encodeURIComponent(fullText)}`, '_blank');
                break;
            case 'native':
                if (navigator.share) {
                    navigator.share({
                        title: `Árajánlat - ${formData.number || ''}`,
                        text: text,
                        url: url
                    }).catch(console.error);
                } else {
                    navigator.clipboard.writeText(url);
                    alert('Link másolva!');
                }
                break;
            default:
                navigator.clipboard.writeText(url);
                alert('Link másolva!');
        }
    };

    const handleSave = async () => {
        try {
            const quoteId = await saveQuote({ ...formData, totals });
            alert('Árajánlat mentve!');
            if (!id) navigate(`/quote/edit/${quoteId}`);
        } catch (err) {
            console.error(err);
            alert('Hiba a mentéskor!');
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !currentUser) return;

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `users/${currentUser.uid}/branding/logo_${Date.now()}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            await updateBranding({ ...branding, logoUrl: url });
        } catch (err) {
            console.error(err);
            alert('Sikertelen feltöltés!');
        } finally {
            setIsUploading(false);
        }
    };

    const publicUrl = `${window.location.origin}/quote/view/${currentUser?.uid}/${id}`;

    return (
        <div className="pb-24 max-w-4xl mx-auto px-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 border-b border-gray-100 mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="secondary" onClick={() => navigate('/projects')} className="!p-2 shadow-sm bg-white rounded-full">
                        <ArrowLeft size={20} />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Árajánlatkészítő</h1>
                        <p className="text-sm text-gray-500">Készíts professzionális ajánlatokat percek alatt</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => navigate('/quote')}>
                        Mégse
                    </Button>
                    <Button variant="secondary" onClick={() => setActiveTab(activeTab === 'editor' ? 'branding' : 'editor')}>
                        {activeTab === 'editor' ? <Palette size={18} className="mr-2" /> : <FileText size={18} className="mr-2" />}
                        {activeTab === 'editor' ? 'Arculat' : 'Szerkesztés'}
                    </Button>
                    {id && (
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-100"
                            onClick={() => {
                                setActiveTab('branding');
                                setTimeout(() => {
                                    document.getElementById('sharing-section')?.scrollIntoView({ behavior: 'smooth' });
                                }, 100);
                            }}
                        >
                            <Send size={18} className="mr-2" /> Küldés
                        </Button>
                    )}
                    <Button className="bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-100" onClick={handleSave}>
                        <Save size={18} className="mr-2" /> Mentés
                    </Button>
                </div>
            </div>

            {activeTab === 'branding' ? (
                <div className="space-y-6">
                    <Card title="Arculati Beállítások" icon={<Palette className="text-primary-600" />}>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-4">Céges Logó</label>
                                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-8 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative overflow-hidden group">
                                    {branding.logoUrl ? (
                                        <img src={branding.logoUrl} alt="Logo" className="max-h-32 object-contain" />
                                    ) : (
                                        <div className="text-center">
                                            <ImageIcon size={48} className="mx-auto text-gray-300 mb-2" />
                                            <p className="text-xs text-gray-500">Kattints a feltöltéshez (PNG, JPG)</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleLogoUpload}
                                        disabled={isUploading}
                                    />
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-4">Elsődleges Márka-szín</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="color"
                                        value={branding.primaryColor || '#2563eb'}
                                        onChange={(e) => updateBranding({ ...branding, primaryColor: e.target.value })}
                                        className="w-16 h-16 rounded-xl border-4 border-white shadow-md cursor-pointer"
                                    />
                                    <div>
                                        <p className="font-mono text-gray-600 uppercase mb-1">{branding.primaryColor}</p>
                                        <p className="text-xs text-gray-400">Ez a szín jelenik meg a gombokon és fejléceken a PDF-ben/ügyfél oldalon.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card id="sharing-section" title="Megosztás & Előnézet" icon={<Share2 className="text-primary-600" />} className="bg-primary-50 border-primary-100">
                        {id ? (
                            <>
                                <div className="flex flex-col md:flex-row gap-4 mb-6">
                                    <div className="flex-1">
                                        <p className="text-sm text-primary-800 mb-2 font-bold uppercase tracking-wider">Ügyfél nézet</p>
                                        <p className="text-xs text-primary-600 mb-4">Ellenőrizd az ajánlatot, mielőtt elküldöd:</p>
                                        <Button
                                            variant="secondary"
                                            onClick={() => window.open(publicUrl, '_blank')}
                                            className="w-full bg-white border-primary-200 text-primary-700 font-bold shadow-sm"
                                        >
                                            <Eye size={18} className="mr-2" /> AJÁNLAT ELŐNÉZETE
                                        </Button>
                                    </div>
                                    <div className="flex-1 border-t md:border-t-0 md:border-l border-primary-100 pt-4 md:pt-0 md:pl-4">
                                        <p className="text-sm text-primary-800 mb-2 font-bold uppercase tracking-wider">PDF verzió</p>
                                        <p className="text-xs text-primary-600 mb-4">Letöltés nyomtatáshoz vagy archiváláshoz:</p>
                                        <Button
                                            variant="secondary"
                                            onClick={handleDownloadPDF}
                                            className="w-full bg-white border-primary-200 text-primary-700 font-bold shadow-sm"
                                        >
                                            <Download size={18} className="mr-2" /> PDF LETÖLTÉSE
                                        </Button>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-primary-100">
                                    <p className="text-sm text-primary-800 mb-4 font-bold uppercase tracking-wider">Küldés az ügyfélnek</p>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                                        <button
                                            onClick={() => handleShare('whatsapp')}
                                            className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-2xl hover:border-green-500 hover:bg-green-50 transition-all group"
                                        >
                                            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                                <MessageCircle size={20} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-700">WhatsApp</span>
                                        </button>

                                        <button
                                            onClick={() => handleShare('viber')}
                                            className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-2xl hover:border-purple-500 hover:bg-purple-50 transition-all group"
                                        >
                                            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-2 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                                <MessageCircle size={20} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-700">Viber</span>
                                        </button>

                                        <button
                                            onClick={() => handleShare('email')}
                                            className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                                        >
                                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <Mail size={20} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-700">E-mail</span>
                                        </button>

                                        <button
                                            onClick={() => handleShare('native')}
                                            className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-2xl hover:border-primary-500 hover:bg-primary-50 transition-all group"
                                        >
                                            <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-2 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                                                <Share2 size={20} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-700">Egyéb</span>
                                        </button>
                                    </div>

                                    <div className="flex gap-2 p-1 bg-white border border-primary-100 rounded-xl overflow-hidden shadow-inner">
                                        <input
                                            readOnly
                                            value={publicUrl}
                                            className="flex-1 px-3 py-1.5 bg-transparent text-[11px] text-gray-500 outline-none truncate font-mono"
                                        />
                                        <button
                                            onClick={() => handleShare('copy')}
                                            className="px-3 py-1 bg-primary-50 text-primary-700 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-primary-600 hover:text-white transition-all"
                                        >
                                            Másolás
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-4">
                                <AlertCircle size={32} className="mx-auto text-primary-300 mb-2" />
                                <p className="text-sm text-primary-600 font-medium">A megosztási link csak mentés után lesz elérhető.</p>
                                <p className="text-xs text-primary-400 mt-1">Kattints a fenti "Mentés" gombra az ajánlat véglegesítéséhez.</p>
                            </div>
                        )}
                    </Card>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid md:grid-cols-3 gap-6">
                        <Input label="Sorszám" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} icon={<FileText size={18} />} />
                        <Input label="Dátum" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                        <Input label="Érvényesség (nap)" type="number" value={formData.expirationDays} onChange={e => setFormData({ ...formData, expirationDays: e.target.value })} />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <Select
                            label="Kivitelező (Céged)"
                            options={companies.map(c => ({ value: c.id, label: c.name }))}
                            value={formData.sellerId}
                            onChange={e => setFormData({ ...formData, sellerId: e.target.value })}
                        />
                        <Input label="Ügyfél Neve" placeholder="Pl. Kovács János" value={formData.buyerName} onChange={e => setFormData({ ...formData, buyerName: e.target.value })} />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <Input label="Ügyfél Címe" placeholder="Település, utca..." value={formData.buyerAddress} onChange={e => setFormData({ ...formData, buyerAddress: e.target.value })} />
                        <Input label="Ügyfél Email" type="email" placeholder="email@pelda.hu" value={formData.buyerEmail} onChange={e => setFormData({ ...formData, buyerEmail: e.target.value })} />
                    </div>

                    {/* Items Section */}
                    <div className="mt-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Settings size={20} className="text-primary-600" />
                                Tételek Kezelése
                            </h2>
                            <Button size="sm" variant="secondary" onClick={handleAddItem} className="bg-primary-50 text-primary-600 border-primary-100 hover:bg-primary-100">
                                <Plus size={18} className="mr-1" /> Új tétel
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {formData.items.map((item, idx) => (
                                <div key={item.id} className={`bg-white border rounded-xl p-4 shadow-sm transition-all ${item.isOptional ? 'border-amber-200 bg-amber-50/20' : 'border-gray-200'}`}>
                                    <div className="flex gap-4 items-start">
                                        {/* Sort Controls */}
                                        <div className="flex flex-col gap-1">
                                            <button onClick={() => moveItem(idx, 'up')} className="p-1 hover:bg-gray-100 rounded text-gray-400"><ChevronUp size={16} /></button>
                                            <button onClick={() => moveItem(idx, 'down')} className="p-1 hover:bg-gray-100 rounded text-gray-400"><ChevronDown size={16} /></button>
                                        </div>

                                        <div className="flex-1 grid md:grid-cols-12 gap-3">
                                            <div className="md:col-span-4">
                                                <input
                                                    className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-primary-500 focus:ring-0 px-0 py-2 text-base font-bold text-gray-900 placeholder-gray-300 transition-all mb-1"
                                                    placeholder="Megnevezés (pl. Festés, alapozás...)"
                                                    value={item.description}
                                                    onChange={e => updateItem(idx, 'description', e.target.value)}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.isOptional}
                                                        onChange={e => updateItem(idx, 'isOptional', e.target.checked)}
                                                        className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4"
                                                    />
                                                    <span className="text-[11px] uppercase tracking-wider font-black text-amber-600">Opcionális tétel (nem számít bele az összegbe)</span>
                                                </div>
                                            </div>
                                            <div className="md:col-span-2">
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-primary-500 focus:ring-0 px-0 py-2 text-right font-bold text-gray-800"
                                                    value={item.qty}
                                                    onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value))}
                                                />
                                                <select
                                                    className="w-full bg-transparent border-0 text-[11px] font-bold text-primary-600 p-0 focus:ring-0 cursor-pointer uppercase"
                                                    value={item.unit}
                                                    onChange={e => updateItem(idx, 'unit', e.target.value)}
                                                >
                                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                                <p className="text-[10px] text-gray-400 text-right mt-1 font-bold uppercase">Mennyiség</p>
                                            </div>
                                            <div className="md:col-span-3">
                                                <div className="flex items-center gap-1 border-b border-gray-200 focus-within:border-primary-500 py-1">
                                                    <span className="text-sm text-gray-400 font-bold">Ft</span>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-transparent border-0 focus:ring-0 px-0 py-1 text-right font-black text-gray-900"
                                                        value={item.price}
                                                        onChange={e => updateItem(idx, 'price', parseInt(e.target.value))}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-gray-400 text-right mt-1 font-bold uppercase">Nettó egységár</p>
                                            </div>
                                            <div className="md:col-span-2">
                                                <select
                                                    className="w-full bg-transparent border-0 border-b border-gray-200 focus:border-primary-500 focus:ring-0 px-0 py-2 text-base font-black text-gray-900"
                                                    value={item.vat}
                                                    onChange={e => updateItem(idx, 'vat', e.target.value === 'AAM' ? 'AAM' : parseInt(e.target.value))}
                                                >
                                                    {VAT_RATES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                                                </select>
                                                <p className="text-[10px] text-gray-400 text-right mt-1 font-bold uppercase">ÁFA kulcs (%)</p>
                                            </div>
                                            <div className="md:col-span-1">
                                                <div className="text-right py-2 font-black text-primary-700 text-base">
                                                    {Math.round((item.qty * item.price) * (1 + (typeof item.vat === 'number' ? item.vat : 0) / 100)).toLocaleString()}
                                                </div>
                                                <p className="text-[10px] text-gray-400 text-right mt-1 font-bold uppercase">Bruttó összesen</p>
                                            </div>
                                            <div className="md:col-span-1 flex items-end justify-end">
                                                <button onClick={() => handleRemoveItem(idx)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Summary Card */}
                    <div className="mt-12 bg-gray-900 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <FileText size={160} />
                        </div>
                        <div className="relative z-10 grid md:grid-cols-3 gap-8 text-center md:text-left">
                            <div>
                                <p className="text-gray-400 text-sm mb-1 uppercase tracking-widest font-bold">Összes Nettó</p>
                                <h3 className="text-2xl font-bold">{totals.net.toLocaleString()} Ft</h3>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm mb-1 uppercase tracking-widest font-bold">Összes ÁFA</p>
                                <h3 className="text-2xl font-bold">{totals.vat.toLocaleString()} Ft</h3>
                            </div>
                            <div className="bg-primary-600 rounded-2xl p-4 shadow-lg shadow-primary-900/40">
                                <p className="text-primary-100 text-sm mb-1 uppercase tracking-widest font-bold">Végösszeg (Bruttó)</p>
                                <h3 className="text-3xl font-extrabold">{totals.gross.toLocaleString()} Ft</h3>
                            </div>
                        </div>
                    </div>

                    {/* Note */}
                    <Card header="Megjegyzés az ajánlathoz" className="mt-8 border-0 shadow-md">
                        <textarea
                            className="w-full h-32 p-4 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all resize-none placeholder-gray-300"
                            placeholder="Pl. Fizetési ütemezés, technikai megjegyzések..."
                            value={formData.note}
                            onChange={e => setFormData({ ...formData, note: e.target.value })}
                        ></textarea>
                    </Card>
                </div>
            )}
        </div>
    );
}
