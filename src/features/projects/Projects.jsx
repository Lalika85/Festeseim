import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MapPin, Phone } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { loadUserCollection } from '../../services/firestore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

export default function Projects() {
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
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Munkák</h1>
                <Button onClick={() => navigate('/projects/new')} icon={<Plus size={18} />}>
                    Új
                </Button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Keresés (név, cím, tel)..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                </div>

                <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar">
                    {['all', 'active', 'suspend', 'done'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === status
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {status === 'all' ? 'Minden' :
                                status === 'active' ? 'Aktív' :
                                    status === 'suspend' ? 'Felfügg.' : 'Kész'}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin text-4xl mb-2">⏳</div>
                    <p className="text-gray-500">Betöltés...</p>
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500 mb-4">Nincs találat a keresési feltételekre.</p>
                    <Button variant="secondary" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
                        Szűrők törlése
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredProjects.map(p => (
                        <div
                            key={p.id}
                            onClick={() => navigate(`/projects/${p.id}`)}
                            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm active:scale-[0.99] transition-all cursor-pointer hover:border-primary-200"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-lg text-gray-900">{p.client}</h3>
                                <Badge variant={p.status === 'done' ? 'success' : p.status === 'suspend' ? 'warning' : 'info'}>
                                    {p.status === 'done' ? 'Kész' : p.status === 'suspend' ? 'Felfügg.' : 'Aktív'}
                                </Badge>
                            </div>

                            <div className="space-y-1.5">
                                {p.address && (
                                    <div className="flex items-center text-sm text-gray-600">
                                        <MapPin size={16} className="mr-2 text-gray-400" />
                                        {p.address}
                                    </div>
                                )}
                                {p.phone && (
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Phone size={16} className="mr-2 text-gray-400" />
                                        {p.phone}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
