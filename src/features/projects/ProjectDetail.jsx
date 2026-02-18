import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { generateWorksheetPDF } from '../../services/pdfGenerator';
import {
    ArrowLeft, Edit, Trash2, Phone, Mail, MapPin,
    Map, Plus, X, ShoppingCart, FileText, ChevronRight,
    User, Home, Layers, Receipt
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

export default function ProjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newRoom, setNewRoom] = useState('');
    const [newRoomSize, setNewRoomSize] = useState('');
    const [materials, setMaterials] = useState([]);

    useEffect(() => {
        const fetchProject = async () => {
            if (!currentUser || !id) return;
            try {
                const docRef = doc(db, 'users', currentUser.uid, 'projects', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setProject({ ...docSnap.data(), id: docSnap.id });
                } else {
                    console.error("No such project!");
                    navigate('/projects');
                }
            } catch (err) {
                console.error("Error fetching project:", err);
            } finally {
                setLoading(false);
            }
        };

        // Listen for materials associated with this project
        let unsubscribeMaterials = () => { };
        if (currentUser && id) {
            const mQuery = query(collection(db, 'users', currentUser.uid, 'shopping_items'), where('projectId', '==', id));
            unsubscribeMaterials = onSnapshot(mQuery, (snapshot) => {
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setMaterials(list);
            });
        }

        fetchProject();
        return () => unsubscribeMaterials();
    }, [id, currentUser, navigate]);

    const handleAddRoom = async () => {
        if (!newRoom || !project) return;
        const roomStr = newRoomSize ? `${newRoom} (${newRoomSize}m²)` : newRoom;
        const updatedRooms = [...(project.rooms || []), roomStr];
        try {
            const docRef = doc(db, 'users', currentUser.uid, 'projects', project.id);
            await updateDoc(docRef, { rooms: updatedRooms });
            setProject({ ...project, rooms: updatedRooms });
            setNewRoom('');
            setNewRoomSize('');
        } catch (err) {
            console.error("Error adding room:", err);
        }
    };

    const handleDeleteRoom = async (roomToDelete) => {
        if (!window.confirm('Törlöd ezt a helyiséget?')) return;
        const updatedRooms = project.rooms.filter(r => r !== roomToDelete);
        try {
            const docRef = doc(db, 'users', currentUser.uid, 'projects', project.id);
            await updateDoc(docRef, { rooms: updatedRooms });
            setProject({ ...project, rooms: updatedRooms });
        } catch (err) {
            console.error("Error deleting room:", err);
        }
    };

    const handleDeleteProject = async () => {
        if (!window.confirm('VÉGLEG törlöd az ügyfél összes adatát?')) return;
        try {
            const docRef = doc(db, 'users', currentUser.uid, 'projects', id);
            await deleteDoc(docRef);
            navigate('/projects');
        } catch (err) {
            console.error("Error deleting project:", err);
            alert('Hiba a törléskor!');
        }
    };

    const handleGenerateWorksheet = async () => {
        try {
            await generateWorksheetPDF(project, materials, { showMaterials: true, showPrices: true });
        } catch (err) {
            console.error("PDF Error:", err);
            alert("Hiba a PDF generálásakor!");
        }
    };

    const handleCreateQuote = () => {
        navigate('/quote/new', {
            state: {
                clientData: {
                    name: project.client,
                    address: project.address,
                    email: project.email
                }
            }
        });
    };

    if (loading) return <div className="text-center py-12"><div className="animate-spin text-4xl mb-2">⏳</div><p className="text-gray-500">Betöltés...</p></div>;
    if (!project) return null;


    const mapUrl = project.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}` : '#';

    return (
        <div className="pb-10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Button variant="secondary" onClick={() => navigate('/projects')} className="!p-2.5 rounded-full shadow-sm border-0 bg-white">
                    <ArrowLeft size={22} className="text-gray-700" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Adatlap</h1>
                    <p className="text-sm text-gray-500">Ügyfél és munka részletei</p>
                </div>
                <div className="ml-auto">
                    <Button variant="secondary" onClick={() => navigate(`/projects/edit/${id}`)} className="!p-2.5 rounded-full shadow-sm border-0 bg-white">
                        <Edit size={22} className="text-primary-600" />
                    </Button>
                </div>
            </div>

            {/* Client Info Card - Redesigned */}
            <Card className="!p-0 overflow-hidden mb-6 border-0 shadow-md">
                <div className="bg-primary-600 p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <User size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 opacity-90">
                            <Badge className="bg-white/20 text-white backdrop-blur-sm border-0">
                                {project.status === 'done' ? 'Befejezett' : project.status === 'suspend' ? 'Felfüggesztve' : 'Aktív munka'}
                            </Badge>
                        </div>
                        <h2 className="text-3xl font-bold mb-1">{project.client}</h2>
                        <div className="flex items-center justify-between gap-2 text-primary-100 mb-4">
                            <a
                                href={mapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 hover:text-white transition-colors group/address"
                            >
                                <MapPin size={16} className="group-hover/address:scale-110 transition-transform" />
                                <span className="font-medium underline underline-offset-4 decoration-white/30 group-hover/address:decoration-white">
                                    {project.address || 'Nincs cím megadva'}
                                </span>
                            </a>
                        </div>
                    </div>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4 bg-white">
                    <a href={`tel:${project.phone}`} className={`flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-green-50 transition-colors group ${!project.phone && 'opacity-50 pointer-events-none'}`}>
                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 group-hover:text-green-600">
                            <Phone size={20} />
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Telefonszám</div>
                            <div className="font-medium text-gray-900">{project.phone || '-'}</div>
                        </div>
                    </a>
                    <a href={`mailto:${project.email}`} className={`flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors group ${!project.email && 'opacity-50 pointer-events-none'}`}>
                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 group-hover:text-blue-600">
                            <Mail size={20} />
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Email cím</div>
                            <div className="font-medium text-gray-900 truncate max-w-[100px]">{project.email || '-'}</div>
                        </div>
                    </a>
                </div>
            </Card>

            {/* Rooms Section - Redesigned Input */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Layers size={20} className="text-primary-600" />
                        Helyiségek
                        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{(project.rooms || []).length}</span>
                    </h3>
                </div>

                <div className="space-y-3 mb-6">
                    {(project.rooms || []).map((r, idx) => {
                        const isObject = typeof r === 'object';
                        const name = isObject ? r.name : r;
                        const size = isObject ? r.size : '';
                        const comment = isObject ? r.comment : '';

                        return (
                            <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-primary-400"></div>
                                        <div>
                                            <span className="font-medium text-gray-800">{name}</span>
                                            {size && <span className="text-gray-500 text-sm ml-2">({size} m²)</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteRoom(r)}
                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="pl-5">
                                    <Input
                                        placeholder="Belső megjegyzés a helyiséghez..."
                                        value={comment || ''}
                                        onChange={(e) => {
                                            const updatedRooms = [...project.rooms];
                                            updatedRooms[idx] = isObject ? { ...r, comment: e.target.value } : { name: r, size: '', comment: e.target.value };
                                            setProject(prev => ({ ...prev, rooms: updatedRooms }));
                                            // Auto-save logic could go here or require manual save button
                                            // For now we'll just update state, user needs to save properly via a "Save changes" mechanism if we strictly follow standard, 
                                            // but checking the file, there is no global save button. 
                                            // The handleDeleteRoom saves immediately. 
                                            // We should probably add an "onBlur" save or a save button near the comment.
                                            // Let's add an onBlur save.
                                        }}
                                        onBlur={async () => {
                                            if (!currentUser) return;
                                            try {
                                                const docRef = doc(db, 'users', currentUser.uid, 'projects', project.id);
                                                await updateDoc(docRef, { rooms: project.rooms });
                                            } catch (err) { console.error("Auto-save room error", err); }
                                        }}
                                        className="!mb-0 !text-sm"
                                    />
                                </div>
                            </div>
                        );
                    })}
                    {(project.rooms || []).length === 0 && (
                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <Home size={32} className="mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-500">Még nincsenek helyiségek felvéve.</p>
                        </div>
                    )}
                </div>

                {/* New Room Input */}
                <Card className="shadow-md border-primary-100 overflow-hidden !p-0">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 font-medium text-gray-700">
                        Új helyiség felvétele
                    </div>
                    <div className="p-4 flex flex-col gap-3">
                        <Input
                            placeholder="Pl. Nappali"
                            label="Megnevezés"
                            value={newRoom}
                            onChange={(e) => setNewRoom(e.target.value)}
                            icon={<Home size={18} />}
                            className="w-full !mb-0"
                        />
                        <div className="flex gap-3">
                            <div className="w-1/3">
                                <Input
                                    type="number"
                                    placeholder="0"
                                    label="Méret (m²)"
                                    value={newRoomSize}
                                    onChange={(e) => setNewRoomSize(e.target.value)}
                                    className="w-full !mb-0"
                                />
                            </div>
                            <div className="flex-1 flex items-end">
                                <Button
                                    onClick={async () => {
                                        if (!newRoom || !project) return;
                                        const newRoomObj = { name: newRoom, size: newRoomSize, comment: '' };
                                        const updatedRooms = [...(project.rooms || []), newRoomObj];
                                        try {
                                            const docRef = doc(db, 'users', currentUser.uid, 'projects', project.id);
                                            await updateDoc(docRef, { rooms: updatedRooms });
                                            setProject({ ...project, rooms: updatedRooms });
                                            setNewRoom('');
                                            setNewRoomSize('');
                                        } catch (err) {
                                            console.error("Error adding room:", err);
                                        }
                                    }}
                                    className="w-full h-[46px] bg-gray-900 hover:bg-gray-800 text-white shadow-lg"
                                    disabled={!newRoom}
                                >
                                    <Plus size={20} className="mr-2" /> Hozzáadás
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* General Note Section */}
            <Card header="Általános Megjegyzés" className="mb-6 shadow-md border-gray-200">
                <div className="relative">
                    <textarea
                        className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                        placeholder="Kapukód, speciális kérések, stb..."
                        value={project.note || ''}
                        onChange={(e) => setProject({ ...project, note: e.target.value })}
                        onBlur={async () => {
                            if (!currentUser) return;
                            try {
                                const docRef = doc(db, 'users', currentUser.uid, 'projects', project.id);
                                await updateDoc(docRef, { note: project.note });
                            } catch (err) { console.error("Auto-save note error", err); }
                        }}
                    ></textarea>
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400 pointer-events-none">
                        Automatikusan mentve
                    </div>
                </div>
            </Card>

            {/* Material Summary Card */}
            <Card className="mb-6 shadow-md border-purple-100 overflow-hidden !p-0">
                <div className="bg-purple-50 px-4 py-3 border-b border-purple-100 flex justify-between items-center">
                    <div className="flex items-center gap-2 font-medium text-purple-900">
                        <ShoppingCart size={18} className="text-purple-600" />
                        Anyagszükséglet
                    </div>
                    <Badge className="bg-purple-600 text-white border-0">
                        {materials.length} tétel
                    </Badge>
                </div>
                <div className="p-4 flex justify-between items-center bg-white">
                    <div>
                        <div className="text-sm text-gray-500">Becsült anyagköltség</div>
                        <div className="text-xl font-bold text-gray-900">
                            {materials.reduce((sum, m) => sum + (parseInt(m.price || 0) * (m.qty || 1)), 0).toLocaleString()} Ft
                        </div>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/shop?project=${id}`)}
                        className="!py-2 text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                        Kezelés <ChevronRight size={16} className="ml-1" />
                    </Button>
                </div>
            </Card>

            {/* Quick Actions */}
            <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Műveletek</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div
                        onClick={handleGenerateWorksheet}
                        className="bg-blue-600 text-white p-4 rounded-xl shadow-lg shadow-blue-200 flex flex-col justify-between h-28 cursor-pointer active:scale-95 transition-all relative overflow-hidden"
                    >
                        <div className="absolute -right-4 -bottom-4 opacity-20">
                            <FileText size={80} />
                        </div>
                        <FileText size={24} />
                        <div>
                            <div className="font-bold text-lg">PDF Export</div>
                            <div className="text-blue-100 text-xs">Munkalap letöltése</div>
                        </div>
                    </div>

                    <div
                        onClick={handleCreateQuote}
                        className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg shadow-indigo-200 flex flex-col justify-between h-28 cursor-pointer active:scale-95 transition-all relative overflow-hidden"
                    >
                        <div className="absolute -right-4 -bottom-4 opacity-20">
                            <Receipt size={80} />
                        </div>
                        <Receipt size={24} />
                        <div>
                            <div className="font-bold text-lg">Árajánlat</div>
                            <div className="text-indigo-100 text-xs">Új ajánlat készítése</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-10 text-center">
                <button
                    onClick={handleDeleteProject}
                    className="text-red-500 text-sm font-medium hover:text-red-700 hover:underline flex items-center justify-center mx-auto"
                >
                    <Trash2 size={16} className="mr-1" /> Projekt és adatok törlése
                </button>
            </div>
        </div>
    );
}
