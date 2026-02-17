import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../hooks/useAuth';
import { db, storage } from '../../services/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { ArrowLeft, Save, Plus, Trash2, FileText, Download, Share2, FileDown, FolderOpen } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';

const VAT_RATES = [
    { value: 27, label: '27% (Általános)' },
    { value: 18, label: '18%' },
    { value: 5, label: '5%' },
    { value: 0, label: '0% (TAM, AAM, EU)' },
    { value: 'AAM', label: 'AAM (Alanyi Adómentes)' },
    { value: 'EU', label: 'EU (Közösségi)' },
    { value: 'K.AFA', label: 'K.ÁFA (Különbözet)' }
];

export default function QuoteBuilder() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [projects, setProjects] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [isAppLoading, setIsAppLoading] = useState(false); // For showing spinner vs content
    const [showTemplatesModal, setShowTemplatesModal] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');

    const [formData, setFormData] = useState({
        sellerId: '',
        buyerId: '',
        buyerName: '',
        buyerAddress: '',
        date: new Date().toISOString().slice(0, 10),
        expirationDays: 30,
        note: '',
        items: [{ id: 1, description: '', qty: 1, unit: 'db', price: 0, vat: 27 }]
    });

    useEffect(() => {
        if (currentUser) fetchData();
    }, [currentUser]);

    const fetchData = async () => {
        setIsAppLoading(true);
        try {
            const [compSnap, projSnap, templSnap] = await Promise.all([
                getDocs(collection(db, 'users', currentUser.uid, 'companies')),
                getDocs(collection(db, 'users', currentUser.uid, 'projects')),
                getDocs(collection(db, 'users', currentUser.uid, 'quote_templates'))
            ]);
            setCompanies(compSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setProjects(projSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setTemplates(templSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            if (!formData.sellerId && compSnap.docs.length > 0) {
                setFormData(prev => ({ ...prev, sellerId: compSnap.docs[0].id }));
            }
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
            setIsAppLoading(false);
        }
    };

    const handleBuyerChange = (projectId) => {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            setFormData(prev => ({
                ...prev,
                buyerId: projectId,
                buyerName: project.client || '',
                buyerAddress: project.address || ''
            }));
        } else {
            setFormData(prev => ({ ...prev, buyerId: '', buyerName: '', buyerAddress: '' }));
        }
    };

    const handleItemChange = (id, field, value) => {
        const newItems = formData.items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );
        setFormData({ ...formData, items: newItems });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { id: Date.now(), description: '', qty: 1, unit: 'db', price: 0, vat: 27 }]
        });
    };

    const removeItem = (id) => {
        if (formData.items.length === 1) return;
        setFormData({ ...formData, items: formData.items.filter(item => item.id !== id) });
    };

    const calculateTotals = () => {
        let netTotal = 0;
        let vatTotal = 0;

        formData.items.forEach(item => {
            const lineNet = item.qty * item.price;
            let vatRate = item.vat;

            // Handle string VAT rates (AAM, EU, K.AFA) as 0% for calculation
            if (typeof vatRate === 'string') vatRate = 0;

            const lineVat = lineNet * (vatRate / 100);
            netTotal += lineNet;
            vatTotal += lineVat;
        });

        return { net: netTotal, vat: vatTotal, gross: netTotal + vatTotal };
    };

    const saveTemplate = async () => {
        if (!newTemplateName) return;
        try {
            const templateData = {
                name: newTemplateName,
                items: formData.items,
                note: formData.note,
                createdAt: new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'quote_templates'), templateData);
            setTemplates([...templates, { id: docRef.id, ...templateData }]);
            setNewTemplateName('');
            setIsSavingTemplate(false);
        } catch (err) {
            console.error("Error saving template:", err);
            alert('Hiba a sablon mentésekor!');
        }
    };

    const loadTemplate = (template) => {
        setFormData({
            ...formData,
            items: template.items.map(i => ({ ...i, id: Date.now() + Math.random() })),
            note: template.note || ''
        });
        setShowTemplatesModal(false);
    };

    const deleteTemplate = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Biztosan törlöd a sablont?')) return;
        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'quote_templates', id));
            setTemplates(templates.filter(t => t.id !== id));
        } catch (err) {
            console.error(err);
        }
    }

    const generatePDF = async (action = 'download') => {
        // action: 'download' (browser), 'share' (mobile)
        const doc = new jsPDF();
        const seller = companies.find(c => c.id === formData.sellerId) || {};

        // ... (Header, Seller, Buyer setup same as before) ...
        // Simplified for brevity, assume full PDF generation code here or keep existing

        doc.setFontSize(22);
        doc.text("ÁRAJÁNLAT", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Dátum: ${formData.date}`, 14, 30);
        doc.text(`Érvényes: ${formData.expirationDays} napig`, 14, 35);

        // Seller & Buyer
        doc.setFontSize(12);
        doc.setTextColor(0);

        // Seller details
        doc.setFont(undefined, 'bold');
        doc.text("Kivitelező:", 14, 50);
        doc.setFont(undefined, 'normal');
        doc.text(seller.name || "Saját Vállalkozás", 14, 56);
        doc.text(seller.address || "", 14, 62);
        doc.text(`Adószám: ${seller.taxNumber || "-"}`, 14, 68);
        doc.text(`Tel: ${seller.phone || "-"}`, 14, 74); // Adjusted Y

        // Buyer details
        doc.setFont(undefined, 'bold');
        doc.text("Megrendelő:", 110, 50);
        doc.setFont(undefined, 'normal');
        doc.text(formData.buyerName || "Ügyfél neve", 110, 56);
        doc.text(formData.buyerAddress || "", 110, 62);

        // Table
        let y = 100;
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y - 6, 180, 8, 'F');
        doc.setFont(undefined, 'bold');
        doc.text("Megnevezés", 16, y);
        doc.text("Menny.", 100, y, { align: 'right' });
        doc.text("Egységár", 130, y, { align: 'right' });
        doc.text("ÁFA", 150, y, { align: 'right' });
        doc.text("Összesen", 190, y, { align: 'right' });

        y += 10;
        doc.setFont(undefined, 'normal');

        formData.items.forEach(item => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(item.description || "Tétel", 16, y);
            doc.text(`${item.qty} ${item.unit}`, 100, y, { align: 'right' });
            doc.text(`${Number(item.price).toLocaleString()} Ft`, 130, y, { align: 'right' });

            // Display valid tax label
            const vatLabel = typeof item.vat === 'string' ? item.vat : `${item.vat}%`;
            doc.text(vatLabel, 150, y, { align: 'right' });

            // Calculate line total for display (net)
            const lineTotal = item.qty * item.price;
            doc.text(`${lineTotal.toLocaleString()} Ft`, 190, y, { align: 'right' });
            y += 8;
        });

        // Totals
        y += 10;
        const totals = calculateTotals();
        doc.line(14, y, 194, y);
        y += 10;
        doc.text("Nettó összesen:", 130, y);
        doc.text(`${totals.net.toLocaleString()} Ft`, 190, y, { align: 'right' });
        y += 6;
        doc.text("ÁFA tartalom:", 130, y);
        doc.text(`${totals.vat.toLocaleString()} Ft`, 190, y, { align: 'right' });
        y += 8;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text("Bruttó végösszeg:", 130, y);
        doc.text(`${totals.gross.toLocaleString()} Ft`, 190, y, { align: 'right' });

        // Note
        if (formData.note) {
            y += 20;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text("Megjegyzés:", 14, y);
            const splitNote = doc.splitTextToSize(formData.note, 180);
            doc.text(splitNote, 14, y + 6);
        }

        const fileName = `arajanlat_${formData.buyerName.replace(/\s+/g, '_')}_${formData.date}.pdf`;

        if (action === 'download') {
            doc.save(fileName);
        } else if (action === 'share') {
            try {
                const base64PDF = doc.output('datauristring').split(',')[1];
                await Filesystem.writeFile({
                    path: fileName,
                    data: base64PDF,
                    directory: Directory.Cache,
                });
                const fileResult = await Filesystem.getUri({
                    directory: Directory.Cache,
                    path: fileName,
                });
                await Share.share({
                    title: 'Árajánlat Megosztása',
                    text: `Árajánlat: ${formData.buyerName}`,
                    url: fileResult.uri,
                    dialogTitle: 'Árajánlat küldése',
                });
            } catch (err) {
                console.error('Error sharing PDF:', err);
                alert('Nem sikerült megosztani a PDF-et. Próbáld meg letölteni.');
            }
        }
    };

    if (loading || isAppLoading) return <div className="text-center py-12"><div className="animate-spin text-4xl mb-2">⏳</div><p>Betöltés...</p></div>;
    const totals = calculateTotals();

    return (
        <div className="view-container pb-24">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => navigate(-1)} className="!p-2 shadow-sm border-0 bg-white rounded-full">
                        <ArrowLeft size={20} className="text-gray-700" />
                    </Button>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">Árajánlat</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setShowTemplatesModal(true)} className="!px-3 !py-2">
                        <FolderOpen size={18} className="md:mr-2" />
                        <span className="hidden md:inline">Sablonok</span>
                    </Button>
                    <Button variant="primary" onClick={() => setIsSavingTemplate(true)} className="!px-3 !py-2">
                        <Save size={18} className="md:mr-2" />
                        <span className="hidden md:inline">Mentés</span>
                    </Button>
                </div>
            </div>

            {/* Main Form Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card header="Kivitelező Adatai">
                    <Select
                        label="Kiválasztott cég"
                        value={formData.sellerId}
                        onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
                        options={[{ value: '', label: 'Válassz céget...' }, ...companies.map(c => ({ value: c.id, label: c.name }))]}
                    />
                    {/* ... Seller Details Info ... */}
                </Card>

                <Card header="Megrendelő Adatai">
                    {/* ... Buyer Inputs ... */}
                    <Select
                        label="Meglévő ügyfél betöltése"
                        value={formData.buyerId}
                        onChange={(e) => handleBuyerChange(e.target.value)}
                        options={[{ value: '', label: 'Kézi megadás / Válassz...' }, ...projects.map(p => ({ value: p.id, label: p.client }))]}
                    />
                    <Input
                        label="Megrendelő neve"
                        value={formData.buyerName}
                        onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                        placeholder="Kovács János"
                    />
                    <Input
                        label="Cím"
                        value={formData.buyerAddress}
                        onChange={(e) => setFormData({ ...formData, buyerAddress: e.target.value })}
                        placeholder="Település, utca..."
                    />
                </Card>
            </div>

            <Card className="mb-8">
                {/* Items Header */}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Tételek</h3>
                    <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="!mb-0 w-40" />
                </div>

                <div className="space-y-4">
                    {formData.items.map((item, idx) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 items-end border-b border-gray-100 pb-4">
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-xs font-medium text-gray-500 mb-1">{idx === 0 && 'Megnevezés'}</label>
                                <Input
                                    value={item.description}
                                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                    placeholder="Pl. Glettelés"
                                    className="!mb-0"
                                />
                            </div>
                            <div className="col-span-3 md:col-span-1">
                                <label className="block text-xs font-medium text-gray-500 mb-1">{idx === 0 && 'Menny.'}</label>
                                <Input
                                    type="number"
                                    value={item.qty}
                                    onChange={(e) => handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)}
                                    className="!mb-0"
                                />
                            </div>
                            <div className="col-span-3 md:col-span-1">
                                <label className="block text-xs font-medium text-gray-500 mb-1">{idx === 0 && 'Egység'}</label>
                                <Input
                                    value={item.unit}
                                    onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                                    className="!mb-0"
                                />
                            </div>
                            <div className="col-span-4 md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">{idx === 0 && 'Egységár'}</label>
                                <Input
                                    type="number"
                                    value={item.price}
                                    onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                                    className="!mb-0"
                                />
                            </div>
                            <div className="col-span-4 md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">{idx === 0 && 'ÁFA'}</label>
                                <Select
                                    value={item.vat}
                                    onChange={(e) => handleItemChange(item.id, 'vat', e.target.value === 'AAM' || e.target.value === 'EU' || e.target.value === 'K.AFA' ? e.target.value : parseFloat(e.target.value))}
                                    options={VAT_RATES}
                                    className="!mb-0 !text-xs !px-1"
                                />
                            </div>
                            <div className="col-span-6 md:col-span-1 text-right pb-3 font-medium text-gray-700">
                                {((item.qty * item.price) * (1 + (typeof item.vat === 'number' ? item.vat / 100 : 0))).toLocaleString()}
                            </div>
                            <div className="col-span-2 md:col-span-1 flex justify-end">
                                <button onClick={() => removeItem(item.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))}
                    <Button variant="secondary" onClick={addItem} icon={<Plus size={18} />} className="w-full border-dashed border-gray-300">Új tétel</Button>
                </div>

                {/* Totals Display */}
                <div className="mt-8 flex flex-col items-end gap-2">
                    <div className="flex justify-between w-full md:w-1/3 text-gray-600">
                        <span>Nettó összesen:</span>
                        <span className="font-medium">{totals.net.toLocaleString()} Ft</span>
                    </div>
                    <div className="flex justify-between w-full md:w-1/3 text-gray-600">
                        <span>ÁFA tartalom:</span>
                        <span className="font-medium">{totals.vat.toLocaleString()} Ft</span>
                    </div>
                    <div className="flex justify-between w-full md:w-1/3 text-lg font-bold text-gray-900 border-t border-gray-200 pt-2 mt-2">
                        <span>Bruttó végösszeg:</span>
                        <span>{totals.gross.toLocaleString()} Ft</span>
                    </div>
                </div>
            </Card>

            <Card header="Egyéb információk" className="mb-20">
                <Input
                    label="Megjegyzés"
                    placeholder="Pl. Fizetési határidő, garancia..."
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
            </Card>

            {/* Bottom Floating Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 flex gap-3">
                <Button
                    onClick={() => generatePDF('download')}
                    variant="secondary"
                    className="flex-1"
                    icon={<FileDown size={20} />}
                >
                    Letöltés
                </Button>
                <Button
                    onClick={() => generatePDF('share')}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                    icon={<Share2 size={20} />}
                >
                    Megosztás
                </Button>
            </div>

            {/* Render Modals */}
            <Modal isOpen={isSavingTemplate} onClose={() => setIsSavingTemplate(false)} title="Sablon mentése">
                <div className="space-y-4">
                    <Input
                        label="Sablon neve"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder="Pl. Általános glettelés"
                    />
                    <Button onClick={saveTemplate} disabled={!newTemplateName} className="w-full">Mentés</Button>
                </div>
            </Modal>

            <Modal isOpen={showTemplatesModal} onClose={() => setShowTemplatesModal(false)} title="Sablonok betöltése">
                <div className="space-y-2">
                    {templates.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Nincsenek mentett sablonok.</p>
                    ) : (
                        templates.map(t => (
                            <div key={t.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => loadTemplate(t)}>
                                <div>
                                    <h4 className="font-semibold text-gray-900">{t.name}</h4>
                                    <p className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</p>
                                </div>
                                <button onClick={(e) => deleteTemplate(e, t.id)} className="p-2 text-gray-400 hover:text-red-500">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </Modal>
        </div>
    );
}
