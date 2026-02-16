import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { loadUserCollection } from '../../services/firestore';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const { currentUser } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStats = async () => {
            if (!currentUser) return;
            try {
                const data = await loadUserCollection(currentUser.uid, 'projects');
                setProjects(data);
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [currentUser]);

    const activeCount = projects.filter(p => (p.status || 'active') === 'active').length;
    const recentProjects = projects.slice(0, 3);

    return (
        <div className="view-container">
            <h1 style={{ marginBottom: '1.5rem' }}>Üdvözöljük!</h1>

            <div className="dashboard-stats">
                <div className="stat-card blue">
                    <div className="stat-label">Aktív munkák</div>
                    <div className="stat-value">{loading ? '--' : activeCount}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Összes ügyfél</div>
                    <div className="stat-value">{loading ? '--' : projects.length}</div>
                </div>
            </div>

            <div className="section-header">
                <h3>Gyorsműveletek</h3>
            </div>
            <div className="quick-actions-grid">
                <div className="action-card primary" onClick={() => navigate('/projects/new')}>
                    <div className="icon-box"><i className="fas fa-plus-circle"></i></div>
                    <span>Új Munka</span>
                </div>
                <div className="action-card" onClick={() => navigate('/quote/new')}>
                    <div className="icon-box"><i className="fas fa-file-invoice-dollar"></i></div>
                    <span>Árajánlat</span>
                </div>
                <div className="action-card" onClick={() => navigate('/shop')}>
                    <div className="icon-box"><i className="fas fa-shopping-basket"></i></div>
                    <span>Bolt</span>
                </div>
            </div>

            <div className="section-header">
                <h3>Legutóbbi munkák</h3>
                <button className="btn btn-text" onClick={() => navigate('/projects')}>Összes</button>
            </div>

            {loading ? (
                <p className="text-center">Betöltés...</p>
            ) : recentProjects.length === 0 ? (
                <div className="card text-center" style={{ color: 'var(--text-muted)' }}>
                    Még nincsenek felvitt munkák.
                </div>
            ) : (
                <div className="recent-list">
                    {recentProjects.map(p => (
                        <div key={p.id} className="card" style={{ cursor: 'pointer', marginBottom: '0.75rem' }} onClick={() => navigate(`/projects/${p.id}`)}>
                            <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{p.client}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{p.address || 'Nincs cím megadva'}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
