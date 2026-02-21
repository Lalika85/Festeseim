import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { loadUserSettings, syncSettings, loadUserCollection, syncItem } from '../../services/firestore';
import { useToast } from '../../hooks/useToast';
import { storage } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { User, Building2, Wallet, Phone, Mail, Upload, Download, LogOut, Camera, CheckCircle } from 'lucide-react';

const Profile = () => {
    const { currentUser, logout } = useAuth();
    const { showToast } = useToast();
    const [profile, setProfile] = useState({
        name: '',
        address: '',
        tax: '',
        phone: '',
        email: '',
        bank: '',
        note: '', // Added note field if needed, or remove
        logo: null
    });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!currentUser) return;
            const profileData = await loadUserSettings(currentUser.uid, 'profile');
            if (profileData) setProfile(prev => ({ ...prev, ...profileData }));
            setLoading(false);
        };
        fetchProfile();
    }, [currentUser]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);

        try {
            const storagePath = `user_logos/${currentUser.uid}/logo_${Date.now()}`;
            const storageRef = ref(storage, storagePath);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            setProfile(prev => ({ ...prev, logo: downloadURL }));
            showToast('Logó feltöltve!', 'success');
        } catch (error) {
            console.error("Logo upload error:", error);
            showToast('Hiba a logó feltöltésekor!', 'danger');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await syncSettings(currentUser.uid, 'profile', profile);
            showToast('Profil mentve!', 'success');
        } catch (err) {
            console.error("Profile save error:", err);
            showToast('Hiba a mentéskor!', 'danger');
        }
    };

    const exportData = async () => {
        try {
            const [p, s, q] = await Promise.all([
                loadUserCollection(currentUser.uid, 'projects'),
                loadUserCollection(currentUser.uid, 'shopItems'),
                loadUserCollection(currentUser.uid, 'quotes')
            ]);

            const fullData = {
                metadata: { version: '6.0', date: new Date().toISOString() },
                profile,
                projects: p,
                shopItems: s,
                quotes: q
            };

            const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `festonaplo_mentes_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            showToast('Adatmentés kész!', 'success');
        } catch (err) {
            showToast('Hiba az exportáláskor!', 'danger');
        }
    };

    const importData = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (window.confirm('FIGYELEM! Ezzel felülírod a jelenlegi adatokat. Biztosan folytatod?')) {
                    // Sync profile
                    if (data.profile) await syncSettings(currentUser.uid, 'profile', data.profile);
                    // Sync collections
                    if (data.projects) for (const item of data.projects) await syncItem(currentUser.uid, 'projects', item);
                    if (data.shopItems) for (const item of data.shopItems) await syncItem(currentUser.uid, 'shopItems', item);
                    if (data.quotes) for (const item of data.quotes) await syncItem(currentUser.uid, 'quotes', item);

                    showToast('Importálás sikeres! Frissíts rá.', 'success');
                    setTimeout(() => window.location.reload(), 1500);
                }
            } catch (err) {
                showToast('Érvénytelen fájlformátum!', 'danger');
            }
        };
        reader.readAsText(file);
    };

    if (loading) return <div className="text-center py-12"><div className="animate-spin text-4xl mb-2">⏳</div><p className="text-gray-500">Betöltés...</p></div>;

    return (
        <div className="pb-20">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Profilom</h1>
                    <p className="text-sm text-gray-500">Vállalkozás adatai</p>
                </div>
                <Button variant="danger" onClick={logout} className="!p-2.5 rounded-full shadow-sm bg-red-50 text-red-600 border-red-100 hover:bg-red-100">
                    <LogOut size={20} />
                </Button>
            </div>

            <form onSubmit={handleSave}>
                {/* Logo Section */}
                <Card className="mb-6 text-center !p-6">
                    <div className="relative inline-block mb-4 group">
                        <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg mx-auto">
                            {profile.logo ? (
                                <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <User size={48} className="text-gray-300" />
                            )}
                        </div>
                        <label className="absolute bottom-0 right-0 w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer hover:bg-primary-700 transition-colors">
                            {uploading ? <div className="animate-spin text-xs">⏳</div> : <Camera size={18} />}
                            <input type="file" hidden accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                        </label>
                    </div>
                    <p className="text-sm text-gray-500 mb-0">Érintsd meg a kamera ikont a logó cseréjéhez</p>
                </Card>

                {/* Company Info */}
                <Card className="mb-6" header="Cégadatok">
                    <Input
                        label="Cégnév / Vállalkozó neve"
                        name="name"
                        value={profile.name}
                        onChange={handleChange}
                        icon={<User size={18} />}
                        placeholder="Pl. Lakásfelújítás Kft."
                    />
                    <Input
                        label="Székhely / Lakcím"
                        name="address"
                        value={profile.address}
                        onChange={handleChange}
                        icon={<Building2 size={18} />}
                        placeholder="Város, Utca, Házszám"
                    />
                    <Input
                        label="Adószám"
                        name="tax"
                        value={profile.tax}
                        onChange={handleChange}
                        icon={<span className="text-xs font-bold font-mono">TAX</span>}
                        placeholder="12345678-1-12"
                    />
                    <Input
                        label="Bankszámlaszám"
                        name="bank"
                        value={profile.bank}
                        onChange={handleChange}
                        icon={<Wallet size={18} />}
                        placeholder="HU00 0000 0000 0000..."
                    />
                </Card>

                {/* Contact Info */}
                <Card className="mb-8" header="Kapcsolat">
                    <Input
                        label="Telefonszám"
                        name="phone"
                        value={profile.phone}
                        onChange={handleChange}
                        icon={<Phone size={18} />}
                        type="tel"
                    />
                    <Input
                        label="Email cím"
                        name="email"
                        value={profile.email}
                        onChange={handleChange}
                        icon={<Mail size={18} />}
                        type="email"
                    />
                </Card>

                <div className="mb-10">
                    <Button type="submit" className="w-full h-12 text-lg shadow-lg bg-primary-600 hover:bg-primary-700">
                        <CheckCircle size={20} className="mr-2" /> Beállítások mentése
                    </Button>
                </div>
            </form>

            <div className="border-t border-gray-200 pt-8 pb-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 px-1">Adatkezelés</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div
                        onClick={exportData}
                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                    >
                        <Download size={24} className="text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">Biztonsági mentés</span>
                    </div>
                    <label className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all">
                        <Upload size={24} className="text-green-600" />
                        <span className="text-sm font-medium text-gray-700">Visszatöltés</span>
                        <input type="file" hidden accept=".json" onChange={importData} />
                    </label>
                </div>
                <p className="text-xs text-center text-gray-400 mt-6">
                    Minden adatot a készülékeden és a felhőben tárolunk titkosítva.
                    <br />Verzió: 6.0.0
                </p>
            </div>
        </div>
    );
};

export default Profile;
