import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, HelpCircle, LayoutDashboard, Briefcase,
    FileText, Calendar, ShoppingCart, User,
    ChevronRight, Info, CheckCircle2, MessageCircle
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function Help() {
    const navigate = useNavigate();

    const sections = [
        {
            title: "Vezérlőpult (Dashboard)",
            icon: <LayoutDashboard size={24} className="text-blue-500" />,
            content: "Az alkalmazás indításakor ide érkezel. Gyors áttekintést kapsz az aktív munkáidról, a legutóbbi árajánlatokról és a legfontosabb statisztikákról. A gyorsgombok segítségével azonnal új munkát vagy ajánlatot hozhatsz létre."
        },
        {
            title: "Munkák (Projektek)",
            icon: <Briefcase size={24} className="text-primary-600" />,
            content: "Itt kezelheted az összes festési projektet. Egy munka adatlapján rögzítheted az ügyfél adatait, a helyiségek listáját és a szükséges anyagokat. Az adatlapot könnyen megoszthatod kollégáiddal WhatsApp-on vagy Viberen is."
        },
        {
            title: "Árajánlatok",
            icon: <FileText size={24} className="text-orange-500" />,
            content: "Professzionális árajánlatokat készíthetsz pillanatok alatt. Beállíthatod saját céges logódat és márkaszínedet. Az ügyfél egy elegáns webes felületen tekintheti meg az ajánlatot, amit digitálisan alá is írhat. Az 'Előnézet' gombbal ellenőrizheted a kinézetet küldés előtt."
        },
        {
            title: "Naptár",
            icon: <Calendar size={24} className="text-red-500" />,
            content: "Kövesd nyomon a munkáidat időrendben. A naptár összekapcsolható a Google Naptáraddal, így minden eseményt egy helyen látsz. A munkák kezdő- és végdátumát az adatlapjukon tudod beállítani."
        },
        {
            title: "Anyagszükséglet",
            icon: <ShoppingCart size={24} className="text-purple-500" />,
            content: "Minden munkához rögzíthetsz anyaglistát. Az applikáció automatikusan összesíti a költségeket, így pontosan láthatod, mennyi anyagot kell beszerezned és mennyi lesz a kiadásod."
        },
        {
            title: "Profil és Cégek",
            icon: <User size={24} className="text-green-500" />,
            content: "A Profil menüben kezelheted saját adataidat és vállalkozásaidat. Több céget is rögzíthetsz (pl. ha különböző adószámokkal dolgozol), beállíthatod a logóidat, és itt találod az Adatmentés (Export/Import) funkciót is."
        }
    ];

    return (
        <div className="pb-24 max-w-4xl mx-auto px-4">
            {/* Header */}
            <div className="flex items-center gap-3 py-6 mb-4">
                <Button variant="secondary" onClick={() => navigate(-1)} className="!p-2.5 rounded-full shadow-sm border-0 bg-white text-gray-700">
                    <ArrowLeft size={22} />
                </Button>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 leading-tight">Súgó & Segítség</h1>
                    <p className="text-sm text-gray-500">Ismerd meg az alkalmazás funkcióit</p>
                </div>
            </div>

            {/* Welcome Card */}
            <Card className="bg-primary-600 text-white p-6 rounded-3xl mb-8 border-0 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <HelpCircle size={140} />
                </div>
                <div className="relative z-10">
                    <h2 className="text-xl font-bold mb-2">Üdvözlünk a FestőNaplóban!</h2>
                    <p className="text-primary-50 text-sm leading-relaxed max-w-lg">
                        Ez az alkalmazás azért készült, hogy megkönnyítse a mindennapi munkádat: az adminisztrációtól a profi árajánlatokig minden egy helyen van.
                    </p>
                </div>
            </Card>

            {/* Help Sections */}
            <div className="grid gap-6">
                {sections.map((section, idx) => (
                    <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-gray-50 rounded-2xl">
                                {section.icon}
                            </div>
                            <h3 className="text-lg font-black text-gray-900">{section.title}</h3>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed font-medium">
                            {section.content}
                        </p>
                    </div>
                ))}
            </div>

            {/* Support / Version Info */}
            <div className="mt-12 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-gray-500 text-xs font-bold uppercase tracking-wider">
                    <Info size={14} /> Verzió: 6.0.0
                </div>
                <p className="text-gray-400 text-[10px] mt-4 uppercase tracking-[0.2em] font-black">
                    FestőNapló &copy; 2026 - Minden jog fenntartva
                </p>
            </div>
        </div>
    );
}
