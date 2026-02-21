import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db, storage } from '../../services/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { LogOut, User, Bell, Info, Briefcase, Plus, Edit2, Trash2, Upload, BellRing, CheckCircle, Save } from 'lucide-react';
import { loadUserSettings, syncSettings } from '../../services/firestore';
import { useToast } from '../../hooks/useToast';
import { useNotifications } from '../../contexts/NotificationContext';
import { useProjects } from '../../hooks/useProjects';

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
    const { showToast } = useToast();
    const [notifications, setNotifications] = useState({
        upcomingWork: true,
        quoteAccepted: true
    });
    const [isNotifySaving, setIsNotifySaving] = useState(false);
    const { projects } = useProjects();
    const { sendTestNotification } = useNotifications(projects);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        const interval = setInterval(() => {
            const storedLogs = JSON.parse(localStorage.getItem('notification_logs') || '[]');
            setLogs(storedLogs);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const clearLogs = () => {
        localStorage.removeItem('notification_logs');
        setLogs([]);
    };

    useEffect(() => {
        if (currentUser) {
            fetchCompanies();
            fetchNotificationSettings();
        }
    }, [currentUser]);

    const fetchNotificationSettings = async () => {
        const data = await loadUserSettings(currentUser.uid, 'notifications');
        if (data) setNotifications(prev => ({ ...prev, ...data }));
    };

    const handleSaveNotifications = async () => {
        if (!currentUser) return;
        setIsNotifySaving(true);
        try {
            await syncSettings(currentUser.uid, 'notifications', notifications);
            showToast('Értesítési beállítások mentve!', 'success');
        } catch (err) {
            console.error("Error saving notifications:", err);
            showToast('Hiba a mentéskor!', 'danger');
        } finally {
            setIsNotifySaving(false);
        }
    };

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

            <Card header="Értesítések" className="mb-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <BellRing size={18} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-gray-900">Holnapi munka</div>
                                <div className="text-xs text-gray-500">Jelezzen, ha másnap munka kezdődik</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notifications.upcomingWork}
                                onChange={(e) => setNotifications(prev => ({ ...prev, upcomingWork: e.target.checked }))}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                <CheckCircle size={18} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-gray-900">Árajánlat elfogadás</div>
                                <div className="text-xs text-gray-500">Jelezzen, ha aláírták az ajánlatot</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notifications.quoteAccepted}
                                onChange={(e) => setNotifications(prev => ({ ...prev, quoteAccepted: e.target.checked }))}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>

                    <Button
                        onClick={handleSaveNotifications}
                        loading={isNotifySaving}
                        className="w-full mt-2 bg-primary-600 hover:bg-primary-700 h-11"
                        icon={<Save size={18} />}
                    >
                        Beállítások mentése
                    </Button>

                    <div className="pt-4 mt-4 border-t border-gray-100">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-3">Diagnosztika</p>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="secondary"
                                onClick={sendTestNotification}
                                className="w-full h-11 border-dashed border-2 hover:border-primary-300 hover:bg-primary-50 text-gray-600"
                                icon={<Bell size={18} className="text-primary-500" />}
                            >
                                Teszt Értesítés
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    const logs = JSON.parse(localStorage.getItem('notification_logs') || '[]');
                                    const newLog = { timestamp: new Date().toLocaleTimeString(), message: 'Kézi napló teszt ✅', type: 'success' };
                                    localStorage.setItem('notification_logs', JSON.stringify([newLog, ...logs].slice(0, 50)));
                                    setLogs([newLog, ...logs]);
                                }}
                                className="w-full h-11 border-dashed border-2 hover:border-gray-300 hover:bg-gray-50 text-gray-400 text-[10px]"
                            >
                                Napló Teszt
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            <Card header="Rendszer Napló" className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Utolsó események</p>
                    <button onClick={clearLogs} className="text-[10px] text-red-500 font-bold uppercase hover:underline">Törlés</button>
                </div>
                <div className="bg-gray-900 rounded-xl p-3 h-48 overflow-y-auto font-mono text-[10px] space-y-1">
                    {logs.length === 0 ? (
                        <p className="text-gray-500 italic">Nincs rögzített esemény...</p>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className={`flex gap-2 ${log.type === 'success' ? 'text-green-400' :
                                log.type === 'error' ? 'text-red-400' :
                                    log.type === 'warn' ? 'text-yellow-400' : 'text-blue-300'
                                }`}>
                                <span className="opacity-50">[{log.timestamp}]</span>
                                <span>{log.message}</span>
                            </div>
                        ))
                    )}
                </div>
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
