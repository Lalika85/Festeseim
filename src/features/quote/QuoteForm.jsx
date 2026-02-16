import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { loadUserSettings } from '../../services/firestore';
import { jsPDF } from 'jspdf';

const QuoteForm = ({ isEdit = false }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [clientName, setClientName] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
    const [items, setItems] = useState([]);
    const [profile, setProfile] = useState(null);

    // New item inputs
    const [newItem, setNewItem] = useState({
        name: '',
        qty: '',
        unit: 'm²',
        layers: '',
        price: '',
        priceType: 'net',
        vatRate: 27
    });

    useEffect(() => {
        const loadInitial = async () => {
            if (!currentUser) return;
            const prof = await loadUserSettings(currentUser.uid, 'profile');
            setProfile(prof);

            if (isEdit && id) {
                const docRef = doc(db, 'users', currentUser.uid, 'quotes', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setClientName(data.client);
                    setClientAddress(data.address || '');
                    setQuoteDate(data.date);
                    setItems(data.items || []);
                }
            }
        };
        loadInitial();
    }, [isEdit, id, currentUser]);

    const handleAddItem = () => {
        if (!newItem.name || !newItem.qty || !newItem.price) return;

        const qty = parseFloat(newItem.qty);
        const priceInput = parseFloat(newItem.price);
        const vatRate = parseFloat(newItem.vatRate);

        let netPrice, grossPrice;
        if (newItem.priceType === 'net') {
            netPrice = priceInput;
            grossPrice = priceInput * (1 + vatRate / 100);
        } else {
            grossPrice = priceInput;
            netPrice = priceInput / (1 + vatRate / 100);
        }

        const addedItem = {
            ...newItem,
            qty,
            netPrice,
            grossPrice,
            vatRate,
            totalNet: netPrice * qty,
            totalGross: grossPrice * qty
        };

        setItems([...items, addedItem]);
        setNewItem({ ...newItem, name: '', qty: '', price: '', layers: '' });
    };

    const deleteItem = (idx) => {
        setItems(items.filter((_, i) => i !== idx));
    };

    const totalNet = items.reduce((acc, i) => acc + i.totalNet, 0);
    const totalGross = items.reduce((acc, i) => acc + i.totalGross, 0);

    const handleSave = async () => {
        if (items.length === 0) return alert('Üres árajánlat!');

        const quoteData = {
            id: isEdit ? id : String(Date.now()),
            client: clientName || 'Névtelen',
            address: clientAddress,
            date: quoteDate,
            items: items,
            total: totalGross
        };

        try {
            const docRef = doc(db, 'users', currentUser.uid, 'quotes', quoteData.id);
            await setDoc(docRef, quoteData);
            alert('Árajánlat mentve!');
            navigate('/quote');
        } catch (err) {
            console.error("Error saving quote:", err);
            alert('Hiba a mentéskor!');
        }
    };

    const generatePDF = () => {
        if (items.length === 0) return alert('Nincs tétel az árajánlatban!');

        const doc = new jsPDF();

        // Helper for normalization (basic support for accented characters)
        const n = (t) => t ? String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

        // Header
        doc.setFontSize(22);
        doc.setTextColor(26, 35, 126);
        doc.text("ARAJANLAT", 105, 20, { align: "center" });

        // User Profile (Sender)
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        if (profile?.logo) {
            try { doc.addImage(profile.logo, 'PNG', 10, 30, 40, 0); } catch (e) { }
        }

        const profileX = 140;
        let profileY = 40;
        doc.setFont("helvetica", "bold");
        doc.text(n(profile?.name || "Vallalkozo"), profileX, profileY);
        doc.setFont("helvetica", "normal");
        profileY += 5;
        doc.text(n(profile?.address || ""), profileX, profileY);
        profileY += 5;
        doc.text(`Adoszam: ${n(profile?.tax || "")}`, profileX, profileY);
        profileY += 5;
        doc.text(`Tel: ${n(profile?.phone || "")}`, profileX, profileY);

        // Client Info
        let y = 80;
        doc.setDrawColor(200, 200, 200);
        doc.line(10, y - 5, 200, y - 5);

        doc.setFont("helvetica", "bold");
        doc.text("Megrendelo:", 10, y);
        doc.setFont("helvetica", "normal");
        doc.text(n(clientName), 40, y);
        y += 7;
        doc.text("Cim:", 10, y);
        doc.text(n(clientAddress), 40, y);
        y += 7;
        doc.text("Datum:", 10, y);
        doc.text(n(quoteDate), 40, y);

        // Table Header
        y += 15;
        doc.setFillColor(240, 240, 240);
        doc.rect(10, y - 5, 190, 8, 'F');
        doc.setFont("helvetica", "bold");
        doc.text("Megnevezes", 15, y);
        doc.text("Menny.", 100, y);
        doc.text("Egysegár", 130, y);
        doc.text("Osszesen", 170, y);
        y += 10;

        // Items
        doc.setFont("helvetica", "normal");
        items.forEach((item) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(n(item.name.substring(0, 40)), 15, y);
            doc.text(`${item.qty} ${n(item.unit)}`, 100, y);
            doc.text(`${Math.round(item.grossPrice).toLocaleString()} Ft`, 130, y);
            doc.text(`${Math.round(item.totalGross).toLocaleString()} Ft`, 170, y);
            y += 8;
        });

        // Totals
        y += 10;
        if (y > 260) { doc.addPage(); y = 20; }
        doc.line(130, y - 5, 200, y - 5);
        doc.setFont("helvetica", "bold");
        doc.text("OSSZESEN (Brutto):", 130, y);
        doc.text(`${Math.round(totalGross).toLocaleString()} Ft`, 170, y);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Keszult a Painter's Log alkalmazassal.", 105, 285, { align: "center" });

        doc.save(`arajanlat_${clientName.replace(/\s/g, '_')}.pdf`);
    };

    return (
        <div className="view-container">
            <div className="section-header">
                <button className="btn-icon" onClick={() => navigate('/quote')}>
                    <i className="fas fa-chevron-left"></i>
                </button>
                <h2>{isEdit ? 'Módosítás' : 'Új Árajánlat'}</h2>
                <button className="btn-icon" onClick={handleSave}>
                    <i className="fas fa-save"></i>
                </button>
            </div>

            <div className="card">
                <label>Megrendelő Neve</label>
                <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Pl. Kiss János" />

                <label>Cím</label>
                <input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Város, utca..." />

                <label>Dátum</label>
                <input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} />
            </div>

            <div className="card">
                <h3>Tétel hozzáadása</h3>
                <input
                    placeholder="Megnevezés (pl. Tisztasági festés)"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                        <label>Mennyiség</label>
                        <input type="number" value={newItem.qty} onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label>Egység</label>
                        <select value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}>
                            <option value="m²">m²</option>
                            <option value="méter">méter</option>
                            <option value="db">db</option>
                            <option value="óra">óra</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ flex: 2 }}>
                        <label>Egységár (Ft)</label>
                        <input type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label>Típus</label>
                        <select value={newItem.priceType} onChange={(e) => setNewItem({ ...newItem, priceType: e.target.value })}>
                            <option value="net">Nettó</option>
                            <option value="gross">Bruttó</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                        <label>Rétegek</label>
                        <input type="number" value={newItem.layers} onChange={(e) => setNewItem({ ...newItem, layers: e.target.value })} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label>ÁFA (%)</label>
                        <select value={newItem.vatRate} onChange={(e) => setNewItem({ ...newItem, vatRate: e.target.value })}>
                            <option value="27">27%</option>
                            <option value="5">5%</option>
                            <option value="0">0% (AAM)</option>
                        </select>
                    </div>
                </div>

                <button className="btn btn-secondary full-width" onClick={handleAddItem} type="button">
                    <i className="fas fa-plus"></i> Tétel felvétele
                </button>
            </div>

            <div className="detail-section">
                <div className="section-title">Hozzáadott tételek</div>
                {items.length === 0 ? (
                    <div className="card text-center" style={{ color: 'var(--text-muted)' }}>Nincs tétel.</div>
                ) : (
                    items.map((item, idx) => (
                        <div key={idx} className="list-item" style={{ fontSize: '14px', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                                <strong>{item.name}</strong>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    {item.qty} {item.unit} {item.layers && `• ${item.layers} rtg.`}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', minWidth: '100px' }}>
                                <div>{Math.round(item.totalGross).toLocaleString()} Ft</div>
                                <button className="btn-icon" onClick={() => deleteItem(idx)} style={{ color: 'var(--danger)', padding: '4px' }}>
                                    <i className="fas fa-trash-alt" style={{ fontSize: '14px' }}></i>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {items.length > 0 && (
                <div className="card" style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Nettó: {Math.round(totalNet).toLocaleString()} Ft</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>ÁFA: {Math.round(totalGross - totalNet).toLocaleString()} Ft</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>Bruttó: {Math.round(totalGross).toLocaleString()} Ft</div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn btn-secondary" onClick={generatePDF}>
                    <i className="fas fa-file-pdf"></i> PDF Mentése
                </button>
                <button className="btn btn-primary" onClick={handleSave}>
                    <i className="fas fa-save"></i> Adatok Mentése
                </button>
            </div>
        </div>
    );
};

export default QuoteForm;
