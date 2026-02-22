import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { PlusCircle, FileText, ShoppingBag, Users, ArrowRight, Calculator as CalcIcon, ChevronRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function AdminDashboard({ currentUser }) {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.uid) return;

        const projectsQuery = query(
            collection(db, 'users', currentUser.uid, 'projects'),
            orderBy('createdAt', 'desc'),
            limit(5)
        );

        const unsubscribe = onSnapshot(projectsQuery, (snap) => {
            setProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (err) => {
            console.error("Error fetching projects:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const activeCount = projects.filter(p => !p.status || p.status === 'active').length;

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Üdvözöljük, Admin!</h1>
                <p className="text-gray-500 text-sm">Vállalkozás áttekintése</p>
            </header>

            <div className="grid grid-cols-2 gap-4">
                <Card className="!mb-0 bg-primary-50 border-primary-100 p-4">
                    <div className="text-xs text-primary-600 font-bold uppercase tracking-wider mb-1">Aktív munkák</div>
                    <div className="text-3xl font-black text-primary-700">{loading ? '--' : activeCount}</div>
                </Card>
                <Card className="!mb-0 p-4">
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Összes projekt</div>
                    <div className="text-3xl font-black text-gray-900">{loading ? '--' : projects.length}</div>
                </Card>
            </div>

            <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Gyorsműveletek</h3>
                <div className="grid gap-3">
                    <button
                        onClick={() => navigate('/projects/new')}
                        className="flex items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all gap-4 text-left group"
                    >
                        <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center group-hover:bg-primary-100 transition-colors shrink-0">
                            <PlusCircle className="text-primary-600" size={24} />
                        </div>
                        <div>
                            <span className="block text-sm font-bold text-gray-900">Új Munka</span>
                            <span className="text-xs text-gray-500">Projekt rögzítése</span>
                        </div>
                        <ChevronRight className="ml-auto text-gray-300" size={20} />
                    </button>

                    <button
                        onClick={() => navigate('/quote')}
                        className="flex items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all gap-4 text-left group"
                    >
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors shrink-0">
                            <FileText className="text-indigo-600" size={24} />
                        </div>
                        <div>
                            <span className="block text-sm font-bold text-gray-900">Árajánlat</span>
                            <span className="text-xs text-gray-500">Új ajánlat készítése</span>
                        </div>
                        <ChevronRight className="ml-auto text-gray-300" size={20} />
                    </button>

                    <button
                        onClick={() => navigate('/team')}
                        className="flex items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all gap-4 text-left group"
                    >
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0">
                            <Users className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <span className="block text-sm font-bold text-gray-900">Csapat</span>
                            <span className="text-xs text-gray-500">Alkalmazottak kezelése</span>
                        </div>
                        <ChevronRight className="ml-auto text-gray-300" size={20} />
                    </button>

                    <button
                        onClick={() => navigate('/calculator')}
                        className="flex items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all gap-4 text-left group"
                    >
                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center group-hover:bg-amber-100 transition-colors shrink-0">
                            <CalcIcon className="text-amber-600" size={24} />
                        </div>
                        <div>
                            <span className="block text-sm font-bold text-gray-900">Anyagkalkulátor</span>
                            <span className="text-xs text-gray-500">Szükséglet számítása</span>
                        </div>
                        <ChevronRight className="ml-auto text-gray-300" size={20} />
                    </button>
                </div>
            </div>

            {!loading && projects.length > 0 && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Legutóbbi munkák</h3>
                        <Button variant="ghost" onClick={() => navigate('/projects')} className="!p-0 !h-auto text-xs font-bold text-primary-600">
                            Összes <ArrowRight size={14} className="ml-1" />
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {projects.slice(0, 3).map(p => (
                            <div
                                key={p.id}
                                onClick={() => navigate(`/projects/${p.id}`)}
                                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all cursor-pointer flex justify-between items-center"
                            >
                                <div className="min-w-0">
                                    <h4 className="font-bold text-gray-900 text-sm">{p.client}</h4>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">{p.address || 'Nincs cím megadva'}</p>
                                </div>
                                <Badge variant={p.status === 'done' ? 'success' : p.status === 'suspend' ? 'warning' : 'info'}>
                                    {p.status === 'done' ? 'Kész' : p.status === 'suspend' ? 'Felfügg.' : 'Aktív'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
