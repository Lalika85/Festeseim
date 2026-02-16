import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { loadUserCollection } from '../../services/firestore';
import { auth, googleProvider } from '../../services/firebase';
import { signInWithPopup } from 'firebase/auth';

const Calendar = () => {
    const { currentUser } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [projects, setProjects] = useState([]);
    const [googleEvents, setGoogleEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isGoogleConnected, setIsGoogleConnected] = useState(!!localStorage.getItem('google_access_token'));

    const calColors = ["#1a237e", "#c62828", "#2e7d32", "#f57f17", "#00838f", "#6a1b9a", "#ad1457", "#283593", "#4e342e", "#455a64"];
    const getProjectColor = (id) => calColors[id % calColors.length];

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

    useEffect(() => {
        const loadData = async () => {
            if (!currentUser) return;
            setLoading(true);
            try {
                const [pData, gData] = await Promise.all([
                    loadUserCollection(currentUser.uid, 'projects'),
                    fetchGoogleEvents()
                ]);
                setProjects(pData);
                setGoogleEvents(gData);
            } catch (err) {
                console.error("Calendar data load error:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [currentUser, currentDate, fetchGoogleEvents]);

    const handleGoogleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const credential = result.credential; // This might be null if not linked? No, popup with provider should return it.
            // In Firebase v10+, the credential is on the result.
            const token = credential.accessToken;
            if (token) {
                localStorage.setItem('google_access_token', token);
                setIsGoogleConnected(true);
                const gData = await fetchGoogleEvents();
                setGoogleEvents(gData);
            }
        } catch (error) {
            console.error("Google login error:", error);
            alert("Google bejelentkezés sikertelen!");
        }
    };

    const changeMonth = (delta) => {
        const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
        setCurrentDate(next);
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
            const start = (e.start.dateTime || e.start.date).slice(0, 10);
            return start === dateStr;
        });

        days.push({
            type: 'day',
            num: i,
            isToday: new Date().toDateString() === new Date(year, month, i).toDateString(),
            events: [
                ...dayProjects.map(p => ({ color: getProjectColor(p.id), type: 'project' })),
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
        ...googleEvents.map(e => ({
            id: e.id,
            client: e.summary,
            start: (e.start.dateTime || e.start.date),
            end: (e.end.dateTime || e.end.date),
            type: 'google',
            date: (e.start.dateTime || e.start.date)
        }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
        <div className="view-container">
            <div className="section-header">
                <h1>Naptár</h1>
                {!isGoogleConnected && (
                    <button className="btn btn-secondary" onClick={handleGoogleLogin} style={{ height: '36px', padding: '0 12px', fontSize: '13px' }}>
                        <i className="fab fa-google"></i> Google
                    </button>
                )}
            </div>

            <div className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <button className="btn-icon" onClick={() => changeMonth(-1)}><i className="fas fa-chevron-left"></i></button>
                    <h3 style={{ border: 'none', margin: 0, padding: 0 }}>{year} {monthNames[month]}</h3>
                    <button className="btn-icon" onClick={() => changeMonth(1)}><i className="fas fa-chevron-right"></i></button>
                </div>

                <div className="cal-weekdays" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    <div>Hé</div><div>Ke</div><div>Sze</div><div>Csü</div><div>Pé</div><div>Szo</div><div>Va</div>
                </div>

                <div className="cal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {days.map((d, x) => (
                        <div key={x} className={`cal-day ${d.isToday ? 'today' : ''}`} style={{
                            height: '50px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: d.type === 'empty' ? 'transparent' : 'var(--bg-app)',
                            borderRadius: '8px',
                            border: d.isToday ? '2px solid var(--primary)' : 'none',
                            position: 'relative',
                            fontSize: '14px',
                            fontWeight: d.isToday ? 'bold' : 'normal'
                        }}>
                            {d.num}
                            <div style={{ display: 'flex', gap: '2px', position: 'absolute', bottom: '4px' }}>
                                {d.events?.map((e, idx) => (
                                    <div key={idx} style={{ width: '4px', height: '4px', borderRadius: '50%', background: e.color }}></div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="detail-section">
                <div className="section-title">Események</div>
                {loading ? (
                    <p className="text-center">Betöltés...</p>
                ) : allMonthEvents.length === 0 ? (
                    <div className="card text-center" style={{ color: 'var(--text-muted)' }}>Nincs esemény ebben a hónapban.</div>
                ) : (
                    allMonthEvents.map((e, idx) => (
                        <div key={idx} className="list-item" style={{ cursor: e.type === 'project' ? 'pointer' : 'default' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: e.type === 'project' ? getProjectColor(e.id) : '#4285F4' }}></div>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{e.client}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {e.type === 'project' ? `${e.start} - ${e.end}` : new Date(e.date).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                            {e.type === 'project' && <i className="fas fa-chevron-right" style={{ color: 'var(--border)' }}></i>}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Calendar;
