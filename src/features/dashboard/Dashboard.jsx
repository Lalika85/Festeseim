import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, FileText, ShoppingBag, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { loadUserCollection } from '../../services/firestore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function Dashboard() {
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
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Üdvözöljük!</h1>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <Card className="!mb-0 bg-primary-50 border-primary-100">
                    <div className="text-sm text-primary-600 font-medium mb-1">Aktív munkák</div>
                    <div className="text-3xl font-bold text-primary-700">{loading ? '--' : activeCount}</div>
                </Card>
                <Card className="!mb-0">
                    <div className="text-sm text-gray-500 font-medium mb-1">Összes ügyfél</div>
                    <div className="text-3xl font-bold text-gray-900">{loading ? '--' : projects.length}</div>
                </Card>
            </div>

            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Gyorsműveletek</h3>
                <div className="grid grid-cols-1 gap-3">
                    <button
                        onClick={() => navigate('/projects/new')}
                        className="flex items-center justify-center p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-colors gap-3"
                    >
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <PlusCircle className="text-primary-600" size={20} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Új Munka Hozzáadása</span>
                    </button>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Legutóbbi munkák</h3>
                    <Button variant="ghost" onClick={() => navigate('/projects')} className="!p-0 !h-auto text-sm">
                        Összes <ArrowRight size={16} className="ml-1" />
                    </Button>
                </div>

                {loading ? (
                    <p className="text-center py-8 text-gray-500">Betöltés...</p>
                ) : recentProjects.length === 0 ? (
                    <Card className="text-center py-8 text-gray-500">
                        Még nincsenek felvitt munkák.
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {recentProjects.map(p => (
                            <div
                                key={p.id}
                                onClick={() => navigate(`/projects/${p.id}`)}
                                className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{p.client}</h4>
                                        <p className="text-sm text-gray-500 mt-0.5">{p.address || 'Nincs cím megadva'}</p>
                                    </div>
                                    <Badge variant={p.status === 'done' ? 'success' : p.status === 'suspend' ? 'warning' : 'info'}>
                                        {p.status === 'done' ? 'Kész' : p.status === 'suspend' ? 'Felfügg.' : 'Aktív'}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
