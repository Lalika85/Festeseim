import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { localDB } from '../../services/localDB';
import { ArrowLeft, Plus, Trash2, ShoppingBag, Upload, Image as ImageIcon, CheckCircle, Circle, Camera, Calculator as CalcIcon } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Calculator from '../calculator/Calculator';

import { useProjects } from '../../hooks/useProjects';

export default function ShopManager() {
    const { currentUser } = useAuth();
    const { projects } = useProjects();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const isLocked = location.state?.locked;
    const [items, setItems] = useState([]);
    const [selectedProject, setSelectedProject] = useState(searchParams.get('project') || '');
    const [loading, setLoading] = useState(false);

    // Add Item State
    const [newItem, setNewItem] = useState({
        product: '',
        qty: 1,
        unit: 'db',
        price: '',
        note: '',
        photoUrl: '',
        room: ''
    });
    const [isUploading, setIsUploading] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    // Filter
    const [filter, setFilter] = useState('all'); // all, active, done

    // Sync URL param
    useEffect(() => {
        const p = searchParams.get('project');
        if (p !== selectedProject) {
            setSelectedProject(p || '');
        }
    }, [searchParams]);

    const handleProjectChange = (val) => {
        setSelectedProject(val);
        if (val) {
            setSearchParams({ project: val });
        } else {
            searchParams.delete('project');
            setSearchParams(searchParams);
        }
    };

    useEffect(() => {
        if (currentUser?.uid) {
            // Subscribe to local shopping items
            const unsubscribe = localDB.subscribe(currentUser.uid, 'shopping_items', (data) => {
                const list = Object.values(data).sort((a, b) => 
                    new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
                );
                setItems(list);
            });
            return () => unsubscribe();
        }
    }, [currentUser?.uid]);

    const handleAddItem = async () => {
        if (!newItem.product || !currentUser) return;

        const pId = selectedProject ? String(selectedProject) : 'general';
        const pName = selectedProject ? projects.find(p => p.id === selectedProject)?.client : 'Általános';
        const itemId = Math.random().toString(36).substr(2, 9);

        const itemPayload = {
            ...newItem,
            id: itemId,
            projectId: pId,
            projectName: pName,
            done: false,
            createdAt: new Date().toISOString()
        };

        try {
            localDB.set(currentUser.uid, 'shopping_items', itemId, itemPayload);
            setNewItem({ product: '', qty: 1, unit: 'db', price: '', note: '', photoUrl: '', room: '' });
        } catch (e) {
            console.error("Error adding locally: ", e);
            alert(`HIBA TÖRTÉNT! ${e.message}`);
        }
    };

    const handleDelete = (id) => {
        if (!window.confirm('Biztosan törlöd?') || !currentUser) return;
        try {
            localDB.remove(currentUser.uid, 'shopping_items', id);
        } catch (err) {
            console.error('Törlési hiba:', err);
        }
    };

    const toggleDone = (item) => {
        if (!currentUser) return;
        localDB.set(currentUser.uid, 'shopping_items', item.id, {
            done: !item.done
        });
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
                // Resize logic using Canvas
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 1000; // Max dimensions
                
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compress to JPEG with 0.7 quality
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                setNewItem(prev => ({ ...prev, photoUrl: compressedBase64 }));
                setIsUploading(false);
            };
            img.onerror = () => {
                alert('Hiba a kép feldolgozásakor!');
                setIsUploading(false);
            };
            img.src = reader.result;
        };
        reader.onerror = () => {
            alert('Hiba a fájl beolvasásakor!');
            setIsUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const filteredItems = items.filter(item => {
        if (filter === 'active' && item.done) return false;
        if (filter === 'done' && !item.done) return false;
        if (selectedProject && item.projectId !== selectedProject) return false;
        return true;
    });

    const selectedProjectData = projects.find(p => p.id === selectedProject);

    return (
        <div className="view-container">
            <div className="flex items-center gap-3 mb-6">
                <Button variant="secondary" onClick={() => navigate(-1)} className="!p-2.5 rounded-full shadow-sm border-0 bg-white">
                    <ArrowLeft size={22} className="text-gray-700" />
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">Bevásárlólista</h1>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                    {isLocked ? (
                        <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                                {projects.find(p => p.id === selectedProject)?.client?.charAt(0) || 'Ü'}
                            </div>
                            <div>
                                <div className="text-xs text-primary-600 font-bold uppercase tracking-wider">Kiválasztott Ügyfél</div>
                                <div className="font-bold text-gray-900 text-lg">{projects.find(p => p.id === selectedProject)?.client || 'Betöltés...'}</div>
                            </div>
                        </div>
                    ) : (
                        <Select
                            label="Szűrés Ügyfél szerint"
                            value={selectedProject}
                            onChange={(e) => handleProjectChange(e.target.value)}
                            options={[{ value: '', label: 'Összes / Általános' }, ...projects.map(p => ({ value: p.id, label: p.client }))]}
                            className="!mb-0"
                        />
                    )}
                </div>
                <div className="flex bg-white rounded-lg border border-gray-200 p-1 h-[42px] self-end">
                    <button onClick={() => setFilter('all')} className={`px-4 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>Mind</button>
                    <button onClick={() => setFilter('active')} className={`px-4 rounded-md text-sm font-medium transition-colors ${filter === 'active' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>Aktív</button>
                    <button onClick={() => setFilter('done')} className={`px-4 rounded-md text-sm font-medium transition-colors ${filter === 'done' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>Kész</button>
                </div>
            </div>

            <Card className="mb-8 !p-4 bg-primary-50 border-primary-100 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Plus size={18} className="text-primary-600" /> Új tétel felvétele
                    </h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCalculator(true)}
                        className="text-primary-600 font-bold flex items-center gap-1.5"
                    >
                        <CalcIcon size={16} /> Anyagkalkulátor
                    </Button>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-5">
                            <Input
                                placeholder="Termék neve..."
                                value={newItem.product}
                                onChange={e => setNewItem({ ...newItem, product: e.target.value })}
                                className="!mb-0"
                            />
                            {newItem.product && <p className="text-xs text-gray-500 mt-1 pl-1">Hova: {selectedProjectData ? selectedProjectData.client : 'Általános'}</p>}
                        </div>

                        <div className="md:col-span-4">
                            <select
                                className="w-full h-[42px] p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm bg-white"
                                value={newItem.room || ''}
                                onChange={(e) => setNewItem({ ...newItem, room: e.target.value })}
                                disabled={!selectedProject}
                            >
                                <option value="">- Helyiség (opcionális) -</option>
                                {selectedProjectData?.rooms?.map((r, idx) => {
                                    const rName = typeof r === 'object' ? r.name : r;
                                    return <option key={idx} value={rName}>{rName}</option>;
                                })}
                            </select>
                        </div>

                        <div className="md:col-span-3">
                            <Input
                                type="number"
                                placeholder="Ár (Ft)"
                                value={newItem.price}
                                onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                                className="!mb-0"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        <div className="md:col-span-2">
                            <Input
                                type="number"
                                placeholder="Menny."
                                value={newItem.qty}
                                onChange={e => setNewItem({ ...newItem, qty: e.target.value })}
                                className="!mb-0"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Input
                                placeholder="Egység"
                                value={newItem.unit}
                                onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                                className="!mb-0"
                            />
                        </div>
                        <div className="md:col-span-4">
                            <Input
                                placeholder="Megjegyzés (szín, típus...)"
                                value={newItem.note}
                                onChange={e => setNewItem({ ...newItem, note: e.target.value })}
                                className="!mb-0"
                            />
                        </div>
                        <div className="md:col-span-1 flex justify-center">
                            <label className="cursor-pointer flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white transition-colors text-gray-500 hover:text-primary-600 relative border border-gray-200">
                                {newItem.photoUrl ? <CheckCircle size={20} className="text-green-500" /> : <Camera size={20} />}
                                <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileUpload} />
                                {isUploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg"><span className="animate-spin text-xs">⏳</span></div>}
                            </label>
                        </div>
                        <div className="md:col-span-3">
                            <Button onClick={handleAddItem} loading={loading} disabled={!newItem.product} className="w-full bg-green-600 hover:bg-green-700 h-[42px] flex items-center justify-center">
                                <Plus size={18} className="mr-2" /> Mentés
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="space-y-3">
                {filteredItems.map(item => (
                    <div
                        key={item.id}
                        className={`bg-white p-4 rounded-xl border shadow-sm transition-all flex items-center gap-4 ${item.done ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-200 hover:border-primary-300'}`}
                    >
                        <button
                            onClick={() => toggleDone(item)}
                            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${item.done ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-300 text-transparent hover:border-primary-500'}`}
                        >
                            <CheckCircle size={14} />
                        </button>

                        {item.photoUrl && (
                            <div 
                                onClick={() => setPreviewImage(item.photoUrl)} 
                                className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 cursor-pointer active:scale-95 transition-transform"
                            >
                                <img src={item.photoUrl} alt="Item" className="w-full h-full object-cover" />
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <h4 className={`font-semibold text-gray-900 truncate ${item.done ? 'line-through text-gray-500' : ''}`}>
                                {item.product}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">{item.qty} {item.unit}</span>
                                {item.price && <span className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded font-bold">{Number(item.price).toLocaleString()} Ft</span>}
                                {item.projectName && <span className="text-gray-400">• {item.projectName}</span>}
                                {item.room && <span className="text-primary-600 font-medium bg-primary-50 px-1.5 rounded text-[11px] uppercase tracking-wider">{item.room}</span>}
                                {item.note && <span className="text-gray-500 italic max-w-full truncate">• {item.note}</span>}
                            </div>
                        </div>

                        <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}

                {filteredItems.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <ShoppingBag size={48} className="mx-auto mb-3 opacity-20" />
                        <p>A lista üres.</p>
                    </div>
                )}
            </div>
            {showCalculator && (
                <Modal
                    isOpen={showCalculator}
                    onClose={() => setShowCalculator(false)}
                    title="Anyagkalkulátor"
                    maxWidth="max-w-4xl"
                >
                    <Calculator isModal onClose={() => setShowCalculator(false)} />
                </Modal>
            )}

            {previewImage && (
                <Modal
                    isOpen={!!previewImage}
                    onClose={() => setPreviewImage(null)}
                    title="Fotó megtekintése"
                    maxWidth="max-w-2xl"
                >
                    <div className="flex flex-col items-center">
                        <img 
                            src={previewImage} 
                            alt="Nagyított kép" 
                            className="w-full h-auto rounded-lg shadow-lg"
                        />
                        <Button 
                            variant="secondary" 
                            onClick={() => setPreviewImage(null)} 
                            className="mt-4 w-full"
                        >
                            Bezárás
                        </Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

