import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader, Edit3, X, Save, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { localDB } from '../../services/localDB';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';

export default function Calendar() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isFormatSaving, setIsFormatSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        status: '',
        note: '',
        start: '',
        end: ''
    });

    const calColors = [
        "#2563eb", // Blue
        "#dc2626", // Red
        "#16a34a", // Green
        "#ca8a04", // Gold
        "#9333ea", // Purple
        "#0891b2", // Cyan
        "#ea580c", // Orange
        "#db2777", // Pink
        "#4f46e5", // Indigo
        "#65a30d", // Lime
        "#0e7490", // Teal
        "#b91c1c", // Maroon
        "#7c2d12", // Brown
        "#4338ca", // Dark Blue
        "#be185d", // Deep Pink
        "#15803d", // Dark Green
        "#7e22ce", // Deep Purple
        "#c2410c", // Dark Orange
        "#0369a1", // Sky Blue
        "#a21caf", // Magenta
    ];

    const getProjectColor = (id) => {
        if (!id) return calColors[0];
        const strId = String(id);
        let hash = 0;
        for (let i = 0; i < strId.length; i++) {
            hash = strId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % calColors.length;
        return calColors[index];
    };

    const loadData = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            // Load local projects
            const pData = localDB.getAll(currentUser.uid, 'projects');
            setProjects(pData || []);
        } catch (err) {
            console.error("Calendar data load error:", err);
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const changeMonth = (delta) => {
        const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
        setCurrentDate(next);
    };

    const openEventModal = (e) => {
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
            // Update localDB
            localDB.set(currentUser.uid, 'projects', selectedEvent.id, editForm);

            // Update local state
            setProjects(prev => prev.map(p => p.id === selectedEvent.id ? { ...p, ...editForm } : p));
            setSelectedEvent(null);
        } catch (err) {
            console.error("Error updating project locally:", err);
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

        days.push({
            type: 'day',
            num: i,
            isToday: new Date().toDateString() === new Date(year, month, i).toDateString(),
            events: [
                ...dayProjects.map(p => ({ ...p, color: getProjectColor(p.id), type: 'project' }))
            ]
        });
    }

    const allMonthEvents = [
        ...projects.filter(p => {
            if (!p.start || !p.end) return false;
            const mStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const mEnd = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`;
            return p.start <= mEnd && p.end >= mStart;
        }).map(p => ({ ...p, type: 'project', date: p.start }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
        <div className="view-container">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Naptár</h1>
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
                                                    openEventModal(e);
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
                                onClick={() => openEventModal(e)}
                                className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 transition-colors cursor-pointer hover:border-primary-300"
                            >
                                <div
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{
                                        background: getProjectColor(e.id || 'x'),
                                        opacity: e.status === 'done' ? 0.4 : 1
                                    }}
                                ></div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className={`font-semibold text-gray-900 truncate ${e.status === 'done' ? 'line-through text-gray-400' : ''}`}>
                                            {e.client}
                                        </div>
                                        {e.status === 'done' && <Badge variant="success" className="text-[9px] py-0 px-1">KÉSZ</Badge>}
                                        {e.status === 'suspend' && <Badge variant="warning" className="text-[9px] py-0 px-1">SZÜNETEL</Badge>}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {e.start} - {e.end}
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
