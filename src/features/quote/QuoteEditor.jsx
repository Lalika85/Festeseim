import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useQuotes, PUBLIC_BASE_URL } from '../../hooks/useQuotes';
import { db, storage } from '../../services/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
    ArrowLeft, Plus, Trash2, Save, Eye, Palette,
    Image as ImageIcon, CheckCircle2, ChevronUp, ChevronDown,
    Settings, FileText, Send, Share2, Download, AlertCircle,
    MessageCircle, Mail, Copy, ExternalLink, Edit
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

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
        items: [],
        note: '',
        status: 'draft',
        projectId: '',
        clientId: ''
    });

    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [modalData, setModalData] = useState({
        id: '',
        description: '',
        qty: '',
        unit: 'm²',
        price: '',
        vat: 27,
        isOptional: false
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
            const { name, address, email, projectId, clientId } = location.state.clientData;
            setFormData(prev => ({
                ...prev,
                buyerName: name || '',
                buyerAddress: address || '',
                buyerEmail: email || '',
                projectId: projectId || '',
                clientId: clientId || ''
            }));
        }

        fetchCompanies();
    }, [currentUser, id, quotes, location.state]);

    // AI Item Listener
    useEffect(() => {
        const handleAIItem = (e) => {
            const item = e.detail;
            const newItem = {
                id: Date.now().toString() + Math.random(),
                description: item.description || '',
                qty: item.qty || 1,
                unit: item.unit || 'm²',
                price: item.price || 0,
                vat: item.vat || 27,
                isOptional: item.isOptional || false
            };

            setFormData(prev => ({
                ...prev,
                items: [...prev.items, newItem]
            }));
        };

        window.addEventListener('ai_add_quote_item', handleAIItem);
        return () => window.removeEventListener('ai_add_quote_item', handleAIItem);
    }, []);

    const handleAddItem = () => {
        setEditingItem(null);
        setModalData({
            id: Date.now().toString(),
            description: '',
            qty: '',
            unit: 'm²',
            price: '',
            vat: 27,
            isOptional: false
        });
        setIsItemModalOpen(true);
    };

    const handleEditItem = (index) => {
        setEditingItem(index);
        const item = formData.items[index];
        setModalData({ ...item });
        setIsItemModalOpen(true);
    };

    const handleSaveItem = (e) => {
        e.preventDefault();
        const newItems = [...formData.items];
        if (editingItem !== null) {
            newItems[editingItem] = modalData;
        } else {
            newItems.push(modalData);
        }
        setFormData({ ...formData, items: newItems });
        setIsItemModalOpen(false);
    };

    const handleRemoveItem = (index) => {
        if (!window.confirm('Biztosan törlöd ezt a tételt?')) return;
        const newItems = formData.items.filter((_, i) => i !== index);
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

    const publicUrl = `${PUBLIC_BASE_URL}/quote/view/${currentUser?.uid}/${id}`;

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
                    <Button variant="secondary" size="sm" onClick={() => navigate('/quote')} className="bg-white shadow-sm border-gray-200">
                        Mégse
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setActiveTab(activeTab === 'editor' ? 'branding' : 'editor')} className="bg-white shadow-sm border-gray-200 whitespace-nowrap">
                        {activeTab === 'editor' ? <Palette size={16} className="xs:mr-2" /> : <FileText size={16} className="xs:mr-2" />}
                        <span className="hidden xs:inline">{activeTab === 'editor' ? 'Arculat' : 'Szerkesztés'}</span>
                    </Button>
                    <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>
                    <div className="flex items-center gap-2">
                        {id && (
                            <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-100 whitespace-nowrap"
                                onClick={() => {
                                    setActiveTab('branding');
                                    setTimeout(() => {
                                        document.getElementById('sharing-section')?.scrollIntoView({ behavior: 'smooth' });
                                    }, 100);
                                }}
                            >
                                <Send size={16} className="xs:mr-2" /> <span className="hidden xs:inline">Küldés</span>
                            </Button>
                        )}
                        <Button size="sm" className="bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-100 whitespace-nowrap" onClick={handleSave}>
                            <Save size={16} className="xs:mr-2" /> <span className="hidden xs:inline">Mentés</span>
                        </Button>
                    </div>
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
                                <div
                                    key={item.id}
                                    className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all hover:border-primary-300 group ${item.isOptional ? 'border-amber-200 bg-amber-50/20' : 'border-gray-200'}`}
                                >
                                    <div className="flex">
                                        {/* Sort area */}
                                        <div className="bg-gray-50 flex flex-col justify-center border-r border-gray-100 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); moveItem(idx, 'up'); }} className="p-1 hover:text-primary-600 rounded" title="Felfelé"><ChevronUp size={16} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); moveItem(idx, 'down'); }} className="p-1 hover:text-primary-600 rounded" title="Lefelé"><ChevronDown size={16} /></button>
                                        </div>

                                        <div className="flex-1 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {item.isOptional && <Badge variant="warning" className="text-[9px] uppercase">Opcionális</Badge>}
                                                    <h3 className="font-bold text-gray-900 truncate">{item.description || 'Névtelen tétel'}</h3>
                                                </div>
                                                <div className="text-xs text-gray-500 font-medium">
                                                    {item.qty || 0} {item.unit} × {Math.round(item.price || 0).toLocaleString()} Ft
                                                    <span className="text-gray-300 mx-2">|</span>
                                                    ÁFA: {item.vat}%
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between md:justify-end gap-x-8 border-t md:border-0 pt-3 md:pt-0">
                                                <div className={`text-right min-w-[120px] ${item.isOptional ? 'text-amber-600/60' : 'text-primary-700'}`}>
                                                    <div className="text-[10px] uppercase font-bold opacity-60">Bruttó összesen</div>
                                                    <div className="font-black text-xl">
                                                        {Math.round((item.qty * item.price) * (1 + (typeof item.vat === 'number' ? item.vat : 0) / 100)).toLocaleString()} Ft
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
                                                    <button
                                                        onClick={() => handleEditItem(idx)}
                                                        className="p-2.5 text-gray-500 hover:text-primary-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                                                        title="Szerkesztés"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <div className="w-px h-4 bg-gray-200"></div>
                                                    <button
                                                        onClick={() => handleRemoveItem(idx)}
                                                        className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                                                        title="Törlés"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {formData.items.length === 0 && (
                                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Plus size={32} className="text-gray-300" />
                                    </div>
                                    <h4 className="text-gray-900 font-bold mb-1">Még nincsenek tételek</h4>
                                    <p className="text-sm text-gray-500 mb-6 px-4">Kattints az "Új tétel" gombra az első tétel felvételéhez</p>
                                    <div className="flex justify-center">
                                        <Button onClick={handleAddItem} variant="secondary" className="bg-white">
                                            <Plus size={18} className="mr-2" /> Első tétel hozzáadása
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Item Management Modal */}
                    <Modal
                        isOpen={isItemModalOpen}
                        onClose={() => setIsItemModalOpen(false)}
                        title={editingItem !== null ? 'Tétel szerkesztése' : 'Új tétel hozzáadása'}
                    >
                        <form onSubmit={handleSaveItem} className="space-y-4">
                            <Input
                                label="Megnevezés"
                                placeholder="Pl. Nappali festése..."
                                value={modalData.description}
                                onChange={e => setModalData({ ...modalData, description: e.target.value })}
                                autoFocus
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Mennyiség"
                                    type="number"
                                    placeholder="0"
                                    value={modalData.qty}
                                    onChange={e => setModalData({ ...modalData, qty: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                />
                                <Select
                                    label="Egység"
                                    options={UNITS.map(u => ({ value: u, label: u }))}
                                    value={modalData.unit}
                                    onChange={e => setModalData({ ...modalData, unit: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Nettó egységár (Ft)"
                                    type="number"
                                    placeholder="0"
                                    value={modalData.price}
                                    onChange={e => setModalData({ ...modalData, price: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                />
                                <Select
                                    label="ÁFA kulcs"
                                    options={VAT_RATES.map(v => ({ value: v.value, label: v.label }))}
                                    value={modalData.vat}
                                    onChange={e => setModalData({ ...modalData, vat: e.target.value === 'AAM' ? 'AAM' : parseInt(e.target.value) })}
                                />
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-10 h-6 rounded-full relative transition-colors ${modalData.isOptional ? 'bg-amber-500' : 'bg-gray-300'}`}>
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${modalData.isOptional ? 'translate-x-4' : ''}`}></div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={modalData.isOptional}
                                        onChange={e => setModalData({ ...modalData, isOptional: e.target.checked })}
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Opcionális tétel</p>
                                        <p className="text-[11px] text-gray-500">Nem számít bele a végösszegbe, külön tételként jelenik meg.</p>
                                    </div>
                                </label>
                            </div>

                            {/* Line total summary in modal */}
                            <div className="p-4 bg-primary-50 rounded-xl border border-primary-100 flex justify-between items-center">
                                <span className="text-sm font-bold text-primary-800 uppercase tracking-wider">Tétel bruttó:</span>
                                <span className="text-xl font-black text-primary-700">
                                    {Math.round((modalData.qty * modalData.price) * (1 + (typeof modalData.vat === 'number' ? modalData.vat : 0) / 100)).toLocaleString()} Ft
                                </span>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsItemModalOpen(false)}>
                                    Mégse
                                </Button>
                                <Button type="submit" className="flex-[2] bg-primary-600 hover:bg-primary-700 text-white">
                                    <CheckCircle2 size={18} className="mr-2" /> {editingItem !== null ? 'Változtatások mentése' : 'Tétel hozzáadása'}
                                </Button>
                            </div>
                        </form>
                    </Modal>

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
