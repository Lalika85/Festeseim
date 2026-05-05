import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotes } from '../../hooks/useQuotes';
import { useAuth } from '../../hooks/useAuth';
import { 
    Palette, Building2, Image as ImageIcon, 
    Save, ArrowLeft, Building, Trash2,
    Phone, Mail, Wallet, FileText, CheckCircle
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { imageStore } from '../../services/imageStore';

export default function QuoteBranding() {
    const navigate = useNavigate();
    const { branding, profile, updateBranding, updateProfile, loading } = useQuotes();
    const { isAdmin } = useAuth();
    const { showToast } = useToast();
    
    const [localBranding, setLocalBranding] = useState({
        primaryColor: '#2563eb',
        logoUrl: null
    });
    
    const [localProfile, setLocalProfile] = useState({
        name: '',
        address: '',
        tax: '',
        phone: '',
        email: '',
        bank: ''
    });

    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (branding) {
            setLocalBranding({
                primaryColor: branding.primaryColor || '#2563eb',
                logoUrl: branding.logoUrl || null
            });
        }
        if (profile) {
            setLocalProfile({
                name: profile.name || '',
                address: profile.address || '',
                tax: profile.tax || '',
                phone: profile.phone || '',
                email: profile.email || '',
                bank: profile.bank || ''
            });
        }
    }, [branding, profile]);

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Limit size to 10MB
        if (file.size > 10 * 1024 * 1024) {
            showToast('A fájl túl nagy! Maximum 10MB megengedett.', 'danger');
            return;
        }

        setIsUploading(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result;
                const fileName = `global_logo_${Date.now()}.png`;
                
                // Save to filesystem if native
                const storedPath = await imageStore.saveImage(base64String, fileName);
                
                setLocalBranding(prev => ({ ...prev, logoUrl: storedPath }));
                setIsUploading(false);
                showToast('Logó feltöltve! Ne felejtsd el menteni.', 'info');
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error(err);
            showToast('Hiba a fájl feldolgozásakor!', 'danger');
            setIsUploading(false);
        }
    };

    const handleRemoveLogo = async () => {
        if (localBranding.logoUrl && localBranding.logoUrl.startsWith('file://')) {
            await imageStore.deleteImage(localBranding.logoUrl);
        }
        setLocalBranding(prev => ({ ...prev, logoUrl: null }));
        showToast('Logó eltávolítva. Mentés szükséges.', 'warning');
    };

    const handleSave = async () => {
        try {
            // We save both branding and profile
            // Note: Branding stores logoUrl and color
            // Profile stores the actual business text data
            await Promise.all([
                updateBranding(localBranding),
                updateProfile({ ...profile, ...localProfile, logo: localBranding.logoUrl }) // Sync logo to profile too for safety
            ]);
            showToast('Beállítások sikeresen mentve!', 'success');
            navigate('/quote');
        } catch (err) {
            console.error(err);
            showToast('Hiba a mentés során!', 'danger');
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-500 font-medium">Betöltés...</p>
        </div>
    );

    if (!isAdmin) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-500">Nincs jogosultságod ezekhez a beállításokhoz.</p>
                <Button className="mt-4" onClick={() => navigate('/quote')}>Vissza</Button>
            </div>
        );
    }

    return (
        <div className="pb-24 max-w-4xl mx-auto px-4">
            {/* Header */}
            <div className="flex items-center justify-between py-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/quote')}
                        className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-500 hover:text-primary-600 hover:border-primary-100 transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Arculat és Adatok</h1>
                        <p className="text-sm text-gray-500 mt-1 font-medium">Itt állíthatod be, mi jelenjen meg az árajánlataidon</p>
                    </div>
                </div>
                <Button 
                    className="bg-primary-600 hover:bg-primary-700 text-white shadow-xl shadow-primary-100 px-6"
                    onClick={handleSave}
                >
                    <Save size={20} className="mr-2" /> Mentés
                </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column: Visuals */}
                <div className="lg:col-span-1 space-y-6">
                    <Card title="Megjelenés" icon={<Palette size={20} className="text-primary-600" />}>
                        <div className="space-y-8">
                            {/* Logo */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Céges Logó</label>
                                <div className="relative group">
                                    <div className="w-full aspect-square bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary-200">
                                        {localBranding.logoUrl ? (
                                            <div className="relative w-full h-full p-6">
                                                <img src={imageStore.getUrl(localBranding.logoUrl)} alt="Logo" className="w-full h-full object-contain" />
                                                <button 
                                                    onClick={handleRemoveLogo}
                                                    className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-center p-6">
                                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-gray-300">
                                                    <ImageIcon size={32} />
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-400 leading-tight uppercase tracking-wider">Kattints a feltöltéshez</p>
                                            </div>
                                        )}
                                        <input 
                                            type="file" 
                                            className="absolute inset-0 opacity-0 cursor-pointer" 
                                            onChange={handleLogoUpload}
                                            accept="image/*"
                                            disabled={isUploading}
                                        />
                                    </div>
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-white/80 rounded-[2rem] flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Color */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Márka Szín</label>
                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="relative">
                                        <input 
                                            type="color" 
                                            value={localBranding.primaryColor}
                                            onChange={(e) => setLocalBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                                            className="w-12 h-12 rounded-xl border-4 border-white shadow-sm cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-black text-gray-900 uppercase font-mono">{localBranding.primaryColor}</p>
                                        <p className="text-[10px] text-gray-400 font-medium">PDF elemek színe</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Preview Helper */}
                    <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] shadow-sm">
                        <div className="flex items-center gap-3 text-amber-700 mb-3">
                            <FileText size={20} />
                            <h4 className="font-bold">Hogyan fog kinézni?</h4>
                        </div>
                        <p className="text-xs text-amber-600/80 leading-relaxed font-medium">
                            A logó és a szín azonnal érvénybe lép az összes meglévő és jövőbeli árajánlatodon. A szín a táblázatok fejlécénél, a logó pedig a dokumentum tetején jelenik meg.
                        </p>
                    </div>
                </div>

                {/* Right Column: Business Data */}
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Vállalkozás Adatai" icon={<Building2 size={20} className="text-primary-600" />}>
                        <div className="space-y-6">
                            <div className="grid sm:grid-cols-2 gap-6">
                                <Input 
                                    label="Cégnév / Vállalkozás neve" 
                                    placeholder="Pl. Kovács és Társa Kft."
                                    icon={<Building size={18} />}
                                    value={localProfile.name}
                                    onChange={(e) => setLocalProfile(prev => ({ ...prev, name: e.target.value }))}
                                />
                                <Input 
                                    label="Adószám" 
                                    placeholder="12345678-1-12"
                                    icon={<span className="text-[10px] font-black font-mono">TAX</span>}
                                    value={localProfile.tax}
                                    onChange={(e) => setLocalProfile(prev => ({ ...prev, tax: e.target.value }))}
                                />
                            </div>

                            <Input 
                                label="Székhely / Telephely" 
                                placeholder="1234 Város, Utca 5."
                                icon={<Building2 size={18} />}
                                value={localProfile.address}
                                onChange={(e) => setLocalProfile(prev => ({ ...prev, address: e.target.value }))}
                            />

                            <div className="grid sm:grid-cols-2 gap-6">
                                <Input 
                                    label="Telefonszám" 
                                    type="tel"
                                    placeholder="+36 30 123 4567"
                                    icon={<Phone size={18} />}
                                    value={localProfile.phone}
                                    onChange={(e) => setLocalProfile(prev => ({ ...prev, phone: e.target.value }))}
                                />
                                <Input 
                                    label="Email cím" 
                                    type="email"
                                    placeholder="info@ceged.hu"
                                    icon={<Mail size={18} />}
                                    value={localProfile.email}
                                    onChange={(e) => setLocalProfile(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>

                            <Input 
                                label="Bankszámlaszám" 
                                placeholder="HU00 0000 0000 0000 0000 0000"
                                icon={<Wallet size={18} />}
                                value={localProfile.bank}
                                onChange={(e) => setLocalProfile(prev => ({ ...prev, bank: e.target.value }))}
                            />
                        </div>

                        <div className="mt-10 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-3 text-gray-400 bg-gray-50 px-4 py-2 rounded-xl border border-gray-50">
                                <CheckCircle size={18} className="text-green-500 shrink-0" />
                                <span className="text-xs font-medium italic leading-tight">
                                    Az adatok mentés után azonnal frissülnek az összes generált PDF-en.
                                </span>
                            </div>
                            <Button 
                                className="bg-primary-600 hover:bg-primary-700 text-white shadow-xl shadow-primary-100 px-8 py-3 w-full sm:w-auto text-lg"
                                onClick={handleSave}
                            >
                                <Save size={20} className="mr-2" /> Összes Mentése
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
