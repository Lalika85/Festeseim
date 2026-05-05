import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { useQuotes } from '../../hooks/useQuotes';
import { generateQuotePDF } from '../../services/pdfGenerator';
import { loadUserCollection, loadUserSettings } from '../../services/firestore';
import { imageStore } from '../../services/imageStore';
import {
    ArrowLeft, Plus, Trash2, Save, Eye, Palette,
    Image as ImageIcon, CheckCircle2, ChevronUp, ChevronDown,
    Settings, FileText, Send, Share2, Download, AlertCircle,
    MessageCircle, Mail, Copy, ExternalLink, Building,
    Heart, BookOpen, MoreVertical, X, FileSpreadsheet
} from 'lucide-react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { parseSimpleBudget } from '../../utils/excelUtils';
import PremiumModal from '../../components/ui/PremiumModal';
import Modal from '../../components/ui/Modal';
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
    const ownerUid = currentUser?.uid;
    const { projects } = useProjects();
    const { 
        saveQuote, branding, updateBranding, quotes, 
        companies: quotesCompanies, templates, saveTemplate, deleteTemplate 
    } = useQuotes();
    const { isPremium } = useSubscription();
    const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        number: `AJ-${new Date().getFullYear()}/${String(Math.floor(Math.random() * 9000) + 1000)}`,
        date: new Date().toISOString().split('T')[0],
        expirationDays: 15,
        sellerId: '',
        buyerName: '',
        buyerAddress: '',
        buyerEmail: '',
        projectId: '', // Added field
        items: [{ id: Date.now().toString(), description: '', qty: '', unit: 'm²', price: '', vat: 27, isOptional: false }],
        note: '',
        status: 'draft'
    });

    const [activeTab, setActiveTab] = useState('editor'); // editor, branding
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const excelInputRef = useRef(null);

    const handleExcelImport = (e) => {
        if (!isPremium) {
            setIsPremiumModalOpen(true);
            return;
        }

        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const buffer = ev.target.result;
                const importedItems = parseSimpleBudget(buffer);
                
                if (importedItems.length === 0) {
                    alert('Nem találtam feldolgozható tételt az Excelben. Ellenőrizd az oszlopokat (Megnevezés, Mennyiség, Egység, Ár)!');
                    return;
                }

                // Add imported items to existing ones, or replace if current is empty/placeholder
                setFormData(prev => {
                    const cleanPrevItems = prev.items.filter(it => it.description.trim() !== '');
                    return {
                        ...prev,
                        items: [...cleanPrevItems, ...importedItems]
                    };
                });
                
                alert(`Sikeresen beolvastam ${importedItems.length} tételt!`);
            } catch (err) {
                console.error(err);
                alert('Hiba történt az Excel feldolgozása közben.');
            }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = ''; // Reset input
    };
    const [templateToApply, setTemplateToApply] = useState(null);

    useEffect(() => {
        // Default selection for NEW quotes if not already set
        if (!id && quotesCompanies.length > 0 && !formData.sellerId) {
            const defaultComp = quotesCompanies.find(c => c.isDefault);
            if (defaultComp) {
                setFormData(prev => ({ ...prev, sellerId: defaultComp.id }));
            } else {
                setFormData(prev => ({ ...prev, sellerId: quotesCompanies[0].id }));
            }
        }
    }, [quotesCompanies, id, formData.sellerId]);

    useEffect(() => {
        if (id) {
            const existing = quotes.find(q => q.id === id);
            if (existing) setFormData(existing);
        } else if (location.state?.clientData) {
            // Pre-fill from ProjectDetail
            const { name, address, email, projectId } = location.state.clientData;
            setFormData(prev => ({
                ...prev,
                buyerName: name || '',
                buyerAddress: address || '',
                buyerEmail: email || '',
                projectId: projectId || ''
            }));
        }
    }, [id, quotes, location.state]);

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { id: Date.now().toString(), description: '', qty: '', unit: 'm²', price: '', vat: 27, isOptional: false }]
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

    const handleSaveAsTemplate = async (item) => {
        if (!item.description) return alert('Leírás nélkül nem menthető sablon!');
        try {
            await saveTemplate({
                description: item.description,
                unit: item.unit,
                price: item.price,
                vat: item.vat
            });
        } catch (err) {
            console.error(err);
            alert('Hiba a sablon mentésekor!');
        }
    };

    const handleApplyTemplate = (template) => {
        const newItem = {
            id: Date.now().toString(),
            description: template.description,
            qty: '',
            unit: template.unit || 'm²',
            price: template.price || '',
            vat: template.vat || 27,
            isOptional: false
        };
        
        setFormData({
            ...formData,
            items: [...formData.items, newItem]
        });
        setIsTemplateModalOpen(false);
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
            const company = quotesCompanies.find(c => c.id === formData.sellerId) || {};
            
            const sellerData = {
                name: company.name || branding.companyName || "Saját Vállalkozás",
                address: company.address || branding.companyAddress || "",
                taxNumber: company.taxNumber || company.tax || branding.taxNumber || "",
                phone: company.phone || branding.companyPhone || "",
                email: company.email || branding.companyEmail || "",
                bank: company.bankAccount || company.bank || branding.bankAccount || "",
                // LOGIC FIX: Prioritize company logo if a company is selected
                logo: formData.sellerId ? (company.logoUrl || null) : (branding.logoUrl || null),
                primaryColor: company.primaryColor || branding.primaryColor || '#2563eb'
            };

            await generateQuotePDF(formData, sellerData, 'download');
        } catch (err) {
            console.error(err);
            alert('Hiba a PDF generálásakor!');
        }
    };

    const handleShare = async (platform) => {
        try {
            const company = quotesCompanies.find(c => c.id === formData.sellerId) || {};
            const sellerData = {
                name: company.name || branding.companyName || "Saját Vállalkozás",
                address: company.address || branding.companyAddress || "",
                taxNumber: company.taxNumber || company.tax || branding.taxNumber || "",
                phone: company.phone || branding.companyPhone || "",
                email: company.email || branding.companyEmail || "",
                bank: company.bankAccount || company.bank || branding.bankAccount || "",
                logo: formData.sellerId ? (company.logoUrl || null) : (branding.logoUrl || null),
                primaryColor: company.primaryColor || branding.primaryColor || '#2563eb'
            };

            // Sharing the actual PDF is better for an offline/local app
            await generateQuotePDF(formData, sellerData, 'share');
        } catch (err) {
            console.error("Share error:", err);
            alert('Hiba a megosztáskor!');
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



    // Removed invalid publicUrl which caused navigation crashes

    return (
        <div className="pb-24 max-w-4xl mx-auto px-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 border-b border-gray-100 mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="secondary" onClick={() => navigate('/projects')} className="!p-2 shadow-sm bg-white rounded-full">
                        <ArrowLeft size={20} />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 leading-none">Kisvállalkozói Napló</h1>
                        <p className="text-xs text-gray-500 font-medium tracking-wide">PROFESSZIONÁLIS MUNKAVÉGZÉS</p>
                    </div>
                </div>
                <div className="flex items-center flex-wrap gap-2 justify-end">
                    <Button variant="secondary" size="sm" onClick={() => navigate('/quote')} className="bg-white">
                        Mégse
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setActiveTab(activeTab === 'editor' ? 'branding' : 'editor')} className="bg-white">
                        {activeTab === 'editor' ? <Share2 size={16} className="xs:mr-2" /> : <FileText size={16} className="xs:mr-2" />}
                        <span className="hidden xs:inline">{activeTab === 'editor' ? 'Megosztás' : 'Szerkesztés'}</span>
                    </Button>
                    {id && (
                        <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-100"
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
                    <Button size="sm" className="bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-100" onClick={handleSave}>
                        <Save size={16} className="xs:mr-2" /> <span className="hidden xs:inline">Mentés</span>
                    </Button>
                </div>
            </div>

            {activeTab === 'branding' ? (
                <div className="space-y-6">


                    <Card id="sharing-section" title="Megosztás & Előnézet" icon={<Share2 className="text-primary-600" />} className="bg-primary-50 border-primary-100">
                        {id ? (
                            <>
                                <div className="flex flex-col md:flex-row gap-4 mb-6">
                                    <div className="flex-1">
                                        <p className="text-sm text-primary-800 mb-2 font-bold uppercase tracking-wider">Ügyfél nézet</p>
                                        <p className="text-xs text-primary-600 mb-4">Ellenőrizd az ajánlatot, mielőtt elküldöd:</p>
                                        <Button
                                            onClick={() => navigate(`/quote/preview/${id}`)}
                                            className="w-full bg-white text-primary-600 border-2 border-primary-200 hover:bg-primary-50 px-6 h-12 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            <Eye size={20} /> AJÁNLAT ELŐNÉZETE
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
                                    <div className="grid grid-cols-1 gap-3">
                                        <button
                                            onClick={handleShare}
                                            className="flex items-center justify-center gap-3 p-4 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all active:scale-95 group"
                                        >
                                            <Share2 size={24} className="group-hover:scale-110 transition-transform" />
                                            <div className="text-left">
                                                <span className="block text-sm font-bold leading-tight">PDF MEGOSZTÁSA</span>
                                                <span className="block text-[10px] text-primary-100 opacity-80 uppercase tracking-widest font-medium">WhatsApp, Viber, E-mail stb.</span>
                                            </div>
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
                        <div className="space-y-4">
                            <Select
                                label="Kivitelező (Céged)"
                                options={[{ value: '', label: 'Alapértelmezett (Fő adatok)' }, ...quotesCompanies.map(c => ({ value: c.id, label: c.name }))]}
                                value={formData.sellerId}
                                onChange={e => setFormData({ ...formData, sellerId: e.target.value })}
                            />
                            
                            {/* Visual confirmation of seller identity */}
                            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                                {(() => {
                                    const selectedCompany = quotesCompanies.find(c => c.id === formData.sellerId);
                                    const currentLogo = formData.sellerId ? (selectedCompany?.logoUrl || null) : (branding.logoUrl || null);
                                    return (
                                        <>
                                            <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                                                {currentLogo ? (
                                                    <img src={imageStore.getUrl(currentLogo)} alt="Logo" className="w-full h-full object-contain" />
                                                ) : <Building size={16} className="text-gray-300" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-gray-900 truncate">
                                                    {selectedCompany?.name || branding.companyName || "Saját Vállalkozás"}
                                                </p>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Select
                                label="Ügyfél kiválasztása"
                                options={[{ value: '', label: 'Kézi kitöltés / Nincs ügyfél' }, ...projects.map(p => ({ value: p.id, label: p.client }))]}
                                value={formData.projectId || ''}
                                onChange={e => {
                                    const selectedProj = projects.find(p => p.id === e.target.value);
                                    if (selectedProj) {
                                        setFormData({
                                            ...formData,
                                            projectId: selectedProj.id,
                                            buyerName: selectedProj.client || '',
                                            buyerAddress: selectedProj.address || '',
                                            buyerEmail: selectedProj.email || ''
                                        });
                                    } else {
                                        setFormData({ ...formData, projectId: '' });
                                    }
                                }}
                            />
                            <Input label="Ügyfél Neve" placeholder="Pl. Kovács János" value={formData.buyerName} onChange={e => setFormData({ ...formData, buyerName: e.target.value })} />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <Input label="Ügyfél Címe" placeholder="Település, utca..." value={formData.buyerAddress} onChange={e => setFormData({ ...formData, buyerAddress: e.target.value })} />
                        <Input label="Ügyfél Email" type="email" placeholder="email@pelda.hu" value={formData.buyerEmail} onChange={e => setFormData({ ...formData, buyerEmail: e.target.value })} />
                    </div>

                    {/* Items Section */}
                    <div className="mt-10">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Settings size={24} className="text-primary-600" />
                                    Tételek Kezelése
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Add hozzá a munkálatokat és az anyagokat az árajánlathoz.</p>
                            </div>
                                <input 
                                    type="file" 
                                    ref={excelInputRef} 
                                    onChange={handleExcelImport} 
                                    accept=".xlsx, .xls" 
                                    className="hidden" 
                                />
                                <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                <Button 
                                    onClick={() => excelInputRef.current?.click()}
                                    variant="secondary"
                                    className="flex-1 sm:flex-none bg-white border-2 border-green-100 text-green-600 hover:bg-green-50 text-xs sm:text-sm py-2 sm:py-2 px-2 sm:px-4"
                                    icon={<FileSpreadsheet size={16} />}
                                >
                                    <span className="hidden xs:inline ml-1">Excel Import</span>
                                    <span className="xs:hidden ml-1">Excel</span>
                                </Button>
                                <Button 
                                    onClick={() => setIsTemplateModalOpen(true)}
                                    variant="secondary"
                                    className="flex-1 sm:flex-none bg-white border-2 border-primary-100 text-primary-600 hover:bg-primary-50 text-xs sm:text-sm py-2 sm:py-2 px-2 sm:px-4"
                                    icon={<BookOpen size={16} />}
                                >
                                    <span className="ml-1">Sablonok</span>
                                </Button>
                                <Button 
                                    onClick={handleAddItem} 
                                    className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-200 text-xs sm:text-sm py-2 sm:py-2 px-2 sm:px-4"
                                    icon={<Plus size={18} />}
                                >
                                    <span className="ml-1">Új tétel</span>
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {formData.items.map((item, idx) => (
                                <div 
                                    key={item.id} 
                                    className={`relative group bg-white border-2 rounded-2xl transition-all duration-300 ${
                                        item.isOptional 
                                            ? 'border-amber-200 bg-amber-50/10' 
                                            : 'border-gray-100 hover:border-primary-200 shadow-sm hover:shadow-md'
                                    }`}
                                >
                                    {/* Item Header */}
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center justify-center w-7 h-7 bg-primary-100 text-primary-700 text-xs font-black rounded-full">
                                                {idx + 1}
                                            </span>
                                            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Tétel</h3>
                                            {item.isOptional && (
                                                <Badge variant="warning" className="text-[10px] py-0">Opcionális</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 mr-2">
                                                <button 
                                                    onClick={() => moveItem(idx, 'up')} 
                                                    disabled={idx === 0}
                                                    className="p-1 px-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:hover:bg-transparent text-gray-400 transition-colors"
                                                    title="Mozgatás fel"
                                                >
                                                    <ChevronUp size={16} />
                                                </button>
                                                <div className="w-px h-4 bg-gray-200 my-auto"></div>
                                                <button 
                                                    onClick={() => moveItem(idx, 'down')} 
                                                    disabled={idx === formData.items.length - 1}
                                                    className="p-1 px-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:hover:bg-transparent text-gray-400 transition-colors"
                                                    title="Mozgatás le"
                                                >
                                                    <ChevronDown size={16} />
                                                </button>
                                            </div>
                                            <button 
                                                onClick={() => handleSaveAsTemplate(item)} 
                                                className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                title="Mentés sablonként"
                                            >
                                                <Heart size={18} className={templates.some(t => t.description === item.description) ? "fill-rose-500 text-rose-500" : ""} />
                                            </button>
                                            <button 
                                                onClick={() => handleRemoveItem(idx)} 
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Tétel törlése"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Item Body */}
                                    <div className="p-5">
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                            {/* Left Column: Description */}
                                            <div className="lg:col-span-12">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Megnevezés</label>
                                                <textarea
                                                    className="w-full bg-gray-50/50 border-2 border-transparent focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-50 px-4 py-3 rounded-xl text-base font-bold text-gray-900 placeholder-gray-300 transition-all resize-none min-h-[100px]"
                                                    placeholder="Írd ide a munka vagy anyag pontos megnevezését..."
                                                    rows={3}
                                                    value={item.description}
                                                    onChange={e => updateItem(idx, 'description', e.target.value)}
                                                    onInput={(e) => {
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = e.target.scrollHeight + 'px';
                                                    }}
                                                />
                                            </div>

                                            {/* Right Column Grid: Numbers */}
                                            <div className="lg:col-span-12 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-10 gap-4 pt-4 border-t border-gray-50">
                                                <div className="col-span-1 sm:col-span-1 lg:col-span-2">
                                                    <Input
                                                        label="Mennyiség"
                                                        type="number"
                                                        value={item.qty}
                                                        onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                                                        className="!mb-0"
                                                    />
                                                </div>
                                                <div className="col-span-1 sm:col-span-1 lg:col-span-2">
                                                    <Select
                                                        label="Egység"
                                                        value={item.unit}
                                                        onChange={e => updateItem(idx, 'unit', e.target.value)}
                                                        options={UNITS.map(u => ({ label: u, value: u }))}
                                                        className="!mb-0"
                                                    />
                                                </div>
                                                <div className="col-span-2 sm:col-span-2 lg:col-span-2">
                                                    <Input
                                                        label="Net. e.ár (Ft)"
                                                        type="number"
                                                        value={item.price}
                                                        onChange={e => updateItem(idx, 'price', parseInt(e.target.value) || 0)}
                                                        className="!mb-0"
                                                    />
                                                </div>
                                                <div className="col-span-1 sm:col-span-1 lg:col-span-2">
                                                    <Select
                                                        label="ÁFA"
                                                        value={item.vat}
                                                        onChange={e => updateItem(idx, 'vat', e.target.value === 'AAM' ? 'AAM' : parseInt(e.target.value))}
                                                        options={VAT_RATES}
                                                        className="!mb-0 font-bold"
                                                        style={{ paddingLeft: '0.5rem', paddingRight: '1.5rem' }}
                                                    />
                                                </div>
                                                <div className="col-span-1 sm:col-span-1 lg:col-span-2 bg-primary-50/50 rounded-xl p-3 flex flex-col justify-center items-end border border-primary-100">
                                                    <p className="text-[9px] font-black text-primary-400 uppercase tracking-widest mb-1">Tétel Bruttó</p>
                                                    <div className="text-base font-black text-primary-700">
                                                        {Math.round((item.qty * item.price) * (1 + (typeof item.vat === 'number' ? item.vat : 0) / 100)).toLocaleString()} Ft
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Optional Toggle Footer */}
                                        <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
                                            <label className="flex items-center gap-3 cursor-pointer group/opt">
                                                <div className="relative">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.isOptional}
                                                        onChange={e => updateItem(idx, 'isOptional', e.target.checked)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-[11px] font-black uppercase tracking-[1px] transition-colors ${item.isOptional ? 'text-amber-600' : 'text-gray-400 group-hover/opt:text-gray-600'}`}>
                                                        Opcionális tétel
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 italic">Nem adódik hozzá a végösszeghez</span>
                                                </div>
                                            </label>

                                            <div className="text-[10px] text-gray-400 font-medium">
                                                {item.qty && item.price ? `Nettó: ${(item.qty * item.price).toLocaleString()} Ft` : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {formData.items.length > 0 && (
                            <div className="mt-6 flex justify-center">
                                <Button 
                                    variant="outline" 
                                    onClick={handleAddItem}
                                    className="border-dashed border-2 py-4 px-10 hover:bg-primary-50 hover:border-primary-300 text-primary-600 transition-all"
                                >
                                    <Plus size={20} className="mr-2" /> Új tétel felvétele
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Summary Card */}
                    <div className="mt-12 bg-gray-900 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <FileText size={160} />
                        </div>
                        <div className="relative z-10 grid md:grid-cols-3 gap-8 text-center md:text-left">
                            <div>
                                <p className="text-gray-400 text-sm mb-1 uppercase tracking-widest font-bold">Összes Nettó</p>
                                <h3 className="text-2xl font-bold">{(totals.net || 0).toLocaleString()} Ft</h3>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm mb-1 uppercase tracking-widest font-bold">Összes ÁFA</p>
                                <h3 className="text-2xl font-bold">{(totals.vat || 0).toLocaleString()} Ft</h3>
                            </div>
                            <div className="bg-primary-600 rounded-2xl p-4 shadow-lg shadow-primary-900/40">
                                <p className="text-primary-100 text-sm mb-1 uppercase tracking-widest font-bold">Végösszeg (Bruttó)</p>
                                <h3 className="text-3xl font-extrabold">{(totals.gross || 0).toLocaleString()} Ft</h3>
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

            {/* Template Selection Modal */}
            <Modal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                title="Munkadíj & Anyag Sablonok"
                icon={<BookOpen className="text-primary-600" />}
            >
                <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                    {templates.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                            <Heart size={48} className="mx-auto text-gray-300 mb-4 opacity-50" />
                            <p className="text-gray-500 font-medium">Még nincsenek elmentett sablonjaid.</p>
                            <p className="text-xs text-gray-400 mt-2">
                                Az árajánlat készítése közben a <Heart size={12} className="inline inline-block align-middle" /> ikonnal <br />
                                menthetsz el tételeket a sablonok közé.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {templates.map(t => (
                                <div 
                                    key={t.id}
                                    className="group flex items-center justify-between p-4 bg-white border border-gray-100 hover:border-primary-200 rounded-2xl hover:shadow-md transition-all cursor-pointer"
                                    onClick={() => handleApplyTemplate(t)}
                                >
                                    <div className="flex-1 min-w-0 mr-4">
                                        <h4 className="font-bold text-gray-900 text-sm truncate uppercase tracking-wide">{t.description}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-black text-primary-500 bg-primary-50 px-2 py-0.5 rounded">
                                                {(t.price || 0).toLocaleString()} Ft / {t.unit}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                ÁFA: {t.vat === 'AAM' ? 'AAM' : t.vat + '%'}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm('Biztosan törlöd ezt a sablont?')) {
                                                deleteTemplate(t.id);
                                            }
                                        }}
                                        className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="mt-6 flex justify-end">
                    <Button variant="secondary" onClick={() => setIsTemplateModalOpen(false)}> Bezárás </Button>
                </div>
            </Modal>

            <PremiumModal 
                isOpen={isPremiumModalOpen} 
                onClose={() => setIsPremiumModalOpen(false)} 
            />
        </div>
    );
}
