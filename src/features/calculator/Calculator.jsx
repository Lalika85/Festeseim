import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator as CalcIcon, Plus, Minus, Info, Save, Paintbrush, Eraser, Grid3x3 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

const CATEGORIES = {
    PAINTING: 'painting',
    PLASTERING: 'plastering',
    TILING: 'tiling',
    MASONRY: 'masonry'
};

const MASONRY_TYPES = {
    DRY_CONCRETE: 'dry_concrete',
    VIABLOKK: 'viablokk',
    MANUAL_PLASTER: 'manual_plaster'
};

const CONSTANTS = {
    PAINT_WALL: 10, // m2/L
    PAINT_CEILING: 8, // m2/L
    PAINT_PRIMER: 12, // m2/L
    PLASTER_USAGE: 1.5, // kg/m2/mm
    ADHESIVE_USAGE: 4.5, // kg/m2
    GROUT_DENSITY: 1.6, // kg/dm3
    DRY_CONCRETE_USAGE: 20, // kg/m2/cm
    VIABLOKK_USAGE: 8.33, // db/m2
    MANUAL_PLASTER_USAGE: 14 // kg/m2/cm
};

export default function Calculator({ isModal, onClose }) {
    const navigate = useNavigate();
    const handleClose = () => {
        if (onClose) {
            onClose();
        } else {
            navigate(-1);
        }
    };
    const [activeTab, setActiveTab] = useState(CATEGORIES.PAINTING);
    const [calcMode, setCalcMode] = useState('room'); // 'room', 'surface'

    // Shared Dimensions
    const [length, setLength] = useState(4);
    const [width, setWidth] = useState(4);
    const [height, setHeight] = useState(2.7);
    const [doors, setDoors] = useState(1);
    const [windows, setWindows] = useState(1);

    // Painting specific
    const [coats, setCoats] = useState(2);
    const [includeCeiling, setIncludeCeiling] = useState(true);
    const [usePrimer, setUsePrimer] = useState(false);
    const [paintCoverage, setPaintCoverage] = useState(10); // m2/L

    // Plastering specific
    const [plasterThickness, setPlasterThickness] = useState(2); // mm
    const [plasterUsage, setPlasterUsage] = useState(1.5); // kg/m2/mm

    // Tiling specific
    const [tileL, setTileL] = useState(600); // mm
    const [tileW, setTileW] = useState(600); // mm
    const [tileT, setTileT] = useState(10); // mm
    const [jointW, setJointW] = useState(3); // mm
    const [tileTarget, setTileTarget] = useState('floor'); // floor or walls

    // Masonry specific
    const [masonryType, setMasonryType] = useState(MASONRY_TYPES.DRY_CONCRETE);
    const [masonryThickness, setMasonryThickness] = useState(5); // cm for concrete/plaster

    // Calculated state
    const [netArea, setNetArea] = useState({ walls: 0, ceiling: 0, floor: 0, total: 0 });
    const [materials, setMaterials] = useState([]);

    useEffect(() => {
        const l = parseFloat(length) || 0;
        const w = parseFloat(width) || 0;
        const h = parseFloat(height) || 0;
        const d = parseInt(doors) || 0;
        const win = parseInt(windows) || 0;

        let rawWallArea, ceilingArea, floorArea;

        if (calcMode === 'room') {
            rawWallArea = (l * 2 + w * 2) * h;
            ceilingArea = l * w;
            floorArea = l * w;
        } else {
            // Egyetlen felület (fal vagy padló)
            rawWallArea = l * h;
            ceilingArea = l * h;
            floorArea = l * h;
        }

        const netWallArea = Math.max(0, rawWallArea - (d * 2.0) - (win * 1.5));

        setNetArea({
            walls: netWallArea,
            ceiling: ceilingArea,
            floor: floorArea,
            totalForPainting: netWallArea + (includeCeiling ? ceilingArea : 0)
        });
    }, [length, width, height, doors, windows, includeCeiling, calcMode]);

    useEffect(() => {
        calculateMaterials();
    }, [netArea, activeTab, coats, usePrimer, plasterThickness, plasterUsage, paintCoverage, tileL, tileW, tileT, jointW, tileTarget, masonryType, masonryThickness, calcMode]);

    const calculateMaterials = () => {
        let list = [];
        const pCov = parseFloat(paintCoverage) || 10;
        const gUse = parseFloat(plasterUsage) || 1.5;

        if (activeTab === CATEGORIES.PAINTING) {
            const wallLiters = (netArea.walls / pCov) * coats;
            list.push({ name: 'Falfesték', amount: wallLiters.toFixed(1), unit: 'Liter', sub: `${coats} rétegben (${pCov} m²/L)` });

            if (includeCeiling) {
                const ceilingLiters = (netArea.ceiling / pCov) * coats;
                list.push({ name: 'Mennyezetfesték', amount: ceilingLiters.toFixed(1), unit: 'Liter', sub: `${coats} rétegben (${pCov} m²/L)` });
            }
            if (usePrimer) {
                const primerLiters = (netArea.totalForPainting / CONSTANTS.PAINT_PRIMER);
                list.push({ name: 'Mélyalapozó', amount: primerLiters.toFixed(1), unit: 'Liter', sub: '1 rétegben' });
            }
        } else if (activeTab === CATEGORIES.PLASTERING) {
            const totalToPlaster = netArea.walls + (includeCeiling ? netArea.ceiling : 0);
            const kgNeeded = totalToPlaster * gUse * plasterThickness;
            list.push({ name: 'Glettanyag (zsákos)', amount: kgNeeded.toFixed(0), unit: 'kg', sub: `${plasterThickness}mm vastagságban (${gUse} kg/m²/mm)` });
            list.push({ name: 'Várható zsák (25kg)', amount: Math.ceil(kgNeeded / 25), unit: 'db', sub: '' });
        } else if (activeTab === CATEGORIES.TILING) {
            const area = tileTarget === 'floor' ? netArea.floor : netArea.walls;
            const adhesiveKg = area * CONSTANTS.ADHESIVE_USAGE;

            // Grout formula: ((L+W)/(L*W)) * T * JW * Density * 1.1
            const formula = ((tileL + tileW) / (tileL * tileW)) * tileT * jointW * CONSTANTS.GROUT_DENSITY * 1.1;
            const groutKg = area * formula;

            list.push({ name: 'Csemperagasztó', amount: adhesiveKg.toFixed(0), unit: 'kg', sub: 'Standard ágyazat' });
            list.push({ name: 'Fúgázó anyag', amount: groutKg.toFixed(1), unit: 'kg', sub: `${jointW}mm fúgával` });
            list.push({ name: 'Burkolandó felület', amount: area.toFixed(1), unit: 'm²', sub: tileTarget === 'floor' ? 'Padló' : 'Oldalfal' });
        } else if (activeTab === CATEGORIES.MASONRY) {
            if (masonryType === MASONRY_TYPES.DRY_CONCRETE) {
                const kgNeeded = netArea.floor * CONSTANTS.DRY_CONCRETE_USAGE * masonryThickness;
                list.push({ name: 'Szárazbeton (zsákos)', amount: kgNeeded.toFixed(0), unit: 'kg', sub: `${masonryThickness} cm vastagságban (${CONSTANTS.DRY_CONCRETE_USAGE} kg/m²/cm)` });
                list.push({ name: 'Várható zsák (25kg)', amount: Math.ceil(kgNeeded / 25), unit: 'db', sub: '' });
                list.push({ name: 'Terület', amount: netArea.floor.toFixed(1), unit: 'm²', sub: 'Padló szint' });
            } else if (masonryType === MASONRY_TYPES.VIABLOKK) {
                const area = netArea.walls;
                const dbNeeded = area * CONSTANTS.VIABLOKK_USAGE;
                list.push({ name: 'Viablokk elem', amount: Math.ceil(dbNeeded), unit: 'db', sub: `Normál falazat (${CONSTANTS.VIABLOKK_USAGE} db/m²)` });
                list.push({ name: 'Falazandó felület', amount: area.toFixed(1), unit: 'm²', sub: 'Oldalfalak' });
            } else if (masonryType === MASONRY_TYPES.MANUAL_PLASTER) {
                const area = netArea.walls;
                const kgNeeded = area * CONSTANTS.MANUAL_PLASTER_USAGE * masonryThickness;
                list.push({ name: 'Kézi vakolat (zsákos)', amount: kgNeeded.toFixed(0), unit: 'kg', sub: `${masonryThickness} cm vastagságban (${CONSTANTS.MANUAL_PLASTER_USAGE} kg/m²/cm)` });
                list.push({ name: 'Várható zsák (25kg)', amount: Math.ceil(kgNeeded / 25), unit: 'db', sub: '' });
            }
        }
        setMaterials(list);
    };

    return (
        <div className={`${isModal ? 'p-0' : 'view-container'} pb-10`}>
            {/* Header */}
            {!isModal && (
                <div className="flex items-center gap-3 mb-6">
                    <Button variant="secondary" onClick={handleClose} className="!p-2.5 rounded-full shadow-sm border-0 bg-white">
                        <ArrowLeft size={22} className="text-gray-700" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Profi Kalkulátor</h1>
                        <p className="text-sm text-gray-500">Minden szakmának egy helyen</p>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1 bg-gray-100 rounded-2xl mb-6">
                {[
                    { id: CATEGORIES.PAINTING, label: 'Festés', icon: <Paintbrush size={18} /> },
                    { id: CATEGORIES.PLASTERING, label: 'Glettelés', icon: <Eraser size={18} /> },
                    { id: CATEGORIES.TILING, label: 'Burkolás', icon: <Grid3x3 size={18} /> },
                    { id: CATEGORIES.MASONRY, label: 'Kőműves', icon: <Plus size={18} /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Dimensions */}
                <div className="space-y-6">
                    <Card className="shadow-sm border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <CalcIcon size={20} className="text-primary-600" />
                            Alapméretek (méter)
                        </h3>
                        
                        <div className="flex flex-col gap-2 p-1.5 bg-gray-100 rounded-xl mb-4 sm:flex-row">
                            <button onClick={() => setCalcMode('room')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${calcMode === 'room' ? 'bg-white shadow-md text-primary-600' : 'text-gray-500 hover:bg-gray-200'}`}>Teljes szoba</button>
                            <button onClick={() => setCalcMode('surface')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${calcMode === 'surface' ? 'bg-white shadow-md text-primary-600' : 'text-gray-500 hover:bg-gray-200'}`}>Egyetlen felület</button>
                        </div>

                        {calcMode === 'room' ? (
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-4">
                                    <Input label="Szoba hossza (m)" type="number" value={length} onChange={(e) => setLength(e.target.value)} className="!mb-0" />
                                    <Input label="Szoba szélessége (m)" type="number" value={width} onChange={(e) => setWidth(e.target.value)} className="!mb-0" />
                                    <Input label="Belmagasság (m)" type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="!mb-0" />
                                </div>
                                
                                <div className="border-t border-gray-100 pt-3 mt-1 w-full">
                                    <div className="text-[10px] text-gray-500 mb-2 uppercase font-bold tracking-wider text-center">Levonások</div>
                                    <div className="flex flex-col gap-2">
                                        <div className="bg-gray-50 p-3 rounded-xl flex items-center justify-between border border-gray-100">
                                            <div className="text-xs text-gray-600 font-bold uppercase tracking-wide">Ajtó levonás</div>
                                            <div className="flex items-center gap-3">
                                                <button type="button" onClick={(e) => { e.preventDefault(); setDoors(Math.max(0, doors - 1)); }} className="bg-white shadow-sm rounded-md border border-gray-200 p-2 active:bg-gray-100"><Minus size={14} className="text-gray-600"/></button>
                                                <span className="font-black text-sm min-w-[24px] text-center text-gray-800">{doors}</span>
                                                <button type="button" onClick={(e) => { e.preventDefault(); setDoors(doors + 1); }} className="bg-white shadow-sm rounded-md border border-gray-200 p-2 active:bg-gray-100"><Plus size={14} className="text-gray-600"/></button>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-xl flex items-center justify-between border border-gray-100">
                                            <div className="text-xs text-gray-600 font-bold uppercase tracking-wide">Ablak levonás</div>
                                            <div className="flex items-center gap-3">
                                                <button type="button" onClick={(e) => { e.preventDefault(); setWindows(Math.max(0, windows - 1)); }} className="bg-white shadow-sm rounded-md border border-gray-200 p-2 active:bg-gray-100"><Minus size={14} className="text-gray-600"/></button>
                                                <span className="font-black text-sm min-w-[24px] text-center text-gray-800">{windows}</span>
                                                <button type="button" onClick={(e) => { e.preventDefault(); setWindows(windows + 1); }} className="bg-white shadow-sm rounded-md border border-gray-200 p-2 active:bg-gray-100"><Plus size={14} className="text-gray-600"/></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-4">
                                    <Input label="Felület Szélessége (m)" type="number" value={length} onChange={(e) => setLength(e.target.value)} className="!mb-0" />
                                    <Input label="Felület Magassága (m)" type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="!mb-0" />
                                </div>
                                <div className="border-t border-gray-100 pt-3 mt-1 w-full">
                                    <div className="text-[10px] text-gray-500 mb-2 uppercase font-bold tracking-wider text-center">Levonások</div>
                                    <div className="flex flex-col gap-2">
                                        <div className="bg-gray-50 p-3 rounded-xl flex items-center justify-between border border-gray-100 gap-2">
                                            <div className="text-xs text-gray-600 font-bold uppercase tracking-wide flex-1">Ajtó-rész levonás</div>
                                            <div className="flex items-center gap-3">
                                                <button type="button" onClick={(e) => { e.preventDefault(); setDoors(Math.max(0, doors - 1)); }} className="bg-white shadow-sm rounded-md border border-gray-200 p-2 active:bg-gray-100"><Minus size={14} className="text-gray-600"/></button>
                                                <span className="font-black text-sm min-w-[24px] text-center text-gray-800">{doors}</span>
                                                <button type="button" onClick={(e) => { e.preventDefault(); setDoors(doors + 1); }} className="bg-white shadow-sm rounded-md border border-gray-200 p-2 active:bg-gray-100"><Plus size={14} className="text-gray-600"/></button>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-xl flex items-center justify-between border border-gray-100 gap-2">
                                            <div className="text-xs text-gray-600 font-bold uppercase tracking-wide flex-1">Ablak-rész levonás</div>
                                            <div className="flex items-center gap-3">
                                                <button type="button" onClick={(e) => { e.preventDefault(); setWindows(Math.max(0, windows - 1)); }} className="bg-white shadow-sm rounded-md border border-gray-200 p-2 active:bg-gray-100"><Minus size={14} className="text-gray-600"/></button>
                                                <span className="font-black text-sm min-w-[24px] text-center text-gray-800">{windows}</span>
                                                <button type="button" onClick={(e) => { e.preventDefault(); setWindows(windows + 1); }} className="bg-white shadow-sm rounded-md border border-gray-200 p-2 active:bg-gray-100"><Plus size={14} className="text-gray-600"/></button>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2 italic text-center">A beállított mennyiséget levonja a kiszámolt m²-ből.</p>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Category Specific Inputs */}
                    <Card className="shadow-sm border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Beállítások</h3>

                        {activeTab === CATEGORIES.PAINTING && (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1"><Input label="Rétegszám" type="number" value={coats} onChange={(e) => setCoats(e.target.value)} className="!mb-0" /></div>
                                    <div className="flex-1"><Input label="Kiadósság (m²/L)" type="number" value={paintCoverage} onChange={(e) => setPaintCoverage(e.target.value)} className="!mb-0" /></div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 cursor-pointer">
                                        <input type="checkbox" checked={includeCeiling} onChange={(e) => setIncludeCeiling(e.target.checked)} className="w-5 h-5 text-primary-600" />
                                        <span className="text-sm font-medium">Mennyezet festése is</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 cursor-pointer">
                                        <input type="checkbox" checked={usePrimer} onChange={(e) => setUsePrimer(e.target.checked)} className="w-5 h-5 text-primary-600" />
                                        <span className="text-sm font-medium">Mélyalapozás is</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeTab === CATEGORIES.PLASTERING && (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1"><Input label="Réteg (mm)" type="number" value={plasterThickness} onChange={(e) => setPlasterThickness(e.target.value)} className="!mb-0" /></div>
                                    <div className="flex-1"><Input label="Kiadósság (kg/m²/mm)" type="number" value={plasterUsage} onChange={(e) => setPlasterUsage(e.target.value)} className="!mb-0" /></div>
                                </div>
                                <p className="text-xs text-gray-400 italic">Vékony glettelésre általában 1-2 mm javasolt.</p>
                                <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 cursor-pointer">
                                    <input type="checkbox" checked={includeCeiling} onChange={(e) => setIncludeCeiling(e.target.checked)} className="w-5 h-5 text-primary-600" />
                                    <span className="text-sm font-medium">Mennyezet glettelése is</span>
                                </label>
                            </div>
                        )}

                        {activeTab === CATEGORIES.TILING && (
                            <div className="space-y-4">
                                <div className="flex flex-col gap-2 p-1.5 bg-gray-100 rounded-xl mb-4 sm:flex-row">
                                    <button onClick={() => setTileTarget('floor')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${tileTarget === 'floor' ? 'bg-white shadow-md text-primary-600' : 'text-gray-500 hover:bg-gray-200'}`}>Padló burkolása</button>
                                    <button onClick={() => setTileTarget('walls')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${tileTarget === 'walls' ? 'bg-white shadow-md text-primary-600' : 'text-gray-500 hover:bg-gray-200'}`}>Oldalfal burkolása</button>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="flex gap-3">
                                        <div className="flex-1"><Input label="Lap Hossz (mm)" type="number" value={tileL} onChange={(e) => setTileL(e.target.value)} className="!mb-0" /></div>
                                        <div className="flex-1"><Input label="Lap Szélesség (mm)" type="number" value={tileW} onChange={(e) => setTileW(e.target.value)} className="!mb-0" /></div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-1"><Input label="Vastagság (mm)" type="number" value={tileT} onChange={(e) => setTileT(e.target.value)} className="!mb-0" /></div>
                                        <div className="flex-1"><Input label="Fúga (mm)" type="number" value={jointW} onChange={(e) => setJointW(e.target.value)} className="!mb-0" /></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === CATEGORIES.MASONRY && (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-2 p-1.5 bg-gray-100 rounded-xl mb-4">
                                    <button onClick={() => setMasonryType(MASONRY_TYPES.DRY_CONCRETE)} className={`flex-1 py-3 px-2 rounded-lg text-sm sm:text-xs font-bold leading-tight transition-all ${masonryType === MASONRY_TYPES.DRY_CONCRETE ? 'bg-white shadow-md text-primary-600' : 'text-gray-500 hover:bg-gray-200'}`}>Szárazbeton</button>
                                    <button onClick={() => setMasonryType(MASONRY_TYPES.VIABLOKK)} className={`flex-1 py-3 px-2 rounded-lg text-sm sm:text-xs font-bold leading-tight transition-all ${masonryType === MASONRY_TYPES.VIABLOKK ? 'bg-white shadow-md text-primary-600' : 'text-gray-500 hover:bg-gray-200'}`}>Viablokk fal</button>
                                    <button onClick={() => setMasonryType(MASONRY_TYPES.MANUAL_PLASTER)} className={`flex-1 py-3 px-2 rounded-lg text-sm sm:text-xs font-bold leading-tight transition-all ${masonryType === MASONRY_TYPES.MANUAL_PLASTER ? 'bg-white shadow-md text-primary-600' : 'text-gray-500 hover:bg-gray-200'}`}>Kézi vakolat</button>
                                </div>
                                
                                {masonryType !== MASONRY_TYPES.VIABLOKK && (
                                    <div className="flex flex-col gap-3">
                                        <Input 
                                            label="Vastagság (cm)" 
                                            type="number" 
                                            value={masonryThickness} 
                                            onChange={(e) => setMasonryThickness(e.target.value)} 
                                            className="!mb-0" 
                                        />
                                        <p className="text-xs text-gray-400 italic">
                                            {masonryType === MASONRY_TYPES.DRY_CONCRETE ? 'Aljzatbetonhoz min. 4-6 cm javasolt.' : 'Vakoláshoz általában 1-2 cm javasolt.'}
                                        </p>
                                    </div>
                                )}
                                
                                {masonryType === MASONRY_TYPES.VIABLOKK && (
                                    <p className="text-xs text-gray-400 italic">A számítás standard 8,33 db/m² anyagszükséglettel történik, 10 cm vastagságú válaszfal elemmel számolva.</p>
                                )}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Column: Results */}
                <div className="space-y-4">
                    <Card className="bg-primary-600 text-white border-0 shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold opacity-90">Kalkulált felület</h3>
                            <Badge className="bg-white/20 text-white border-0">Összesen</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <div className="text-[10px] uppercase opacity-60 font-bold mb-1">Oldalfal</div>
                                <div className="text-2xl font-black">{netArea.walls.toFixed(1)} m²</div>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase opacity-60 font-bold mb-1">Padló / Menny.</div>
                                <div className="text-2xl font-black">{netArea.floor.toFixed(1)} m²</div>
                            </div>
                        </div>
                    </Card>

                    <Card className="shadow-md border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Szükséges anyagok</h3>
                        <div className="space-y-4">
                            {materials.map((m, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                    <div>
                                        <div className="text-sm font-bold text-gray-800">{m.name}</div>
                                        <div className="text-[10px] text-gray-500 uppercase font-medium">{m.sub}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-black text-primary-600">{m.amount} <span className="text-sm font-bold">{m.unit}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8">
                            <Button variant="primary" className="w-full h-14 text-lg shadow-lg shadow-primary-100" icon={<Save size={20} />}>
                                Mentés az adatokhoz
                            </Button>
                        </div>
                    </Card>

                    <Card className="bg-blue-50 border-blue-100 flex gap-3 !p-4">
                        <Info className="text-blue-600 shrink-0" size={20} />
                        <div className="text-xs text-blue-800 leading-relaxed">
                            <strong>Szakmai tipp:</strong> A számításokhoz adj hozzá 10-15% ráhagyást a vágási hulladék és a felületi egyenetlenségek miatt!
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
