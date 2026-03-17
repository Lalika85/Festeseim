import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { PlusCircle, FileText, ShoppingBag, Users, ArrowRight, Calculator as CalcIcon, ChevronRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function AdminDashboard({ currentUser }) {
    const navigate = useNavigate();
    const { ownerUid } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.uid) return;

        const projectsQuery = query(
            collection(db, 'users', ownerUid, 'projects'),
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
    }, [ownerUid]);

    const activeCount = projects.filter(p => !p.status || p.status === 'active').length;

    return (
        <div className="space-y-10 animate-fade-in">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">Üdvözöljük!</h1>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">Vállalkozás áttekintése</p>
                </div>
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-primary-600">
                    <Palette size={24} />
                </div>
            </header>

            <div className="grid grid-cols-2 gap-5">
                <div className="bg-gradient-to-br from-primary-600 to-indigo-700 p-6 rounded-[2rem] shadow-xl shadow-primary-200 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Briefcase size={64} />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Aktív munkák</div>
                    <div className="text-4xl font-black">{loading ? '...' : activeCount}</div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 text-gray-900 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <ShoppingBag size={64} />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Összes projekt</div>
                    <div className="text-4xl font-black">{loading ? '...' : projects.length}</div>
                </div>
            </div>

            <section>
                <div className="flex items-center justify-between mb-6 px-1">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Gyorsműveletek</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => navigate('/projects/new')} className="action-card group">
                        <div className="action-card-icon bg-primary-50 text-primary-600">
                            <PlusCircle size={24} />
                        </div>
                        <span className="text-sm font-bold text-gray-900">Új Munka</span>
                        <span className="text-[10px] text-gray-400 font-medium mt-1">Projekt rögzítése</span>
                    </button>

                    <button onClick={() => navigate('/quote')} className="action-card group">
                        <div className="action-card-icon bg-indigo-50 text-indigo-600">
                            <FileText size={24} />
                        </div>
                        <span className="text-sm font-bold text-gray-900">Árajánlat</span>
                        <span className="text-[10px] text-gray-400 font-medium mt-1">Készítés</span>
                    </button>

                    <button onClick={() => navigate('/team')} className="action-card group">
                        <div className="action-card-icon bg-amber-50 text-amber-600">
                            <Users size={24} />
                        </div>
                        <span className="text-sm font-bold text-gray-900">Csapat</span>
                        <span className="text-[10px] text-gray-400 font-medium mt-1">Kezelés</span>
                    </button>

                    <button onClick={() => navigate('/calculator')} className="action-card group">
                        <div className="action-card-icon bg-emerald-50 text-emerald-600">
                            <CalcIcon size={24} />
                        </div>
                        <span className="text-sm font-bold text-gray-900">Kalkulátor</span>
                        <span className="text-[10px] text-gray-400 font-medium mt-1">Számítás</span>
                    </button>
                </div>
            </section>

            {!loading && projects.length > 0 && (
                <section>
                    <div className="flex justify-between items-center mb-6 px-1">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Legutóbbi munkák</h3>
                        <button onClick={() => navigate('/projects')} className="text-[10px] font-black text-primary-600 uppercase tracking-widest flex items-center gap-1">
                            Összes <ArrowRight size={12} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {projects.slice(0, 3).map(p => (
                            <div
                                key={p.id}
                                onClick={() => navigate(`/projects/${p.id}`)}
                                className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm active:scale-[0.98] transition-all cursor-pointer flex justify-between items-center group"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors shrink-0">
                                        <Briefcase size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-gray-900 text-sm truncate">{p.client}</h4>
                                        <p className="text-[10px] font-bold text-gray-400 mt-0.5 truncate uppercase tracking-tighter">{p.address || 'Nincs cím'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <Badge variant={p.status === 'done' ? 'success' : p.status === 'suspend' ? 'warning' : 'info'}>
                                        {p.status === 'done' ? 'Kész' : p.status === 'suspend' ? 'Felfügg.' : 'Aktív'}
                                    </Badge>
                                    <ChevronRight size={16} className="text-gray-300 group-hover:text-primary-400 transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
