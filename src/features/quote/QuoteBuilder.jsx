import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ArrowLeft, Save, Plus, Trash2, FileText, Download, Calculator } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

export default function QuoteBuilder() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        sellerId: '',
        buyerId: '',
        buyerName: '', // For manual entry or project override
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
        try {
            const [compSnap, projSnap] = await Promise.all([
                getDocs(collection(db, 'users', currentUser.uid, 'companies')),
                getDocs(collection(db, 'users', currentUser.uid, 'projects'))
            ]);
            setCompanies(compSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setProjects(projSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // Set default seller if exists
            if (!formData.sellerId && compSnap.docs.length > 0) {
                setFormData(prev => ({ ...prev, sellerId: compSnap.docs[0].id }));
            }
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
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
        setFormData({
            ...formData,
            items: formData.items.filter(item => item.id !== id)
        });
    };

    const calculateTotals = () => {
        let netTotal = 0;
        let vatTotal = 0;

        formData.items.forEach(item => {
            const lineNet = item.qty * item.price;
            const lineVat = lineNet * (item.vat / 100);
            netTotal += lineNet;
            vatTotal += lineVat;
        });

        return { net: netTotal, vat: vatTotal, gross: netTotal + vatTotal };
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        const seller = companies.find(c => c.id === formData.sellerId) || {};

        // Font setup (using default helvetica usually handles basic latin, but for Hungarian accents UTF-8 font is needed. 
        // For simplicity in this env, we try to use default. If accents fail, we might need a roboto font base64.)
        // We'll stick to standard first.

        // Header
        doc.setFontSize(22);
        doc.text("ÁRAJÁNLAT", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Dátum: ${formData.date}`, 14, 30);
        doc.text(`Érvényes: ${formData.expirationDays} napig`, 14, 35);

        // Seller & Buyer
        doc.setFontSize(12);
        doc.setTextColor(0);

        // Seller
        doc.setFont(undefined, 'bold');
        doc.text("Kivitelező:", 14, 50);
        doc.setFont(undefined, 'normal');
        doc.text(seller.name || "Saját Vállalkozás", 14, 56);
        doc.text(seller.address || "", 14, 62);
        doc.text(`Adószám: ${seller.taxNumber || "-"}`, 14, 68);
        doc.text(`Banksz.: ${seller.bankAccount || "-"}`, 14, 74);
        doc.text(`Tel: ${seller.phone || "-"}`, 14, 80);

        // Buyer
        doc.setFont(undefined, 'bold');
        doc.text("Megrendelő:", 110, 50);
        doc.setFont(undefined, 'normal');
        doc.text(formData.buyerName || "Ügyfél neve", 110, 56);
        doc.text(formData.buyerAddress || "", 110, 62);

        // Table Header
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

        // Items
        formData.items.forEach(item => {
            if (y > 270) { doc.addPage(); y = 20; }

            doc.text(item.description || "Tétel", 16, y);
            doc.text(`${item.qty} ${item.unit}`, 100, y, { align: 'right' });
            doc.text(`${Number(item.price).toLocaleString()} Ft`, 130, y, { align: 'right' });
            doc.text(`${item.vat}%`, 150, y, { align: 'right' });
            doc.text(`${(item.qty * item.price).toLocaleString()} Ft`, 190, y, { align: 'right' });
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

        doc.save(`arajanlat_${formData.buyerName.replace(/\s+/g, '_')}_${formData.date}.pdf`);
    };

    if (loading) return <div className="text-center py-12">Betöltés...</div>;

    const totals = calculateTotals();

    return (
        <div className="view-container">
            <div className="flex items-center gap-3 mb-6">
                <Button variant="secondary" onClick={() => navigate(-1)} className="!p-2.5 rounded-full shadow-sm border-0 bg-white">
                    <ArrowLeft size={22} className="text-gray-700" />
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">Árajánlat Készítő</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card header="Kivitelező Adatai">
                    <Select
                        label="Kiválasztott cég"
                        value={formData.sellerId}
                        onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
                        options={[{ value: '', label: 'Válassz céget...' }, ...companies.map(c => ({ value: c.id, label: c.name }))]}
                    />
                    {formData.sellerId && (() => {
                        const seller = companies.find(c => c.id === formData.sellerId);
                        if (!seller) return null;
                        return (
                            <div className="text-sm text-gray-600 space-y-1 mt-3 p-3 bg-gray-50 rounded-lg">
                                <p className="font-semibold text-gray-900">{seller.name}</p>
                                <p>{seller.address}</p>
                                <p>Adószám: {seller.taxNumber}</p>
                                <p>Bankszámla: {seller.bankAccount}</p>
                            </div>
                        );
                    })()}
                </Card>

                <Card header="Megrendelő Adatai">
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
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Tételek</h3>
                    <div className="flex gap-4">
                        <Input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="!mb-0"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    {formData.items.map((item, idx) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 items-end border-b border-gray-100 pb-4">
                            <div className="col-span-5 md:col-span-4">
                                <label className="block text-xs font-medium text-gray-500 mb-1">{idx === 0 && 'Megnevezés'}</label>
                                <Input
                                    value={item.description}
                                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                    placeholder="Pl. Glettelés"
                                    className="!mb-0"
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-medium text-gray-500 mb-1">{idx === 0 && 'Menny.'}</label>
                                <Input
                                    type="number"
                                    value={item.qty}
                                    onChange={(e) => handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)}
                                    className="!mb-0"
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-medium text-gray-500 mb-1">{idx === 0 && 'Egység'}</label>
                                <Input
                                    value={item.unit}
                                    onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                                    className="!mb-0"
                                />
                            </div>
                            <div className="col-span-3 md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">{idx === 0 && 'Egységár'}</label>
                                <Input
                                    type="number"
                                    value={item.price}
                                    onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                                    className="!mb-0"
                                />
                            </div>
                            <div className="hidden md:block col-span-1">
                                <label className="block text-xs font-medium text-gray-500 mb-1">{idx === 0 && 'ÁFA %'}</label>
                                <select
                                    value={item.vat}
                                    onChange={(e) => handleItemChange(item.id, 'vat', parseFloat(e.target.value))}
                                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                >
                                    <option value={0}>0%</option>
                                    <option value={27}>27%</option>
                                </select>
                            </div>
                            <div className="hidden md:block col-span-2 text-right pb-2 font-medium text-gray-700">
                                {idx === 0 && <span className="block text-xs font-medium text-gray-500 mb-3">Összesen</span>}
                                {(item.qty * item.price).toLocaleString()} Ft
                            </div>
                            <div className="col-span-12 md:col-span-1 flex justify-end md:justify-center">
                                <button
                                    onClick={() => removeItem(item.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                    <Button variant="secondary" onClick={addItem} icon={<Plus size={18} />} className="w-full border-dashed border-gray-300">
                        Új tétel
                    </Button>
                </div>

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

            <Card header="Egyéb információk" className="mb-8">
                <Input
                    label="Megjegyzés"
                    placeholder="Pl. Fizetési határidő, garancia..."
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
            </Card>

            <Button
                onClick={generatePDF}
                className="w-full !py-4 text-lg shadow-xl sticky bottom-6"
                icon={<Download size={24} />}
            >
                PDF Letöltése
            </Button>
        </div>
    );
}
