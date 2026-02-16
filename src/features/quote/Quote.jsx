import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { loadUserCollection, syncItem, removeItem } from '../../services/firestore';
import { useNavigate } from 'react-router-dom';

const Quote = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [savedQuotes, setSavedQuotes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuotes = async () => {
            if (!currentUser) return;
            try {
                const data = await loadUserCollection(currentUser.uid, 'quotes');
                setSavedQuotes(data);
            } catch (err) {
                console.error("Fetch quotes error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchQuotes();
    }, [currentUser]);

    const handleDelete = async (id) => {
        if (!window.confirm('Törlöd az árajánlatot?')) return;
        setSavedQuotes(savedQuotes.filter(q => q.id !== id));
        await removeItem(currentUser.uid, 'quotes', id);
    };

    return (
        <div className="view-container">
            <div className="section-header">
                <h1>Árajánlatok</h1>
                <button className="btn btn-primary" onClick={() => navigate('/quote/new')}>
                    <i className="fas fa-plus"></i> Új
                </button>
            </div>

            {loading ? (
                <p className="text-center">Betöltés...</p>
            ) : savedQuotes.length === 0 ? (
                <div className="card text-center" style={{ color: 'var(--text-muted)' }}>
                    Nincs mentett árajánlat.
                </div>
            ) : (
                <div className="quote-list">
                    {savedQuotes.map(q => (
                        <div key={q.id} className="list-item">
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold' }}>{q.client}</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                    {q.date} • {Math.round(q.total || 0).toLocaleString()} Ft
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-icon" onClick={() => navigate(`/quote/edit/${q.id}`)}>
                                    <i className="fas fa-edit" style={{ color: 'var(--primary)', opacity: 0.6 }}></i>
                                </button>
                                <button className="btn-icon" onClick={() => handleDelete(q.id)}>
                                    <i className="fas fa-trash" style={{ color: 'var(--danger)', opacity: 0.6 }}></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Quote;
