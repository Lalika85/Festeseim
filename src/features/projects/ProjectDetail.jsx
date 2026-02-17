import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import {
    ArrowLeft, Edit, Trash2, Phone, Mail, MapPin,
    Map, Plus, X, ShoppingCart, FileText, ChevronRight,
    User, Home, Layers
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
        fetchProject();
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

    const generateProjectPDF = () => {
        const doc = new jsPDF();
        const n = (t) => t ? String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

        doc.setFontSize(20);
        doc.text("MUNKALAP - ADATLAP", 105, 20, { align: "center" });

        doc.setFontSize(12);
        doc.text(`Ugyfel: ${n(project.client)}`, 10, 40);
        doc.text(`Cim: ${n(project.address)}`, 10, 47);
        doc.text(`Tel: ${n(project.phone)}`, 10, 54);
        doc.text(`Email: ${n(project.email)}`, 10, 61);

        doc.line(10, 70, 200, 70);
        doc.text("HELYISEGEK:", 10, 80);

        let y = 90;
        (project.rooms || []).forEach((r, idx) => {
            doc.text(`${idx + 1}. ${n(r)}`, 15, y);
            y += 7;
        });

        y += 10;
        doc.text("MEGJEGYZES:", 10, y);
        y += 7;
        const splitNote = doc.splitTextToSize(n(project.note || "Nincs megj."), 180);
        doc.text(splitNote, 10, y);

        doc.save(`munkalap_${n(project.client).replace(/\s/g, '_')}.pdf`);
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
                        <div className="flex items-center gap-2 text-primary-100 mb-4">
                            <MapPin size={16} />
                            <span className="font-medium">{project.address || 'Nincs cím megadva'}</span>
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
                    {(project.rooms || []).map((r, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-primary-400"></div>
                                <span className="font-medium text-gray-800">{r}</span>
                            </div>
                            <button
                                onClick={() => handleDeleteRoom(r)}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                    {(project.rooms || []).length === 0 && (
                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <Home size={32} className="mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-500">Még nincsenek helyiségek felvéve.</p>
                        </div>
                    )}
                </div>

                {/* New Room Input - Properly Done */}
                <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-secondary-500"></div>
                    <h4 className="font-semibold text-gray-900 mb-4">Új helyiség felvétele</h4>
                    <div className="flex flex-col gap-3">
                        <Input
                            placeholder="Pl. Nappali"
                            label="Megnevezés"
                            value={newRoom}
                            onChange={(e) => setNewRoom(e.target.value)}
                            icon={<Home size={18} />}
                            className="w-full"
                        />
                        <div className="flex gap-3">
                            <div className="w-1/3">
                                <Input
                                    type="number"
                                    placeholder="0"
                                    label="Méret (m²)"
                                    value={newRoomSize}
                                    onChange={(e) => setNewRoomSize(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                            <div className="flex-1 flex items-end">
                                <Button
                                    onClick={handleAddRoom}
                                    className="w-full h-[46px] mb-4 bg-gray-900 hover:bg-gray-800 text-white shadow-lg"
                                    disabled={!newRoom}
                                >
                                    <Plus size={20} className="mr-2" /> Hozzáadás
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Műveletek</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div
                        onClick={() => navigate(`/shop?project=${id}`)}
                        className="bg-purple-600 text-white p-4 rounded-xl shadow-lg shadow-purple-200 flex flex-col justify-between h-28 cursor-pointer active:scale-95 transition-all relative overflow-hidden"
                    >
                        <div className="absolute -right-4 -bottom-4 opacity-20">
                            <ShoppingCart size={80} />
                        </div>
                        <ShoppingCart size={24} />
                        <div>
                            <div className="font-bold text-lg">Anyagok</div>
                            <div className="text-purple-100 text-xs">Lista kezelése</div>
                        </div>
                    </div>

                    <div
                        onClick={generateProjectPDF}
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
