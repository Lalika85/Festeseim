import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { loadUserCollection } from '../../services/firestore';
import ProjectCard from './ProjectCard';
import { useNavigate } from 'react-router-dom';

const Projects = () => {
    const { currentUser } = useAuth();
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProjects = async () => {
            if (!currentUser) return;
            try {
                const data = await loadUserCollection(currentUser.uid, 'projects');
                setProjects(data);
                setFilteredProjects(data);
            } catch (err) {
                console.error("Fetch projects error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, [currentUser]);

    useEffect(() => {
        const filtered = projects.filter(p => {
            const matchesStatus = statusFilter === 'all' || (p.status || 'active') === statusFilter;
            const term = search.toLowerCase();
            const matchesSearch = !term ||
                (p.client || '').toLowerCase().includes(term) ||
                (p.address || '').toLowerCase().includes(term) ||
                (p.phone || '').toLowerCase().includes(term);
            return matchesStatus && matchesSearch;
        });
        setFilteredProjects(filtered);
    }, [search, statusFilter, projects]);

    return (
        <div className="view-container">
            <div className="section-header">
                <h1>Munkák</h1>
                <button className="btn btn-primary" onClick={() => navigate('/projects/new')}>
                    <i className="fas fa-plus"></i> Új
                </button>
            </div>

            <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
                <input
                    type="text"
                    placeholder="Keresés (név, cím, tel)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ marginBottom: '0.75rem' }}
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ marginBottom: '0' }}
                >
                    <option value="all">Minden állapot</option>
                    <option value="active">Elkezdett</option>
                    <option value="suspend">Felfüggesztve</option>
                    <option value="done">Befejezett</option>
                </select>
            </div>

            {loading ? (
                <p className="text-center">Betöltés...</p>
            ) : filteredProjects.length === 0 ? (
                <p className="text-center" style={{ color: 'var(--text-muted)' }}>Nincs találat.</p>
            ) : (
                <div className="projects-grid">
                    {filteredProjects.map(p => (
                        <ProjectCard key={p.id} project={p} onClick={() => navigate(`/projects/${p.id}`)} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Projects;
