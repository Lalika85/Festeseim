import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader, Edit3, X, Save, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { loadUserCollection } from '../../services/firestore';
import { auth, googleProvider, db } from '../../services/firebase';
import { signInWithPopup } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

export default function Calendar() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [projects, setProjects] = useState([]);
    const [googleEvents, setGoogleEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isGoogleConnected, setIsGoogleConnected] = useState(!!localStorage.getItem('google_access_token'));

    // Modal State
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isFormatSaving, setIsFormatSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        status: '',
        note: '',
        start: '',
        end: ''
    });

    const calColors = ["#1d4ed8", "#b91c1c", "#15803d", "#c2410c", "#0e7490", "#7e22ce", "#be185d", "#4338ca"];
    const getProjectColor = (id) => {
        if (!id) return calColors[0];
        const strId = String(id);
        return calColors[strId.charCodeAt(0) % calColors.length];
    };

    const fetchGoogleEvents = useCallback(async () => {
        const token = localStorage.getItem('google_access_token');
        if (!token) return [];
        try {
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();

            const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfMonth}&timeMax=${endOfMonth}&singleEvents=true&orderBy=startTime`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                localStorage.removeItem('google_access_token');
                setIsGoogleConnected(false);
                return [];
            }

            const data = await response.json();
            return data.items || [];
        } catch (err) {
            console.error("Google fetch error:", err);
            return [];
        }
    }, [currentDate]);

    const loadData = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const [pData, gData] = await Promise.all([
                loadUserCollection(currentUser.uid, 'projects'),
                fetchGoogleEvents()
            ]);
            setProjects(pData || []);
            setGoogleEvents(gData || []);
        } catch (err) {
            console.error("Calendar data load error:", err);
        } finally {
            setLoading(false);
        }
    }, [currentUser, fetchGoogleEvents]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleGoogleLogin = async () => {
        try {
            const isNative = window.Capacitor?.isNative;
            let token = null;

            if (isNative) {
                // Native Google Sign-In
                try {
                    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
                    const result = await FirebaseAuthentication.signInWithGoogle();
                    const idToken = result.credential?.idToken;

                    if (idToken) {
                        // Bridge to Web SDK for Firestore access
                        const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth');
                        const credential = GoogleAuthProvider.credential(idToken);
                        await signInWithCredential(auth, credential);
                        token = result.credential?.accessToken; // Or use idToken as needed for API
                    }
                } catch (nativeErr) {
                    console.error("Native Google Login failed:", nativeErr);
                    throw nativeErr; // Re-throw to handle in outer catch
                }
            } else {
                // Web Google Sign-In
                const result = await signInWithPopup(auth, googleProvider);
                const credential = result.credential;
                token = credential?.accessToken;
            }

            if (token) {
                localStorage.setItem('google_access_token', token);
                setIsGoogleConnected(true);
                const gData = await fetchGoogleEvents();
                setGoogleEvents(gData);
            }
        } catch (error) {
            console.error("Google login error:", error);
            alert("Google bejelentkezés sikertelen! " + error.message);
        }
    };

    const changeMonth = (delta) => {
        const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
        setCurrentDate(next);
    };

    const openEventModal = (e) => {
        if (e.type === 'google') return; // Read-only for Google events currently
        setSelectedEvent(e);
        setEditForm({
            status: e.status || 'active',
            note: e.note || '',
            start: e.start || '',
            end: e.end || ''
        });
    };

    const handleSaveEvent = async () => {
        if (!selectedEvent || !currentUser) return;
        setIsFormatSaving(true);
        try {
            const docRef = doc(db, 'users', currentUser.uid, 'projects', selectedEvent.id);
            await updateDoc(docRef, editForm);

            // Update local state
            setProjects(prev => prev.map(p => p.id === selectedEvent.id ? { ...p, ...editForm } : p));
            setSelectedEvent(null);
        } catch (err) {
            console.error("Error updating project:", err);
            alert("Hiba mentéskor!");
        } finally {
            setIsFormatSaving(false);
        }
    };

    // Calendar Grid Logic
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ["Január", "Február", "Március", "Április", "Május", "Június", "Július", "Augusztus", "Szeptember", "Október", "November", "December"];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay() || 7; // 1 (Mon) - 7 (Sun)

    const days = [];
    for (let i = 1; i < firstDay; i++) days.push({ type: 'empty' });
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayProjects = projects.filter(p => p.start && p.end && dateStr >= p.start && dateStr <= p.end);
        const dayGoogle = googleEvents.filter(e => {
            if (!e.start) return false;
            const start = (e.start.dateTime || e.start.date || '').slice(0, 10);
            return start === dateStr;
        });

        days.push({
            type: 'day',
            num: i,
            isToday: new Date().toDateString() === new Date(year, month, i).toDateString(),
            events: [
                ...dayProjects.map(p => ({ ...p, color: getProjectColor(p.id), type: 'project' })),
                ...dayGoogle.map(() => ({ color: '#4285F4', type: 'google' }))
            ]
        });
    }

    const allMonthEvents = [
        ...projects.filter(p => {
            if (!p.start || !p.end) return false;
            const mStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const mEnd = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`;
            return p.start <= mEnd && p.end >= mStart;
        }).map(p => ({ ...p, type: 'project', date: p.start })),
        ...googleEvents.filter(e => e.start && (e.start.dateTime || e.start.date)).map(e => ({
            id: e.id,
            client: e.summary || 'Névtelen esemény',
            start: (e.start.dateTime || e.start.date),
            end: (e.end.dateTime || e.end.date),
            type: 'google',
            date: (e.start.dateTime || e.start.date)
        }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
        <div className="view-container">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Naptár</h1>
                {!isGoogleConnected && (
                    <Button variant="secondary" onClick={handleGoogleLogin} className="!py-1.5 !px-3 !text-xs">
                        Google Connect
                    </Button>
                )}
            </div>

            <Card className="!p-4 mb-6">
                <div className="flex justify-between items-center mb-6">
                    <Button variant="ghost" onClick={() => changeMonth(-1)} className="!p-1">
                        <ChevronLeft size={24} />
                    </Button>
                    <h3 className="text-lg font-bold text-gray-800">{year} {monthNames[month]}</h3>
                    <Button variant="ghost" onClick={() => changeMonth(1)} className="!p-1">
                        <ChevronRight size={24} />
                    </Button>
                </div>

                <div className="grid grid-cols-7 mb-2 text-center text-xs text-gray-400 font-medium">
                    <div>Hé</div><div>Ke</div><div>Sze</div><div>Csü</div><div>Pé</div><div>Szo</div><div>Va</div>
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {days.map((d, x) => (
                        <div key={x} className={`min-h-[3rem] flex flex-col items-center justify-start py-1 rounded-lg relative ${d.type === 'empty' ? '' : 'bg-gray-50'
                            } ${d.isToday ? 'ring-2 ring-primary-500 font-bold bg-primary-50' : ''}`}>
                            {d.type !== 'empty' && (
                                <div className="w-full flex flex-col items-center cursor-pointer" onClick={() => {
                                    // Maybe open day view? For now just show existing
                                }}>
                                    <span className={`text-sm mb-1 ${d.isToday ? 'text-primary-700' : 'text-gray-700'}`}>{d.num}</span>
                                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center px-1">
                                        {d.events?.map((e, idx) => (
                                            <div
                                                key={idx}
                                                className="w-2 h-2 rounded-full cursor-pointer hover:scale-125 transition-transform"
                                                style={{ backgroundColor: e.color }}
                                                title={e.client}
                                                onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    if (e.type === 'project') openEventModal(e);
                                                }}
                                            ></div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </Card>

            <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Események</h3>
                {loading ? (
                    <div className="text-center py-6">
                        <Loader className="animate-spin mx-auto text-primary-500" />
                        <p className="text-gray-500 mt-2">Betöltés...</p>
                    </div>
                ) : allMonthEvents.length === 0 ? (
                    <Card className="text-center py-6 text-gray-500 italic">
                        Nincs esemény ebben a hónapban.
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {allMonthEvents.map((e, idx) => (
                            <div
                                key={idx}
                                onClick={() => e.type === 'project' && openEventModal(e)}
                                className={`bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 transition-colors ${e.type === 'project' ? 'cursor-pointer hover:border-primary-300' : ''}`}
                            >
                                <div
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ background: e.type === 'project' ? getProjectColor(e.id || 'x') : '#4285F4' }}
                                ></div>
                                <div>
                                    <div className="font-semibold text-gray-900">{e.client}</div>
                                    <div className="text-xs text-gray-500">
                                        {e.type === 'project' ?
                                            `${e.start} - ${e.end}` :
                                            new Date(e.date).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })
                                        }
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Edit Modal */}
            <Modal
                isOpen={!!selectedEvent}
                onClose={() => setSelectedEvent(null)}
                title="Gyors Szerkesztés"
            >
                {selectedEvent && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xl font-bold text-gray-900">{selectedEvent.client}</h4>
                            <Button
                                variant="secondary"
                                icon={<ExternalLink size={16} />}
                                onClick={() => navigate(`/projects/${selectedEvent.id}`)}
                                className="!py-1 !px-2 !text-xs"
                            >
                                Adatlap
                            </Button>
                        </div>

                        <Select
                            label="Státusz"
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            options={[
                                { value: 'active', label: 'Aktív' },
                                { value: 'suspend', label: 'Felfüggesztve' },
                                { value: 'done', label: 'Kész' }
                            ]}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                type="date"
                                label="Kezdés"
                                value={editForm.start}
                                onChange={(e) => setEditForm({ ...editForm, start: e.target.value })}
                            />
                            <Input
                                type="date"
                                label="Vége"
                                value={editForm.end}
                                onChange={(e) => setEditForm({ ...editForm, end: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Megjegyzés</label>
                            <textarea
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 outline-none"
                                rows={3}
                                value={editForm.note}
                                onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                            ></textarea>
                        </div>

                        <div className="pt-2">
                            <Button
                                onClick={handleSaveEvent}
                                loading={isFormatSaving}
                                className="w-full"
                                icon={<Save size={18} />}
                            >
                                Mentés
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
