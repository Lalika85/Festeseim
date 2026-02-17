import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db, storage } from '../../services/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { LogOut, User, Bell, Info, Briefcase, Plus, Edit2, Trash2, Upload } from 'lucide-react';

export default function Settings() {
    const { currentUser, logout } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
        taxNumber: '',
        regNumber: '',
        bankAccount: '',
        logoUrl: ''
    });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (currentUser) fetchCompanies();
    }, [currentUser]);

    const fetchCompanies = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'companies'));
            const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCompanies(list);
        } catch (err) {
            console.error("Error fetching companies:", err);
        }
    };

    const handleSave = async () => {
        if (!currentUser || !formData.name) return alert('Név kötelező!');
        setLoading(true);
        try {
            if (editingId) {
                const docRef = doc(db, 'users', currentUser.uid, 'companies', editingId);
                await updateDoc(docRef, formData);
            } else {
                await addDoc(collection(db, 'users', currentUser.uid, 'companies'), formData);
            }
            await fetchCompanies();
            handleCloseModal();
        } catch (err) {
            console.error("Error saving company:", err);
            alert('Hiba történt mentéskor.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Biztosan törlöd ezt a céget?')) return;
        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'companies', id));
            await fetchCompanies();
        } catch (err) {
            console.error("Error deleting company:", err);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const storageRef = ref(storage, `logos/${currentUser.uid}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            setFormData(prev => ({ ...prev, logoUrl: url }));
        } catch (err) {
            console.error("Upload error:", err);
            alert('Hiba a képfeltöltéskor!');
        } finally {
            setUploading(false);
        }
    };

    const openModal = (company = null) => {
        if (company) {
            setEditingId(company.id);
            setFormData(company);
        } else {
            setEditingId(null);
            setFormData({
                name: '', address: '', phone: '', email: '',
                taxNumber: '', regNumber: '', bankAccount: '', logoUrl: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
    };

    return (
        <div className="view-container">
            <h1 className="text-2xl font-bold mb-6">Beállítások</h1>

            <Card header="Saját Cégeim" className="mb-6">
                <div className="space-y-4">
                    {companies.map(comp => (
                        <div key={comp.id} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between bg-gray-50">
                            <div className="flex items-center gap-4">
                                {comp.logoUrl ? (
                                    <img src={comp.logoUrl} alt="Logo" className="w-12 h-12 object-contain bg-white rounded-lg border border-gray-200" />
                                ) : (
                                    <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-gray-400">
                                        <Briefcase size={24} />
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-bold text-gray-900">{comp.name}</h4>
                                    <p className="text-sm text-gray-500">{comp.taxNumber}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => openModal(comp)} className="!p-2">
                                    <Edit2 size={16} />
                                </Button>
                                <Button variant="secondary" onClick={() => handleDelete(comp.id)} className="!p-2 text-red-500 hover:bg-red-50">
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </div>
                    ))}

                    {companies.length === 0 && (
                        <p className="text-center text-gray-500 py-4">Még nincs cég felvéve.</p>
                    )}

                    <Button onClick={() => openModal()} className="w-full" icon={<Plus size={18} />}>
                        Új Cég Hozzáadása
                    </Button>
                </div>
            </Card>

            <Card header="Fiók" className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="text-primary-600" size={24} />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">{currentUser?.email}</p>
                        <p className="text-sm text-gray-500">Bejelentkezett felhasználó</p>
                    </div>
                </div>
                <Button variant="danger" icon={<LogOut size={20} />} onClick={logout} className="w-full">
                    Kijelentkezés
                </Button>
            </Card>

            <Card header="Alkalmazás info">
                <div className="flex items-center gap-3 text-gray-600">
                    <Info size={20} />
                    <div>
                        <p className="font-medium text-gray-900">Festőnapló</p>
                        <p className="text-sm text-gray-500">Verzió 6.0.0</p>
                    </div>
                </div>
            </Card>

            {/* Company Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingId ? "Cég Szerkesztése" : "Új Cég"}
            >
                <div className="space-y-3">
                    <div className="flex justify-center mb-4">
                        <div className="relative group">
                            <div className="w-24 h-24 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                                {formData.logoUrl ? (
                                    <img src={formData.logoUrl} alt="Preview" className="w-full h-full object-contain" />
                                ) : (
                                    <span className="text-xs text-gray-400 text-center px-2">Logó feltöltése</span>
                                )}
                            </div>
                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl text-white">
                                <Upload size={24} />
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                            </label>
                            {uploading && <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl"><span className="animate-spin">⏳</span></div>}
                        </div>
                    </div>

                    <Input label="Cégnév *" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Pl. Építő Kft." />
                    <Input label="Cím" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Székhely címe" />
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Adószám" value={formData.taxNumber} onChange={e => setFormData({ ...formData, taxNumber: e.target.value })} placeholder="12345678-1-42" />
                        <Input label="Cégjegyzékszám" value={formData.regNumber} onChange={e => setFormData({ ...formData, regNumber: e.target.value })} placeholder="01-09-..." />
                    </div>
                    <Input label="Bankszámlaszám" value={formData.bankAccount} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} placeholder="00000000-..." />
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        <Input label="Telefon" type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    </div>

                    <Button onClick={handleSave} loading={loading} className="w-full mt-4">Mentés</Button>
                </div>
            </Modal>
        </div>
    );
}
