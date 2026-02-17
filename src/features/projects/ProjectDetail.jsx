import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import {
    ArrowLeft, Edit, Trash2, Phone, Mail, MapPin,
    Map, Plus, X, ShoppingCart, FileText, ChevronRight
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
        <div className="view-container">
            <div className="flex justify-between items-center mb-6">
                <Button variant="ghost" onClick={() => navigate('/projects')} icon={<ArrowLeft size={20} />} className="!p-0" />
                <h2 className="text-xl font-bold text-gray-900">Adatlap</h2>
                <Button variant="ghost" onClick={() => navigate(`/projects/edit/${id}`)} icon={<Edit size={20} />} className="!p-0 text-primary-600" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.client}</h1>
                <div className="flex items-center justify-center text-gray-500 text-sm mb-3">
                    <MapPin size={16} className="mr-1" />
                    {project.address || '-'}
                </div>
                <div className="mb-4">
                    <Badge variant={project.status === 'done' ? 'success' : project.status === 'suspend' ? 'warning' : 'info'}>
                        {project.status === 'done' ? 'Befejezett' : project.status === 'suspend' ? 'Felfüggesztve' : 'Aktív munka'}
                    </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <a
                        href={project.phone ? `tel:${project.phone}` : '#'}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg bg-green-50 text-green-700 transition-colors ${!project.phone && 'opacity-50 pointer-events-none'}`}
                    >
                        <Phone size={20} className="mb-1" />
                        <span className="text-xs font-medium">Hívás</span>
                    </a>
                    <a
                        href={project.email ? `mailto:${project.email}` : '#'}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 text-blue-700 transition-colors ${!project.email && 'opacity-50 pointer-events-none'}`}
                    >
                        <Mail size={20} className="mb-1" />
                        <span className="text-xs font-medium">Email</span>
                    </a>
                    {project.address && (
                        <a
                            href={mapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-col items-center justify-center p-3 rounded-lg bg-orange-50 text-orange-700 transition-colors"
                        >
                            <Map size={20} className="mb-1" />
                            <span className="text-xs font-medium">Térkép</span>
                        </a>
                    )}
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Helyiségek</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                    {(project.rooms || []).map((r, idx) => (
                        <span key={idx} className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                            {r}
                            <button
                                onClick={() => handleDeleteRoom(r)}
                                className="ml-2 w-4 h-4 flex items-center justify-center rounded-full bg-gray-300 text-gray-600 hover:bg-gray-400 hover:text-white"
                            >
                                <X size={10} />
                            </button>
                        </span>
                    ))}
                    {(project.rooms || []).length === 0 && <p className="text-gray-500 text-sm italic">Nincsenek rögzített helyiségek.</p>}
                </div>

                <div className="flex gap-2">
                    <div className="flex-1">
                        <Input
                            placeholder="Megnevezés"
                            value={newRoom}
                            onChange={(e) => setNewRoom(e.target.value)}
                            className="!mb-0"
                        />
                    </div>
                    <div className="w-24">
                        <Input
                            type="number"
                            placeholder="m²"
                            value={newRoomSize}
                            onChange={(e) => setNewRoomSize(e.target.value)}
                            className="!mb-0"
                        />
                    </div>
                    <Button onClick={handleAddRoom} className="!px-3">
                        <Plus size={20} />
                    </Button>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Gyorsműveletek</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div
                        onClick={() => navigate(`/shop?project=${id}`)}
                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 cursor-pointer hover:bg-gray-50 active:scale-[0.98] transition-all"
                    >
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                            <ShoppingCart size={20} />
                        </div>
                        <div>
                            <div className="font-medium text-gray-900">Anyagok</div>
                            <div className="text-xs text-gray-500">Bevásárlólista</div>
                        </div>
                        <ChevronRight size={16} className="ml-auto text-gray-400" />
                    </div>

                    <div
                        onClick={generateProjectPDF}
                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 cursor-pointer hover:bg-gray-50 active:scale-[0.98] transition-all"
                    >
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                            <FileText size={20} />
                        </div>
                        <div>
                            <div className="font-medium text-gray-900">PDF</div>
                            <div className="text-xs text-gray-500">Munkalap</div>
                        </div>
                        <ChevronRight size={16} className="ml-auto text-gray-400" />
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Megjegyzés</h3>
                <Card className="text-sm text-gray-600">
                    {project.note || 'Nincs megjegyzés ehhez a munkához.'}
                </Card>
            </div>

            <Button variant="danger" onClick={handleDeleteProject} icon={<Trash2 size={18} />} className="w-full">
                Ügyfél törlése
            </Button>
        </div>
    );
}
