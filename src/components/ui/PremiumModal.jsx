import React from 'react';
import { Crown, CheckCircle2, Zap, Rocket, ShieldCheck, RefreshCw, X } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { useSubscription } from '../../contexts/SubscriptionContext';

export default function PremiumModal({ isOpen, onClose }) {
    const { offerings, purchasePackage, restorePurchases, loading: subLoading } = useSubscription();
    const [selectedPackage, setSelectedPackage] = React.useState('monthly'); // 'monthly' or 'annual'
    const [processing, setProcessing] = React.useState(false);

    // Filter packages from choices if loaded, otherwise show placeholders
    const monthlyPack = offerings?.current?.monthly;
    const annualPack = offerings?.current?.annual;

    // Prices placeholders if not loaded from Google Play yet
    const monthlyPrice = monthlyPack?.product?.priceString || "1 490 Ft / hó";
    const annualPrice = annualPack?.product?.priceString || "14 900 Ft / év";
    const annualSavings = "2 hónap ajándék!";

    const handlePurchase = async () => {
        const packToBuy = selectedPackage === 'monthly' ? monthlyPack : annualPack;
        if (!packToBuy) {
            alert("A csomagok betöltése folyamatban van. Próbáld újra pár másodperc múlva vagy győződj meg róla, hogy be vagy jelentkezve a Play Áruházba!");
            return;
        }

        setProcessing(true);
        const success = await purchasePackage(packToBuy);
        setProcessing(false);
        if (success) {
            onClose();
        }
    };

    const handleRestore = async () => {
        setProcessing(true);
        const success = await restorePurchases();
        setProcessing(false);
        if (success) {
            alert("Sikeresen visszaállítva!");
            onClose();
        } else {
            alert("Nem találtunk aktív előfizetést.");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Válts Prémiumra" className="!p-0">
            <div className="relative overflow-hidden">
                {/* Header with Background Pattern */}
                <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 p-8 text-center relative">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-white rounded-full blur-3xl"></div>
                        <div className="absolute bottom-[-20%] right-[-10%] w-48 h-48 bg-blue-300 rounded-full blur-3xl"></div>
                    </div>
                    
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mb-4 shadow-inner border border-white/30 animate-pulse">
                        <Crown size={32} className="text-yellow-400 fill-yellow-400" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-white mb-2 leading-tight">Pro Verzió Aktiválása</h2>
                    <p className="text-primary-100 text-sm max-w-[250px] mx-auto opacity-90">
                        Hozd ki a maximumot a vállalkozásodból korlátok nélkül!
                    </p>
                </div>

                {/* Benefits Section */}
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                        {[
                            { icon: <Zap className="text-amber-500" size={18} />, title: 'Korlátlan Projekt', desc: 'Nincs limit az ügyfelek és munkák számára.' },
                            { icon: <ShieldCheck className="text-green-500" size={18} />, title: 'Profi Megjelenés', desc: 'Szakmai dokumentumok korlátlan generálása.' },
                            { icon: <Rocket className="text-blue-500" size={18} />, title: 'Kiemelt Funkciók', desc: 'Minden jövőbeli eszközhöz korai hozzáférés.' }
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                <div className="mt-0.5">{item.icon}</div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">{item.title}</h4>
                                    <p className="text-xs text-gray-500">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="h-px bg-gray-100 my-2"></div>

                    {/* Package Selector */}
                    <div className="space-y-3">
                        {/* Monthly Option */}
                        <div 
                            onClick={() => setSelectedPackage('monthly')}
                            className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                selectedPackage === 'monthly' ? 'border-primary-500 bg-primary-50 ring-4 ring-primary-500/10' : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPackage === 'monthly' ? 'border-primary-600' : 'border-gray-300'}`}>
                                        {selectedPackage === 'monthly' && <div className="w-2.5 h-2.5 bg-primary-600 rounded-full"></div>}
                                    </div>
                                    <div>
                                        <span className="block font-bold text-gray-900">Havi Előfizetés</span>
                                        <span className="block text-xs text-gray-500 italic">Rugalmas, bármikor lemondható</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-primary-700">{monthlyPrice}</span>
                                </div>
                            </div>
                        </div>

                        {/* Annual Option */}
                        <div 
                            onClick={() => setSelectedPackage('annual')}
                            className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                selectedPackage === 'annual' ? 'border-primary-500 bg-primary-50 ring-4 ring-primary-500/10' : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                        >
                            <div className="absolute -top-3 right-4 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm z-10">
                                LEGJOBB ÉRTÉK
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPackage === 'annual' ? 'border-primary-600' : 'border-gray-300'}`}>
                                        {selectedPackage === 'annual' && <div className="w-2.5 h-2.5 bg-primary-600 rounded-full"></div>}
                                    </div>
                                    <div>
                                        <span className="block font-bold text-gray-900">Éves Előfizetés</span>
                                        <span className="block text-[10px] text-green-600 font-medium uppercase tracking-wider">{annualSavings}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-primary-700">{annualPrice}</span>
                                    <span className="block text-[10px] text-gray-400">kb. {(14900 / 12).toFixed(0)} Ft / hó</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2">
                        <Button 
                            variant="primary" 
                            className="w-full !py-3.5 !text-lg shadow-lg shadow-primary-500/30"
                            onClick={handlePurchase}
                            loading={processing || subLoading}
                            icon={<Zap size={20} className="fill-current" />}
                        >
                            Pro tagság aktiválása
                        </Button>
                        
                        <div className="flex justify-between mt-4 text-[10px] text-gray-400 font-medium px-4">
                            <button onClick={handleRestore} className="hover:text-primary-600 flex items-center gap-1 uppercase tracking-tighter">
                                <RefreshCw size={10} /> Vásárlások visszaállítása
                            </button>
                            <span className="uppercase tracking-tighter">Bármikor lemondható a Play Áruházban</span>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
