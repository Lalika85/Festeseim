import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';

const ProjectDetail = () => {
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
        if (!window.confirm('Törlöd?')) return;
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

    if (loading) return <div className="text-center mt-4">Betöltés...</div>;
    if (!project) return null;

    const statusBadge = () => {
        const st = project.status || 'active';
        if (st === 'active') return <span className="badge bg-active">Elkezdett</span>;
        if (st === 'suspend') return <span className="badge bg-suspend">Felfüggesztve</span>;
        if (st === 'done') return <span className="badge bg-done">Befejezett</span>;
        return null;
    };

    const mapUrl = project.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}` : '#';

    return (
        <div className="view-container">
            <div className="section-header">
                <button className="btn-icon" onClick={() => navigate('/projects')}>
                    <i className="fas fa-chevron-left"></i>
                </button>
                <h2>Adatlap</h2>
                <button className="btn-icon" onClick={() => navigate(`/projects/edit/${id}`)}>
                    <i className="fas fa-edit"></i>
                </button>
            </div>

            <div className="client-hero">
                <h1 id="d-client" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{project.client}</h1>
                <div id="d-address" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    <i className="fas fa-map-marker-alt"></i> {project.address || '-'}
                </div>
                <div id="d-status-badge">{statusBadge()}</div>

                <div className="contact-actions">
                    <a id="btn-call" href={project.phone ? `tel:${project.phone}` : '#'} style={{ opacity: project.phone ? 1 : 0.5 }}>
                        <i className="fas fa-phone"></i> Hívás
                    </a>
                    <a id="btn-mail" href={project.email ? `mailto:${project.email}` : '#'} style={{ opacity: project.email ? 1 : 0.5 }}>
                        <i className="fas fa-envelope"></i> Email
                    </a>
                    {project.address && (
                        <a id="map-link" href={mapUrl} target="_blank" rel="noreferrer" style={{ background: '#fef3c7', color: '#92400e', gridColumn: 'span 2' }}>
                            <i className="fas fa-location-arrow"></i> Térkép
                        </a>
                    )}
                </div>
            </div>

            <div className="detail-section">
                <div className="section-title">Helyiségek</div>
                <div id="d-rooms" style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(project.rooms || []).map((r, idx) => (
                        <span key={idx} className="room-tag">
                            {r} <i className="fas fa-times" onClick={() => handleDeleteRoom(r)} style={{ marginLeft: '5px', cursor: 'pointer' }}></i>
                        </span>
                    ))}
                </div>
                <div className="add-room-row" style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        placeholder="Megnevezés"
                        value={newRoom}
                        onChange={(e) => setNewRoom(e.target.value)}
                        style={{ flex: 2, marginBottom: 0 }}
                    />
                    <input
                        type="number"
                        placeholder="m²"
                        value={newRoomSize}
                        onChange={(e) => setNewRoomSize(e.target.value)}
                        style={{ flex: 1, marginBottom: 0 }}
                    />
                    <button className="btn btn-primary" onClick={handleAddRoom} style={{ padding: '0 15px' }}>
                        <i className="fas fa-plus"></i>
                    </button>
                </div>
            </div>

            <div className="detail-section">
                <div className="section-title">Gyorsműveletek</div>
                <div className="quick-actions-grid" style={{ marginBottom: '1rem' }}>
                    <div className="action-card primary" onClick={() => navigate(`/shop?project=${id}`)}>
                        <div className="icon-box"><i className="fas fa-shopping-cart"></i></div>
                        <span>Anyagok</span>
                    </div>
                    <div className="action-card" onClick={generateProjectPDF}>
                        <div className="icon-box"><i className="fas fa-file-pdf"></i></div>
                        <span>PDF Lista</span>
                    </div>
                </div>
            </div>

            <div className="detail-section">
                <div className="section-title">Megjegyzés</div>
                <div className="card" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {project.note || 'Nincs megjegyzés.'}
                </div>
            </div>

            <button className="btn btn-danger full-width mt-4" onClick={handleDeleteProject}>
                <i className="fas fa-trash"></i> Ügyfél törlése
            </button>
        </div>
    );
};

export default ProjectDetail;
