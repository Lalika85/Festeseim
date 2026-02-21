import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { User, Phone, Mail, MapPin, Calendar, FileText, ArrowLeft, Save } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

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
        end: '',
        assignedTo: ''
    });
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(isEdit);

    useEffect(() => {
        if (!currentUser) return;

        // Fetch team members for assignment
        const teamRef = doc(db, 'users', currentUser.uid, 'settings', 'team');
        const unsubTeam = onSnapshot(teamRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const activeMembers = (data.members || []).filter(m => m.status === 'active');
                setTeamMembers(activeMembers.map(m => ({ value: m.id, label: m.name || m.email })));
            }
        });

        if (isEdit && id) {
            const fetchProject = async () => {
                try {
                    const docRef = doc(db, 'users', currentUser.uid, 'projects', id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setFormData(prev => ({ ...prev, ...docSnap.data() }));
                    }
                } catch (err) {
                    console.error("Error fetching project for edit:", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchProject();
        }

        return () => unsubTeam();
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

    if (loading) return <div className="text-center py-12"><div className="animate-spin text-4xl mb-2">⏳</div><p className="text-gray-500">Betöltés...</p></div>;

    const statusOptions = [
        { value: 'active', label: 'Elkezdett (Aktív)' },
        { value: 'suspend', label: 'Felfüggesztve' },
        { value: 'done', label: 'Befejezett' }
    ];

    return (
        <div className="view-container max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Button variant="secondary" onClick={() => navigate(-1)} className="!p-2.5 rounded-full shadow-sm border-0 bg-white">
                    <ArrowLeft size={22} className="text-gray-700" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                        {isEdit ? 'Adatok Szerkesztése' : 'Új Munkalap'}
                    </h1>
                    <p className="text-sm text-gray-500">
                        {isEdit ? 'Meglévő ügyfél adatainak módosítása' : 'Új ügyfél és munka felvétele'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <Card className="!p-0 overflow-hidden shadow-lg border-primary-100">
                    <div className="bg-primary-50 p-6 border-b border-primary-100">
                        <Input
                            label="Megrendelő Neve"
                            name="client"
                            value={formData.client}
                            onChange={handleChange}
                            required
                            icon={<User size={18} />}
                            placeholder="Pl. Kovács János"
                            className="!mb-0"
                        />
                    </div>

                    <div className="p-6 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Telefonszám"
                                name="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={handleChange}
                                icon={<Phone size={18} />}
                                placeholder="+36 30 123 4567"
                            />
                            <Input
                                label="Email cím"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                icon={<Mail size={18} />}
                                placeholder="pelda@email.hu"
                            />
                        </div>

                        <Input
                            label="Cím"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            icon={<MapPin size={18} />}
                            placeholder="Település, Utca, Házszám"
                        />

                        <div className="pt-4 pb-2">
                            <div className="h-px bg-gray-100 w-full mb-4"></div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Munka Részletei</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select
                                label="Állapot"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                options={statusOptions}
                            />
                            {teamMembers.length > 0 && (
                                <Select
                                    label="Felelős (Csapat)"
                                    name="assignedTo"
                                    value={formData.assignedTo}
                                    onChange={handleChange}
                                    options={[{ value: '', label: 'Saját magam' }, ...teamMembers]}
                                />
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Kezdés dátuma"
                                name="start"
                                type="date"
                                value={formData.start}
                                onChange={handleChange}
                                icon={<Calendar size={18} />}
                            />
                            <Input
                                label="Befejezés (Terv)"
                                name="end"
                                type="date"
                                value={formData.end}
                                onChange={handleChange}
                                icon={<Calendar size={18} />}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
                                Megjegyzés
                            </label>
                            <div className="relative">
                                <FileText className="absolute top-3 left-3 text-gray-400 pointer-events-none" size={18} />
                                <textarea
                                    name="note"
                                    value={formData.note}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400 pl-10"
                                    placeholder="Egyéb információk..."
                                />
                            </div>
                        </div>

                        <Button type="submit" variant="primary" className="w-full !py-3 !text-lg mt-4 shadow-md" icon={<Save size={20} />}>
                            Mentés
                        </Button>
                    </div>
                </Card>
            </form>
        </div>
    );
};

export default ProjectForm;
