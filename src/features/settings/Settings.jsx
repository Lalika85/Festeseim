import React, { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
// Initialize EmailJS explicitly to ensure the public key is registered
if (import.meta.env.VITE_EMAILJS_PUBLIC_KEY) {
    emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);
}
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useProjects } from '../../hooks/useProjects';
import { useQuotes } from '../../hooks/useQuotes';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useNotifications } from '../../contexts/NotificationContext';
import PremiumModal from '../../components/ui/PremiumModal';
import { auth, db } from '../../services/firebase';
import { 
    loadUserCollection, syncItem, removeItem 
} from '../../services/firestore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import { imageStore } from '../../services/imageStore';
import { localDB } from '../../services/localDB';
import { Shield, FileSpreadsheet, Lock, Unlock, Download, Save, Info, Plus, Trash2, Edit2, LogOut, Briefcase, User, BellRing, Upload, Bell, Image as ImageIcon, Zap, RefreshCw, MessageSquare, Headphones } from 'lucide-react';
import { generateExcelWorkbook, parseExcelWorkbook } from '../../utils/excelUtils';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { syncSettings } from '../../services/firestore';

export default function Settings() {
    const { currentUser, logout, isAdmin, ownerUid } = useAuth();
    const { isPremium, restorePurchases } = useSubscription();
    const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
    
    // Safety guard for logout transition
    if (!currentUser) return null;

    const { companies, saveCompany, deleteCompany } = useQuotes();
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
        logoUrl: '',
        primaryColor: '#2563eb',
        isDefault: false
    });
    const [uploading, setUploading] = useState(false);
    const { showToast } = useToast();
    
    // Notification related states
    const [notifications, setNotifications] = useState({
        upcomingWork: true,
        notifyJobStart: true,
        startLeadTime: '1d',
        notifyDeadline: true,
        endLeadTime: '1d'
    });
    const [isNotifySaving, setIsNotifySaving] = useState(false);
    const { sendTestNotification } = useNotifications();

    // Billing related states
    const [billing, setBilling] = useState({
        provider: 'none',
        billingoKey: '',
        szamlazzAgentKey: ''
    });
    const [isBillingSaving, setIsBillingSaving] = useState(false);

    // PIN State
    const [showPinDialog, setShowPinDialog] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinConfirm, setPinConfirm] = useState('');
    const [isSettingPin, setIsSettingPin] = useState(false);
    
    // Support State
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
    const [supportMessage, setSupportMessage] = useState('');
    const [isSendingSupport, setIsSendingSupport] = useState(false);
    const [showSupportFallback, setShowSupportFallback] = useState(false);
    
    // Account deletion states
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handlePinSave = async () => {
        if (pinInput.length !== 4) {
            showToast('A PIN kódnak 4 számjegyből kell állnia!', 'warning');
            return;
        }

        const currentPin = localDB.cachedPin;
        
        if (!currentPin) {
            // New PIN setup
            if (pinInput !== pinConfirm) {
                showToast('A két kód nem egyezik!', 'danger');
                return;
            }
            // re-encrypt data with new pin
            localDB.reEncrypt(null, pinInput);
            await localDB.setAppPin(pinInput);
            showToast('PIN kód sikeresen beállítva! Az adatok titkosítva lettek.', 'success');
        } else {
            // PIN removal
            if (pinInput === currentPin) {
                // decrypt data back to cleartext if pin removed
                localDB.reEncrypt(currentPin, null);
                await localDB.removeAppPin();
                showToast('PIN kód eltávolítva. Az adatok mostantól nem titkosítottak.', 'info');
            } else {
                showToast('Hibás jelenlegi PIN kód!', 'danger');
                return;
            }
        }
        
        setShowPinDialog(false);
        setPinInput('');
        setPinConfirm('');
        // Trigger reload to apply changes globally
        setTimeout(() => window.location.reload(), 1500);
    };

    const handleSendSupport = async () => {
        if (!supportMessage.trim()) {
            showToast('Kérlek írd le a problémát vagy észrevételt!', 'warning');
            return;
        }
        
        setIsSendingSupport(true);
        setShowSupportFallback(false);
        try {
            const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
            const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
            const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

            if (!serviceId || !templateId || !publicKey) {
                console.error("EmailJS Config missing:", { serviceId, templateId, publicKey });
                throw new Error("EmailJS konfiguráció hiányzik! Ellenőrizd a .env fájlt.");
            }

            const date = new Date();
            const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
            const randomId = Math.random().toString(36).substring(2, 6).toUpperCase();
            const complaintId = `#PAN-${dateStr}-${randomId}`;

            // Log to Firestore for 3-year compliance
            try {
                await addDoc(collection(db, 'complaints'), {
                    complaintId,
                    uid: currentUser.uid,
                    name: currentUser.displayName || 'Felhasználó',
                    email: currentUser.email,
                    message: supportMessage,
                    createdAt: serverTimestamp(),
                    status: 'new',
                    appVersion: 'v6.1.4-FINAL'
                });
            } catch (fsErr) {
                console.error("Firestore logging failed, but proceeding with email:", fsErr);
            }

            const templateParams = {
                user_email: currentUser.email,
                customer_email: currentUser.email,
                email: currentUser.email, // Added to match your screenshot "Válasz erre"
                name: 'Kisvállalkozói Napló', // Added to match your screenshot "Feladó neve"
                complaint_id: complaintId,
                to_email: 'bednarikapps@gmail.com',
                to: 'bednarikapps@gmail.com',
                recipient: 'bednarikapps@gmail.com',
                
                message: supportMessage,
                from_email: currentUser.email,
                from_name: currentUser.displayName || currentUser.email,
                reply_to: currentUser.email,
                subject: `PANASZ - ${complaintId} - ${currentUser.email}`,
                app_version: 'v6.1.4-FINAL'
            };

            // 1. Send to ADMIN (You) - Use template_zhktbx2
            try {
                console.log("Attempting admin notification with: template_zhktbx2");
                await emailjs.send(serviceId, 'template_zhktbx2', templateParams, publicKey);
                console.log("Admin email sent successfully");
            } catch (adminErr) {
                console.error("Admin email failed:", adminErr);
            }

            // 2. Send to CUSTOMER (Confirmation) - Use template_bvtlwpb
            try {
                console.log("Attempting customer confirmation with: template_bvtlwpb");
                await emailjs.send(serviceId, 'template_bvtlwpb', templateParams, publicKey);
                console.log("Customer confirmation sent successfully");
            } catch (custErr) {
                console.error("Customer confirmation failed:", custErr);
            }

            setIsSupportModalOpen(false);
            showToast(`Üzenet naplózva (${complaintId}) és elküldve!`, 'success');
            setSupportMessage('');
        } catch (err) {
            console.error("Support send error details:", err);
            setShowSupportFallback(true);
            showToast("Hiba történt az üzenet küldésekor! Kérlek használd a manuális e-mail opciót.", "danger");
        } finally {
            setIsSendingSupport(false);
        }
    };

    const handleManualEmail = () => {
        const subject = encodeURIComponent(`Ügyfélszolgálati megkeresés - ${currentUser.email}`);
        const body = encodeURIComponent(supportMessage);
        window.location.href = `mailto:bednarikapps@gmail.com?subject=${subject}&body=${body}`;
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            if (window.Capacitor?.isNative) {
                const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
                await FirebaseAuthentication.deleteUser();
            } else {
                await auth.currentUser.delete();
            }
            
            showToast('Fiók sikeresen törölve!', 'success');
            setIsDeleteModalOpen(false);
            // The logout/redirect will be handled by the auth state change listener
        } catch (err) {
            console.error("Account delete error:", err);
            
            if (err.code === 'auth/requires-recent-login' || (err.message && err.message.includes('recent-login'))) {
                alert('A fiók törléséhez friss bejelentkezés szükséges. Kérlek jelentkezz ki, majd jelentkezz be újra, és próbáld meg ismét a törlést!');
            } else {
                showToast('Hiba történt a törlés során! Kérlek próbáld meg később.', 'danger');
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const exportData = async () => {
        if (!isAdmin) return;
        try {
            showToast('Adatmentés előkészítése...', 'info');
            
            const p = localDB.getAll(ownerUid, 'projects');
            const s = localDB.getAll(ownerUid, 'shopping_items');
            const q = localDB.getAll(ownerUid, 'quotes');
            const c = localDB.getAll(ownerUid, 'companies');

            const fullData = {
                projects: p,
                shopping_items: s,
                quotes: q,
                companies: c
            };

            const excelBuffer = generateExcelWorkbook(fullData);
            const fileName = `vallalkozoi_naplo_mentes_${new Date().toISOString().slice(0, 10)}.xlsx`;

            if (Capacitor.isNativePlatform() || window.Capacitor?.isNative) {
                const base64Data = btoa(
                    Array.from(new Uint8Array(excelBuffer))
                        .reduce((data, byte) => data + String.fromCharCode(byte), '')
                );

                const savedFile = await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Cache
                });

                await Share.share({
                    title: 'Kisvállalkozói Napló Biztonsági Mentés',
                    text: 'Itt a Kisvállalkozói Napló alkalmazásból kimentett adataid Excel formátumban.',
                    url: savedFile.uri,
                    dialogTitle: 'Mentés vagy Küldés'
                });
            } else {
                const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
            }
            
            showToast('Excel mentés kész!', 'success');
        } catch (err) {
            console.error("Export error:", err);
            showToast('Hiba az exportáláskor!', 'danger');
        }
    };

    const importData = (e) => {
        // If not logged in, we can't have an ownerUid
        if (!ownerUid) {
            showToast('Kérlek jelentkezz be a visszatöltéshez!', 'danger');
            return;
        }
        
        if (!isPremium) {
            showToast('Az Excel visszatöltés csak Prémium előfizetéssel érhető el!', 'warning');
            setIsPremiumModalOpen(true);
            return;
        }

        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const buffer = ev.target.result;
                const data = parseExcelWorkbook(buffer);
                
                if (window.confirm('FIGYELEM! Ezzel felülírod a jelenlegi adatokat a fájlban lévőkkel. Biztosan folytatod?')) {
                    showToast('Visszatöltés folyamatban...', 'info');
                    
                    // Projects
                    if (data.projects && Array.isArray(data.projects)) {
                        for (const item of data.projects) {
                            if (item.id) localDB.set(ownerUid, 'projects', item.id, item);
                        }
                    }
                    
                    // Shopping items
                    const shopItems = data.shopItems || data.shopping_items || [];
                    if (Array.isArray(shopItems)) {
                        for (const item of shopItems) {
                            if (item.id) localDB.set(ownerUid, 'shopping_items', item.id, item);
                        }
                    }
                    
                    // Quotes
                    if (data.quotes && Array.isArray(data.quotes)) {
                        for (const item of data.quotes) {
                            if (item.id) localDB.set(ownerUid, 'quotes', item.id, item);
                        }
                    }

                    // Companies
                    if (data.companies && Array.isArray(data.companies)) {
                        for (const item of data.companies) {
                            if (item.id) localDB.set(ownerUid, 'companies', item.id, item);
                        }
                    }

                    showToast('Visszatöltés sikeres! Az alkalmazás újraindul.', 'success');
                    setTimeout(() => window.location.reload(), 2000);
                }
            } catch (err) {
                console.error("Import error:", err);
                showToast('Hiba a fájl feldolgozásakor! Lehet, hogy nem megfelelő a formátum.', 'danger');
            }
        };
        reader.readAsArrayBuffer(file);
        
        // Reset input so it can be triggered again with same file
        e.target.value = '';
    };

    useEffect(() => {
        if (ownerUid) {
            fetchNotificationSettings();
            fetchBillingSettings();
        }
    }, [ownerUid]);

    const fetchNotificationSettings = () => {
        const data = localDB.get(ownerUid, 'settings', 'notifications');
        if (data) setNotifications(prev => ({ ...prev, ...data }));
    };

    const fetchBillingSettings = () => {
        const data = localDB.get(ownerUid, 'settings', 'billing');
        if (data) setBilling(prev => ({ ...prev, ...data }));
    };

    const handleSaveNotifications = async () => {
        if (!ownerUid) return;
        setIsNotifySaving(true);
        try {
            localDB.set(ownerUid, 'settings', 'notifications', notifications);
            showToast('Értesítési beállítások mentve!', 'success');
        } catch (err) {
            console.error("Error saving notifications:", err);
            showToast('Hiba a mentéskor!', 'danger');
        } finally {
            setIsNotifySaving(false);
        }
    };

    const handleSaveBilling = async () => {
        // Function no longer needed but kept for potential future use or removed if safe
    };


    const leadTimeOptions = [
        { label: '1 nappal előbb', value: '1d' },
        { label: '2 nappal előbb', value: '2d' },
        { label: '1 héttel előbb', value: '1w' }
    ];

    const handleSave = async () => {
        if (!ownerUid || !formData.name) return alert('Név kötelező!');
        setLoading(true);
        try {
            await saveCompany({ ...formData, id: editingId });
            handleCloseModal();
            showToast('Cég mentve!', 'success');
        } catch (err) {
            console.error("Error saving company:", err);
            alert('Hiba történt mentéskor.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!ownerUid || !window.confirm('Biztosan törlöd ezt a céget?')) return;
        try {
            const company = companies.find(c => c.id === id);
            if (company?.logoUrl && company.logoUrl.startsWith('file://')) {
                await imageStore.deleteImage(company.logoUrl);
            }
            await deleteCompany(id);
            showToast('Cég törölve!', 'success');
        } catch (err) {
            console.error("Error deleting company:", err);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limit size to 10MB - but now it's safe to use large files
        if (file.size > 10 * 1024 * 1024) {
            alert('A fájl túl nagy! Maximum 10MB megengedett.');
            return;
        }

        setUploading(true);
        try {
            const reader = new FileReader();
            reader.onload = async () => {
                if (reader.result) {
                    const id = editingId || String(Date.now());
                    const fileName = `company_logo_${id}_${Date.now()}.png`;
                    
                    // Save to filesystem if native, else returns base64
                    const storedPath = await imageStore.saveImage(reader.result, fileName);
                    
                    setFormData(prev => ({ ...prev, logoUrl: storedPath }));
                    showToast('Logó betöltve!', 'success');
                }
                setUploading(false);
            };
            reader.onerror = (err) => {
                console.error("FileReader error:", err);
                alert('Hiba a fájl beolvasásakor.');
                setUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error("Upload process error:", err);
            setUploading(false);
        }
    };

    const openModal = (company = null) => {
        if (company) {
            setEditingId(company.id);
            setFormData({
                billingProvider: 'none',
                billingoApiKey: '',
                billingoBlockId: '',
                szamlazzAgentKey: '',
                otpEbizApiKey: '',
                ...company
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '', address: '', phone: '', email: '',
                taxNumber: '', regNumber: '', bankAccount: '', logoUrl: '',
                primaryColor: '#2563eb', isDefault: false,
                billingProvider: 'none', billingoApiKey: '', billingoBlockId: '', szamlazzAgentKey: '', otpEbizApiKey: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
    };

    return (
        <div className="view-container pb-20">
            <h1 className="text-2xl font-bold mb-6 flex items-center justify-between">
                Beállítások
            </h1>

            {isAdmin && (
                <Card header="Saját Cégeim" className="mb-6">
                    <div className="space-y-4">
                        {companies.map(comp => (
                            <div key={comp.id} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between bg-gray-50">
                                <div className="flex items-center gap-4">
                                    {comp.logoUrl ? (
                                        <img src={imageStore.getUrl(comp.logoUrl)} alt="Logo" className="w-12 h-12 object-contain bg-white rounded-lg border border-gray-200" />
                                    ) : (
                                        <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-gray-400">
                                            <Briefcase size={24} />
                                        </div>
                                    )}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-gray-900">{comp.name}</h4>
                                            {comp.isDefault && (
                                                <span className="bg-primary-100 text-primary-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Alapértelmezett</span>
                                            )}
                                        </div>
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
            )}

            <Card header="Előfizetés" className="mb-6">
                <div className={`p-4 rounded-2xl border-2 transition-all ${
                    isPremium 
                        ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200' 
                        : 'bg-gray-50 border-gray-100'
                }`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isPremium ? 'bg-amber-200 text-amber-700' : 'bg-white text-gray-400'}`}>
                                <Zap size={24} fill={isPremium ? "currentColor" : "none"} />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">
                                    {isPremium ? 'Prémium Előfizetés' : 'Ingyenes Csomag'}
                                </p>
                                <p className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                                    {isPremium ? 'Minden funkció elérhető' : '2 projekt limit érvényben'}
                                </p>
                            </div>
                        </div>
                        {isPremium && (
                            <span className="bg-amber-500 text-white text-[10px] px-2 py-1 rounded-lg font-black uppercase shadow-sm">PRO</span>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        {!isPremium ? (
                            <Button onClick={() => setIsPremiumModalOpen(true)} className="w-full bg-amber-500 hover:bg-amber-600 border-none shadow-md shadow-amber-200/50" icon={<Zap size={18} />}>
                                Aktiválás
                            </Button>
                        ) : (
                            <Button 
                                variant="outline" 
                                onClick={() => window.open('https://play.google.com/store/account/subscriptions', '_blank')}
                                className="w-full border-amber-200 text-amber-700 hover:bg-amber-100/50"
                                icon={<Edit2 size={16} />}
                            >
                                Kezelés
                            </Button>
                        )}
                        <Button 
                            variant="secondary" 
                            onClick={() => {
                                showToast('Visszaállítás folyamatban...', 'info');
                                restorePurchases();
                            }} 
                            className="w-full bg-white border-gray-200 py-2.5 text-xs text-gray-500"
                            icon={<RefreshCw size={14} />}
                        >
                            Vásárlások visszaállítása
                        </Button>
                    </div>
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
                <div className="space-y-6">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <BellRing size={18} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-gray-900">Program értesítések</div>
                                <div className="text-xs text-gray-500">Általános emlékeztetők engedélyezése</div>
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

                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                    <Plus size={18} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900">Munka kezdete</div>
                                    <div className="text-xs text-gray-500">Emlékeztető a kezdés előtt</div>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={notifications.notifyJobStart}
                                    onChange={(e) => setNotifications(prev => ({ ...prev, notifyJobStart: e.target.checked }))}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                            </label>
                        </div>
                        {notifications.notifyJobStart && (
                            <Select 
                                label="Mikor jelezzen?"
                                value={notifications.startLeadTime}
                                onChange={(e) => setNotifications(prev => ({ ...prev, startLeadTime: e.target.value }))}
                                options={leadTimeOptions}
                                className="!mb-0"
                            />
                        )}
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                    <Trash2 size={18} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900">Határidő közeledte</div>
                                    <div className="text-xs text-gray-500">Figyelmeztetés a befejezés előtt</div>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={notifications.notifyDeadline}
                                    onChange={(e) => setNotifications(prev => ({ ...prev, notifyDeadline: e.target.checked }))}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                            </label>
                        </div>
                        {notifications.notifyDeadline && (
                            <Select 
                                label="Mikor jelezzen?"
                                value={notifications.endLeadTime}
                                onChange={(e) => setNotifications(prev => ({ ...prev, endLeadTime: e.target.value }))}
                                options={leadTimeOptions}
                                className="!mb-0"
                            />
                        )}
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
                        <Button
                            variant="secondary"
                            onClick={sendTestNotification}
                            className="w-full h-11 border-dashed border-2 hover:border-primary-300 hover:bg-primary-50 text-gray-600"
                            icon={<Bell size={18} className="text-primary-500" />}
                        >
                            Teszt Értesítés
                        </Button>
                    </div>
                </div>
            </Card>



            <Card header="Segítség és Kapcsolat" className="mb-6">
                <div className="space-y-4">
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Problémád van az alkalmazással? Vagy csak van egy jó ötleted? Írj nekünk közvetlenül az appból!
                    </p>
                    <Button 
                        onClick={() => setIsSupportModalOpen(true)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                        icon={<MessageSquare size={18} />}
                    >
                        Üzenet küldése az ügyfélszolgálatnak
                    </Button>
                    <div className="flex items-center gap-2 justify-center py-2 opacity-50">
                        <Headphones size={14} className="text-gray-400" />
                        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">bednarikapps@gmail.com</span>
                    </div>
                </div>
            </Card>

            {isAdmin && (
                <>
                    <Card header="Adatbiztonság" className="mb-6">
                        <div className="space-y-5">
                            <div className="flex items-start gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    Biztonsági mentés készítése Excel formátumban. Az importálás felülírja a jelenlegi adatokat – előtte érdemes egy friss mentést készíteni!
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Export Button */}
                                <button
                                    onClick={exportData}
                                    className="group relative flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-2xl cursor-pointer hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100/50 active:scale-[0.97] transition-all duration-200"
                                >
                                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center group-hover:shadow-md group-hover:scale-110 transition-all duration-200">
                                        <Download size={28} className="text-blue-600" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-black text-gray-900 tracking-tight">Excel Mentés</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider font-medium">Adatok exportálása</p>
                                    </div>
                                    <div className="absolute top-3 right-3">
                                        <FileSpreadsheet size={14} className="text-blue-300" />
                                    </div>
                                </button>

                                {/* Import Button */}
                                <label className="group relative flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-100 rounded-2xl cursor-pointer hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100/50 active:scale-[0.97] transition-all duration-200">
                                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center group-hover:shadow-md group-hover:scale-110 transition-all duration-200">
                                        <Upload size={28} className="text-emerald-600" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-black text-gray-900 tracking-tight">Excel Visszatöltés</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider font-medium">Adatok importálása</p>
                                    </div>
                                    <div className="absolute top-3 right-3">
                                        <FileSpreadsheet size={14} className="text-emerald-300" />
                                    </div>
                                    <input type="file" hidden accept=".xlsx" onChange={importData} />
                                </label>
                            </div>
                        </div>
                    </Card>

                    <Card header="Alkalmazás Zárolása">
                        <div 
                            onClick={() => {
                                setShowPinDialog(true);
                                setIsSettingPin(!localDB.cachedPin);
                            }}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer active:scale-[0.98] ${
                                localDB.cachedPin 
                                    ? 'bg-amber-50 border-amber-200 text-amber-900' 
                                    : 'bg-gray-50 border-gray-100 text-gray-600'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${localDB.cachedPin ? 'bg-amber-200' : 'bg-white'}`}>
                                        <Shield size={24} className={localDB.cachedPin ? 'text-amber-700' : 'text-gray-400'} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">PIN Kódos védelem</p>
                                        <p className="text-[10px] opacity-70 uppercase tracking-wider font-bold">
                                            {localDB.cachedPin ? 'Aktív - Adatok titkosítva' : 'Nincs beállítva'}
                                        </p>
                                    </div>
                                </div>
                                {localDB.cachedPin ? <Lock size={20} /> : <Unlock size={20} />}
                            </div>
                        </div>
                    </Card>
                </>
            )}

            {/* Company Modal */}
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? 'Cég Szerkesztése' : 'Új Cég Hozzáadása'}>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                    {/* Logo Upload Section */}
                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[2px] mb-3">Céglogó</label>
                        <div className="relative group">
                            <div className="w-full h-32 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary-300">
                                {formData.logoUrl ? (
                                    <div className="relative w-full h-full p-4 flex items-center justify-center bg-white">
                                        <img src={imageStore.getUrl(formData.logoUrl)} alt="Logo" className="max-w-full max-h-full object-contain" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                            <Upload className="text-white" size={24} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center p-4">
                                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-2 text-gray-300">
                                            <ImageIcon size={24} />
                                        </div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Kattints a feltöltéshez</p>
                                    </div>
                                )}
                                <input 
                                    type="file" 
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                                    onChange={handleFileUpload}
                                    accept="image/*"
                                    disabled={uploading}
                                />
                            </div>
                            {uploading && (
                                <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center z-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 italic text-center">PNG vagy JPG, max 10MB</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Cégnév *" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="pl. Bela Sound Kft." />
                        <Input label="Adószám" value={formData.taxNumber} onChange={e => setFormData({ ...formData, taxNumber: e.target.value })} placeholder="12345678-1-12" />
                    </div>

                    <Input label="Cím" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Telefonszám" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                        <Input label="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Cégjegyzékszám" value={formData.regNumber} onChange={e => setFormData({ ...formData, regNumber: e.target.value })} />
                        <Input label="Bankszámlaszám" value={formData.bankAccount} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end pb-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Márkaszín (PDF-hez)</label>
                            <div className="flex gap-2">
                                <input 
                                    type="color" 
                                    value={formData.primaryColor || '#2563eb'} 
                                    onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                                    className="h-10 w-10 border border-gray-300 rounded cursor-pointer"
                                />
                                <Input 
                                    value={formData.primaryColor} 
                                    onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                                    placeholder="#2563eb"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pb-2">
                            <input 
                                type="checkbox" 
                                id="isDefault"
                                checked={formData.isDefault}
                                onChange={e => setFormData({ ...formData, isDefault: e.target.checked })}
                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">Legyen alapértelmezett</label>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[2px] mb-4">Számlázási Integráció (Ehhez a céghez)</label>
                        <div className="space-y-4">
                            <Select
                                label="Számlázó Rendszer"
                                value={formData.billingProvider || 'none'}
                                onChange={(e) => setFormData(prev => ({ ...prev, billingProvider: e.target.value }))}
                                options={[
                                    { label: 'Nincs beállítva', value: 'none' },
                                    { label: 'Számlázz.hu (Számla Agent)', value: 'szamlazzhu' },
                                    { label: 'Billingo (API v3)', value: 'billingo' },
                                    { label: 'OTP eBIZ', value: 'otpebiz' }
                                ]}
                            />

                            {formData.billingProvider === 'szamlazzhu' && (
                                <Input 
                                    label="Számla Agent API Kulcs" 
                                    type="password"
                                    value={formData.szamlazzAgentKey || ''} 
                                    onChange={e => setFormData({ ...formData, szamlazzAgentKey: e.target.value })}
                                />
                            )}

                            {formData.billingProvider === 'billingo' && (
                                <>
                                    <Input 
                                        label="Billingo API v3 Kulcs" 
                                        type="password"
                                        value={formData.billingoApiKey || ''} 
                                        onChange={e => setFormData({ ...formData, billingoApiKey: e.target.value })}
                                    />
                                    <Input 
                                        label="Billingo Számlatömb ID" 
                                        value={formData.billingoBlockId || ''} 
                                        onChange={e => setFormData({ ...formData, billingoBlockId: e.target.value })}
                                        placeholder="Opcionális (üresen hagyva az első tömböt használja)"
                                    />
                                </>
                            )}

                            {formData.billingProvider === 'otpebiz' && (
                                <>
                                    <Input 
                                        label="OTP eBIZ API Kulcs" 
                                        type="password"
                                        value={formData.otpEbizApiKey || ''} 
                                        onChange={e => setFormData({ ...formData, otpEbizApiKey: e.target.value })}
                                    />
                                    <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                        <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
                                        <p className="text-[10px] text-amber-700 leading-relaxed">
                                            Az API kulcsot az eBIZ fiókodban generálhatod: Beállítások → API kulcsok → Új kulcs generálása. A kulcsot a generáláskor azonnal mentsd el!
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <Button onClick={handleSave} loading={loading} className="w-full mt-4 bg-primary-600 hover:bg-primary-700 text-white">Mentés</Button>
                </div>
            </Modal>

            {/* PIN Dialog */}
            {showPinDialog && (
                <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <Card className="w-full max-w-sm animate-slide-up sm:animate-fade-in !p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Lock size={20} className="text-primary" />
                            {isSettingPin ? 'PIN kód beállítása' : 'PIN kód eltávolítása'}
                        </h3>
                        
                        <div className="space-y-4">
                            <Input 
                                label={isSettingPin ? 'Új 4 jegyű PIN' : 'Jelenlegi PIN kód'}
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                                placeholder="****"
                            />
                            
                            {isSettingPin && (
                                <Input 
                                    label="PIN megerősítése"
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={4}
                                    value={pinConfirm}
                                    onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                                    placeholder="****"
                                />
                            )}
                        </div>

                        <div className="flex gap-3 mt-8">
                            <Button 
                                variant="outline" 
                                className="flex-1 h-12"
                                onClick={() => setShowPinDialog(false)}
                            >
                                Mégse
                            </Button>
                            <Button 
                                className="flex-1 h-12 bg-primary-600"
                                onClick={handlePinSave}
                            >
                                {isSettingPin ? 'Aktiválás' : 'Törlés'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            <PremiumModal 
                isOpen={isPremiumModalOpen} 
                onClose={() => setIsPremiumModalOpen(false)} 
            />
            {/* Support Modal */}
            <Modal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} title="Ügyfélszolgálat">
                <div className="space-y-4">
                    <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100 mb-2">
                        <p className="text-xs text-primary-800 leading-relaxed font-medium">
                            Itt jelezheted ha hibát találtál, vagy ha segítségre van szükséged az alkalmazás használatához.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block ml-1">Az üzeneted</label>
                        <textarea
                            className="w-full h-40 p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:bg-white outline-none transition-all resize-none text-sm text-gray-900"
                            placeholder="Írd le miben segíthetünk..."
                            value={supportMessage}
                            onChange={(e) => setSupportMessage(e.target.value)}
                        ></textarea>
                    </div>

                    <div className="pt-2 space-y-3">
                        <Button 
                            onClick={handleSendSupport}
                            loading={isSendingSupport}
                            className="w-full h-12 bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-200"
                            icon={<Save size={18} />}
                        >
                            Üzenet elküldése
                        </Button>

                        {showSupportFallback && (
                            <Button 
                                onClick={handleManualEmail}
                                variant="secondary"
                                className="w-full h-12 border-2 border-primary-100 text-primary-700 hover:bg-primary-50"
                                icon={<MessageSquare size={18} />}
                            >
                                E-mail küldése manuálisan
                            </Button>
                        )}

                        <p className="text-[9px] text-center text-gray-400 mt-4 uppercase tracking-tighter">
                            A válaszüzenetet a(z) <span className="font-bold">{currentUser.email}</span> címre fogjuk küldeni.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* Account Deletion Section */}
            <div className="mt-8 mb-12 p-4 bg-red-50/50 rounded-3xl border-2 border-dashed border-red-100">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-red-900 uppercase tracking-wider">Veszélyes zóna</h3>
                        <p className="text-[10px] text-red-600 font-medium">Fiók és adatok végleges eltávolítása</p>
                    </div>
                </div>
                
                <p className="text-xs text-red-800/70 leading-relaxed mb-4">
                    A fiók törlése után minden adatod (cégek, projektek, árajánlatok) véglegesen törlődik. Ez a folyamat nem vonható vissza.
                </p>

                <Button 
                    variant="danger" 
                    className="w-full h-12 bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 shadow-none font-bold"
                    onClick={() => setIsDeleteModalOpen(true)}
                    icon={<Trash2 size={18} />}
                >
                    Fiók végleges törlése
                </Button>
            </div>

            {/* Account Deletion Confirmation Modal */}
            <Modal 
                isOpen={isDeleteModalOpen} 
                onClose={() => setIsDeleteModalOpen(false)} 
                title="Fiók törlése"
            >
                <div className="space-y-6">
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                        <div className="flex gap-3">
                            <Info className="text-red-500 shrink-0" size={20} />
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-red-900">Biztosan törölni szeretnéd?</p>
                                <p className="text-xs text-red-800 leading-relaxed">
                                    Ez a művelet **végleges**. Minden elmentett adatod, árajánlatod és beállításod elveszik a felhőből.
                                </p>
                                <p className="text-xs font-black text-red-700 bg-white p-2 rounded-lg border border-red-200 mt-2">
                                    ⚠️ FIGYELEM: Végleges törlés előtt készíts biztonsági mentést (Adatmentés/Exportálás) a telefonodra, hogy az adataid megmaradjanak helyileg!
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button 
                            onClick={handleDeleteAccount}
                            loading={isDeleting}
                            className="w-full h-12 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 font-black uppercase tracking-widest text-xs"
                        >
                            Igen, törölje a fiókomat
                        </Button>
                        <Button 
                            variant="secondary"
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="w-full h-12 border-2 border-gray-100 text-gray-600"
                            disabled={isDeleting}
                        >
                            Mégsem
                        </Button>
                    </div>
                </div>
            </Modal>
            <div className="mt-4 pb-10 text-center opacity-30 text-[10px] font-bold uppercase tracking-widest">
                Kisvállalkozói Napló v3.1
            </div>
        </div>
    );
}
