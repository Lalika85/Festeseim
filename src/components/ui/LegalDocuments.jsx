import React, { useState, useEffect } from 'react';
import { X, ScrollText, ShieldCheck, FileSignature } from 'lucide-react';

export default function LegalDocuments({ isOpen, onClose, initialTab = 'aszf' }) {
    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    if (!isOpen) return null;

    const tabs = [
        { id: 'aszf', label: 'ÁSZF', icon: ScrollText },
        { id: 'eula', label: 'Felhasználási Feltételek', icon: FileSignature },
        { id: 'privacy', label: 'Adatvédelem', icon: ShieldCheck }
    ];

    return (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            <div className="bg-white w-full max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-slide-up sm:animate-fade-in">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Jogi Dokumentumok</h2>
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mt-1">Kisvállalkozói Napló</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto border-b border-gray-100 px-4 shrink-0 hide-scrollbar">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-4 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${
                                    isActive 
                                    ? 'border-primary-600 text-primary-600' 
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 text-sm text-gray-700 leading-relaxed space-y-6">
                    {activeTab === 'aszf' && <AszfContent />}
                    {activeTab === 'eula' && <EulaContent />}
                    {activeTab === 'privacy' && <PrivacyContent />}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50/50 rounded-b-3xl">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-primary-600/20"
                    >
                        Értettem, bezárás
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Szöveg blokkok ---

function AszfContent() {
    return (
        <div className="space-y-6">
            <div className="bg-primary-50 p-4 rounded-xl border border-primary-100 mb-6">
                <p className="font-bold text-primary-800">Általános Szerződési Feltételek (ÁSZF)</p>
                <p className="text-xs text-primary-600 mt-1">Az elektronikus kereskedelmi szolgáltatásokról szóló 2001. évi CVIII. törvény (Ektv.) alapján.</p>
                <p className="text-xs text-gray-500 mt-2">Hatályos: 2024. január 1-től</p>
            </div>

            <section>
                <h3 className="text-base font-black text-gray-900 mb-2">1. Szolgáltató (Üzemeltető) adatai</h3>
                <ul className="list-disc pl-5 space-y-1 bg-gray-50 p-4 rounded-xl">
                    <li><strong>Név/Cégnév:</strong> [Cégnév / Vállalkozó neve]</li>
                    <li><strong>Székhely:</strong> [Cím / Székhely]</li>
                    <li><strong>Adószám:</strong> [Adószám]</li>
                    <li><strong>Cégjegyzékszám / Nyilvántartási szám:</strong> [Nyilvántartási szám]</li>
                    <li><strong>Kapcsolattartási e-mail:</strong> bednarikapps@gmail.com</li>
                    <li><strong>Tárhelyszolgáltató:</strong> Google Cloud EMEA Limited (Dublin, Írország)</li>
                </ul>
            </section>

            <section>
                <h3 className="text-base font-black text-gray-900 mb-2">2. A Szolgáltatás Tárgya</h3>
                <p>
                    A Szolgáltató a <strong>Kisvállalkozói Napló</strong> mobilalkalmazáson keresztül adminisztrációs 
                    (projektkezelő, árajánlat-készítő és dokumentum-generáló) szoftverszolgáltatást (SaaS) nyújt a Felhasználók részére.
                </p>
            </section>

            <section>
                <h3 className="text-base font-black text-gray-900 mb-2">3. Szerződés létrejötte</h3>
                <p>
                    A szerződés a Felhasználó és a Szolgáltató között az Alkalmazásba történő regisztrációval, 
                    az ÁSZF és az Adatvédelmi Tájékoztató kifejezett elfogadásával jön létre, elektronikus úton megkötött szerződésként. 
                    A szerződés nem minősül írásba foglalt szerződésnek, nyelve magyar.
                </p>
            </section>

            <section>
                <h3 className="text-base font-black text-gray-900 mb-2">4. Díjazás és fizetési feltételek</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Az Alkalmazás alapfunkciói ingyenesen használhatóak.</li>
                    <li>A prémium funkciók (előfizetés) a Google Play vagy Apple App Store rendszerén keresztül vásárolhatók meg (in-app purchase).</li>
                    <li>A fizetési tranzakciók lebonyolítását és a számlázást az alkalmazások áruháza (pl. Google Play) és a RevenueCat szolgáltató végzi, az ő saját ÁSZF-jük érvényes a pénzügyi teljesítésre.</li>
                </ul>
            </section>

            <section>
                <h3 className="text-base font-black text-gray-900 mb-2">5. Elállási jog kivétele</h3>
                <p>
                    A 45/2014. (II. 26.) Korm. rendelet 29. § (1) bek. m) pontja alapján a Felhasználó elveszíti elállási jogát 
                    a nem tárgyi adathordozón nyújtott digitális adattartalom (pl. prémium előfizetés) tekintetében, 
                    amennyiben az alkalmazás használatát a regisztrációval és a prémium csomag megvásárlásával kifejezett beleegyezésével megkezdi.
                </p>
            </section>

            <section>
                <h3 className="text-base font-black text-gray-900 mb-2">6. Hibás teljesítés és Panaszkezelés</h3>
                <p>
                    Az Alkalmazás működésével kapcsolatos panaszokat a Felhasználó az alkalmazás beépített 
                    "Kapcsolat / Segítségkérés" menüpontján keresztül vagy a megadott e-mail címen jelezheti. 
                    A Szolgáltató a panaszokat a fogyasztóvédelmi törvény (Fgytv.) rendelkezései alapján 30 napon belül kivizsgálja.
                </p>
            </section>
        </div>
    );
}

function EulaContent() {
    return (
        <div className="space-y-6">
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-6">
                <p className="font-bold text-orange-800">Felhasználási Feltételek (EULA)</p>
                <p className="text-xs text-orange-600 mt-1">Szerzői jogi és használati korlátozások.</p>
            </div>

            <section>
                <h3 className="text-base font-black text-gray-900 mb-2">1. Felhasználási engedély</h3>
                <p>
                    A Szolgáltató nem kizárólagos, át nem ruházható, korlátozott licenccel engedélyezi a Felhasználó 
                    számára az Alkalmazás saját, üzleti vagy személyes célú használatát a mobileszközén.
                </p>
            </section>

            <section>
                <h3 className="text-base font-black text-gray-900 mb-2">2. Tiltott tevékenységek</h3>
                <p>A Felhasználó nem jogosult:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Az Alkalmazás forráskódjának visszafejtésére (reverse engineering).</li>
                    <li>Az Alkalmazás vagy annak grafikai elemeinek másolására, terjesztésére.</li>
                    <li>Olyan tevékenységet folytatni, amely az Alkalmazás biztonsági rendszereit (Firebase, RevenueCat) kijátssza.</li>
                    <li>Jogellenes, vagy harmadik fél szerzői jogait sértő tartalmakat létrehozni (pl. tiltott logók feltöltése).</li>
                </ul>
            </section>

            <section>
                <h3 className="text-base font-black text-gray-900 mb-2">3. Szellemi Alkotásokhoz Fűződő Jogok</h3>
                <p>
                    Az Alkalmazás teljes dizájnja, a generált PDF-ek arculati elemei (kivéve a felhasználó saját feltöltött logóját), 
                    a szoftverkód és minden kapcsolódó védjegy a Szolgáltató logikai és szellemi tulajdonát képezik.
                </p>
            </section>

            <section>
                <h3 className="text-base font-black text-gray-900 mb-2">4. Felelősségkorlátozás</h3>
                <p>
                    Az Alkalmazás az árajánlatok és számszaki adatok generálását a Felhasználó által megadott adatokból végzi. 
                    A létrehozott dokumentumok jogi, adózási és tartalmi megfelelőségéért kizárólag a Felhasználó felelős. 
                    A Szolgáltató mentesül a készülék elvesztéséből, vagy a biztonsági mentés elmaradásából fakadó adatvesztések felelőssége alól.
                </p>
            </section>
        </div>
    );
}

function PrivacyContent() {
    return (
        <div className="space-y-6">
            <div className="bg-green-50 p-4 rounded-xl border border-green-100 mb-6">
                <p className="font-bold text-green-800">Adatvédelmi Tájékoztató (GDPR)</p>
                <p className="text-xs text-green-600 mt-1">Az EU 2016/679 rendelete és az Infotv. alapján.</p>
                <p className="text-xs text-gray-500 mt-2">Privacy by Design architektúra</p>
            </div>

            <section>
                <h3 className="text-base font-black text-gray-900 mb-2">1. Helyi adattárolás (Privacy by Design)</h3>
                <p className="bg-green-100/50 p-3 rounded-lg border border-green-200">
                    <strong>Fontos!</strong> Az Ön által az alkalmazásba felvitt üzleti adatok (projektek, feladatok, ügyfelek neve, 
                    árajánlatok, céglogó, megjegyzések) <strong>kizárólag a telefonja memóriájában tárolódnak</strong>. 
                    A Szolgáltató ezekhez az adatokhoz nem fér hozzá, azokat szerverre nem továbbítja, így ezek tekintetében adatkezelést nem végez.
                </p>
            </section>

            <section>
                <h3 className="text-base font-black text-gray-900 mb-2">2. Milyen személyes adatokat kezelünk?</h3>
                <p>A működéshez elengedhetetlenül szükséges technikai és fiókadatok:</p>
                <ul className="list-disc pl-5 mt-2 space-y-2">
                    <li><strong>E-mail cím és jelszó lenyomat (hash):</strong> A biztonságos bejelentkezéshez (Firebase Auth).</li>
                    <li><strong>Technikai azonosítók (User ID):</strong> Az előfizetési státusz ellenőrzéséhez.</li>
                    <li><strong>Panaszkezelési adatok:</strong> Ha Ön a "Kapcsolat" menüből üzenetet (panaszt) küld, az Ön e-mail címe és az üzenet tartalma a panaszkezelés céljából rögzítésre kerül.</li>
                </ul>
            </section>

            <section>
                <h3 className="text-base font-black text-gray-900 mb-2">3. Az adatkezelés jogalapja és célja</h3>
                <table className="w-full text-xs text-left border-collapse mt-2">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-2 border border-gray-200">Tevékenység</th>
                            <th className="p-2 border border-gray-200">Jogalap</th>
                            <th className="p-2 border border-gray-200">Megőrzési idő</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-2 border border-gray-200">Regisztráció, fiók fenntartása</td>
                            <td className="p-2 border border-gray-200">Szerződés teljesítése (GDPR 6. cikk (1) b))</td>
                            <td className="p-2 border border-gray-200">A fiók törléséig</td>
                        </tr>
                        <tr>
                            <td className="p-2 border border-gray-200">Panaszkezelés / Ügyfélszolgálat</td>
                            <td className="p-2 border border-gray-200">Jogi kötelezettség (Fgytv.)</td>
                            <td className="p-2 border border-gray-200">Panasz rögzítésétől számított 3 év</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section>
                <h3 className="text-base font-black text-gray-900 mb-2">4. Adatfeldolgozók (Partnerek)</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Google Ireland Ltd. (Firebase):</strong> Fiók hitelesítés és felhő adatbázis (panaszok).</li>
                    <li><strong>RevenueCat Inc.:</strong> Alkalmazáson belüli vásárlások, előfizetések szinkronizálása.</li>
                    <li><strong>EmailJS:</strong> A panaszlevelek elektronikus továbbítása.</li>
                </ul>
            </section>

            <section>
                <h3 className="text-base font-black text-gray-900 mb-2">5. Az Ön jogai</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Törléshez való jog:</strong> Bármikor törölheti fiókját az alkalmazás Beállítások menüjében. Ezzel minden felhőben tárolt e-mail azonosító azonnal törlődik. (Az eszközön lévő adatok eltávolításához az applikációt kell törölnie).</li>
                    <li><strong>Adathordozhatóság:</strong> A Beállításoknál található Excel export funkcióval adatait bármikor saját gépére mentheti.</li>
                    <li><strong>Panasztétel:</strong> Jogsérelem esetén a Nemzeti Adatvédelmi és Információszabadság Hatósághoz (NAIH) vagy bírósághoz fordulhat.</li>
                </ul>
            </section>
        </div>
    );
}
