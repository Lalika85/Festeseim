import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const ProjectForm = ({ isEdit = false }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [formData, setFormData] = useState({
        client: '',
        phone: '',
        email: '',
        address: '',
        note: '',
        status: 'active',
        start: '',
        end: ''
    });
    const [loading, setLoading] = useState(isEdit);

    useEffect(() => {
        if (isEdit && id && currentUser) {
            const fetchProject = async () => {
                try {
                    const docRef = doc(db, 'users', currentUser.uid, 'projects', id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setFormData(docSnap.data());
                    }
                } catch (err) {
                    console.error("Error fetching project for edit:", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchProject();
        }
    }, [isEdit, id, currentUser]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.client) return alert('Név kötelező!');

        try {
            if (isEdit) {
                const docRef = doc(db, 'users', currentUser.uid, 'projects', id);
                await updateDoc(docRef, formData);
                navigate(`/projects/${id}`);
            } else {
                const newId = String(Date.now());
                const docRef = doc(db, 'users', currentUser.uid, 'projects', newId);
                const newProject = { ...formData, id: newId, rooms: [], docs: [] };
                await setDoc(docRef, newProject);
                navigate('/projects');
            }
        } catch (err) {
            console.error("Error saving project:", err);
            alert('Hiba a mentéskor!');
        }
    };

    if (loading) return <div className="text-center mt-4">Betöltés...</div>;

    return (
        <div className="view-container">
            <div className="section-header">
                <button className="btn-icon" onClick={() => navigate(-1)}>
                    <i className="fas fa-chevron-left"></i>
                </button>
                <h2>{isEdit ? 'Szerkesztés' : 'Új Munkalap'}</h2>
                <div style={{ width: '40px' }}></div>
            </div>

            <form onSubmit={handleSubmit} className="card">
                <label>Megrendelő Neve *</label>
                <input name="client" value={formData.client} onChange={handleChange} required />

                <label>Telefonszám</label>
                <input name="phone" value={formData.phone} onChange={handleChange} type="tel" />

                <label>Email</label>
                <input name="email" value={formData.email} onChange={handleChange} type="email" />

                <label>Cím</label>
                <input name="address" value={formData.address} onChange={handleChange} />

                <label>Állapot</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                    <option value="active">Elkezdett</option>
                    <option value="suspend">Felfüggesztve</option>
                    <option value="done">Befejezett</option>
                </select>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label>Kezdés</label>
                        <input name="start" value={formData.start} onChange={handleChange} type="date" />
                    </div>
                    <div>
                        <label>Befejezés</label>
                        <input name="end" value={formData.end} onChange={handleChange} type="date" />
                    </div>
                </div>

                <label>Megjegyzés</label>
                <textarea name="note" value={formData.note} onChange={handleChange}></textarea>

                <button type="submit" className="btn btn-primary full-width mt-2">
                    Mentés
                </button>
            </form>
        </div>
    );
};

export default ProjectForm;
