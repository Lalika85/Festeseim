import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db, storage } from '../../services/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, Plus, Trash2, ShoppingBag, Upload, Image as ImageIcon, CheckCircle, Circle, Camera } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';

export default function ShopManager() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [items, setItems] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [loading, setLoading] = useState(false);

    // Add Item State
    const [newItem, setNewItem] = useState({
        product: '',
        qty: 1,
        unit: 'db',
        note: '',
        photoUrl: ''
    });
    const [isUploading, setIsUploading] = useState(false);

    // Filter
    const [filter, setFilter] = useState('all'); // all, active, done

    useEffect(() => {
        if (currentUser) {
            fetchProjects();
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) {
            const q = query(
                collection(db, 'users', currentUser.uid, 'shopping_items'),
                orderBy('createdAt', 'desc')
            );
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setItems(list);
            });
            return () => unsubscribe();
        }
    }, [currentUser]);

    const fetchProjects = async () => {
        const snap = await getDocs(collection(db, 'users', currentUser.uid, 'projects'));
        setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    const handleAddItem = async () => {
        if (!newItem.product) return;
        setLoading(true);
        try {
            await addDoc(collection(db, 'users', currentUser.uid, 'shopping_items'), {
                ...newItem,
                projectId: selectedProject || 'general',
                projectName: selectedProject ? projects.find(p => p.id === selectedProject)?.client : 'Általános',
                done: false,
                createdAt: new Date().toISOString()
            });
            setNewItem({ product: '', qty: 1, unit: 'db', note: '', photoUrl: '' });
        } catch (err) {
            console.error("Error adding item:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Biztosan törlöd?')) return;
        await deleteDoc(doc(db, 'users', currentUser.uid, 'shopping_items', id));
    };

    const toggleDone = async (item) => {
        await updateDoc(doc(db, 'users', currentUser.uid, 'shopping_items', item.id), {
            done: !item.done
        });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const storageRef = ref(storage, `shop_photos/${currentUser.uid}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            setNewItem(prev => ({ ...prev, photoUrl: url }));
        } catch (err) {
            console.error("Upload error:", err);
            alert('Hiba a feltöltéskor!');
        } finally {
            setIsUploading(false);
        }
    };

    const filteredItems = items.filter(item => {
        if (filter === 'active' && item.done) return false;
        if (filter === 'done' && !item.done) return false;
        if (selectedProject && item.projectId !== selectedProject) return false;
        return true;
    });

    return (
        <div className="view-container">
            <div className="flex items-center gap-3 mb-6">
                <Button variant="secondary" onClick={() => navigate(-1)} className="!p-2.5 rounded-full shadow-sm border-0 bg-white">
                    <ArrowLeft size={22} className="text-gray-700" />
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">Bevásárlólista</h1>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <Select
                        label="Szűrés Ügyfél szerint"
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        options={[{ value: '', label: 'Összes / Általános' }, ...projects.map(p => ({ value: p.id, label: p.client }))]}
                        className="!mb-0"
                    />
                </div>
                <div className="flex bg-white rounded-lg border border-gray-200 p-1 h-[42px] self-end">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Mind
                    </button>
                    <button
                        onClick={() => setFilter('active')}
                        className={`px-4 rounded-md text-sm font-medium transition-colors ${filter === 'active' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Aktív
                    </button>
                    <button
                        onClick={() => setFilter('done')}
                        className={`px-4 rounded-md text-sm font-medium transition-colors ${filter === 'done' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Kész
                    </button>
                </div>
            </div>

            {/* Add New Item */}
            <Card className="mb-8 !p-4 bg-primary-50 border-primary-100 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Plus size={18} className="text-primary-600" /> Új tétel felvétele
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                    <div className="md:col-span-4">
                        <Input
                            placeholder="Termék neve..."
                            value={newItem.product}
                            onChange={e => setNewItem({ ...newItem, product: e.target.value })}
                            className="!mb-0"
                        />
                        {newItem.product && <p className="text-xs text-gray-500 mt-1 pl-1">Hova: {selectedProject ? projects.find(p => p.id === selectedProject)?.client : 'Általános'}</p>}
                    </div>
                    <div className="md:col-span-2 grid grid-cols-2 gap-2">
                        <Input
                            type="number"
                            placeholder="Menny."
                            value={newItem.qty}
                            onChange={e => setNewItem({ ...newItem, qty: e.target.value })}
                            className="!mb-0"
                        />
                        <Input
                            placeholder="Egység"
                            value={newItem.unit}
                            onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                            className="!mb-0"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <Input
                            placeholder="Megjegyzés (színkód, stb.)"
                            value={newItem.note}
                            onChange={e => setNewItem({ ...newItem, note: e.target.value })}
                            className="!mb-0"
                        />
                    </div>
                    <div className="md:col-span-1 flex justify-center">
                        <label className="cursor-pointer p-2 rounded-lg hover:bg-white transition-colors text-gray-500 hover:text-primary-600 relative">
                            {newItem.photoUrl ? <CheckCircle size={24} className="text-green-500" /> : <Camera size={24} />}
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                            {isUploading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg"><span className="animate-spin text-xs">⏳</span></div>}
                        </label>
                    </div>
                    <div className="md:col-span-2">
                        <Button onClick={handleAddItem} loading={loading} disabled={!newItem.product} className="w-full">
                            Hozzáadás
                        </Button>
                    </div>
                </div>
            </Card>

            {/* List */}
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
                            <a href={item.photoUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                <img src={item.photoUrl} alt="Item" className="w-full h-full object-cover" />
                            </a>
                        )}

                        <div className="flex-1 min-w-0">
                            <h4 className={`font-semibold text-gray-900 truncate ${item.done ? 'line-through text-gray-500' : ''}`}>
                                {item.product}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">{item.qty} {item.unit}</span>
                                {item.projectName && <span className="text-gray-400">• {item.projectName}</span>}
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
        </div>
    );
}
