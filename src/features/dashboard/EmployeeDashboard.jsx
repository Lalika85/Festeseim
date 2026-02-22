import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { ShoppingBag, Briefcase, CheckCircle2, MapPin, ChevronRight, Calculator as CalcIcon } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function EmployeeDashboard({ currentUser }) {
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.uid) return;

        const assignmentsQuery = query(
            collection(db, 'users', currentUser.uid, 'assignments'),
            orderBy('assignedAt', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(assignmentsQuery, (snap) => {
            setAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (err) => {
            console.error("Error fetching assignments:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Üdvözöljük!</h1>
                <p className="text-gray-500 text-sm">Munkatársi felület</p>
            </header>

            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">Mai feladatok</h2>
                    <span className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full uppercase tracking-wider">
                        {assignments.length} Feladat
                    </span>
                </div>

                <div className="space-y-4">
                    {assignments.length === 0 ? (
                        <Card className="p-8 text-center border-dashed border-2 flex flex-col items-center gap-3">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                                <Briefcase size={24} />
                            </div>
                            <p className="text-sm text-gray-500">Nincs még kiosztott munkád.</p>
                        </Card>
                    ) : (
                        assignments.map((asgn) => (
                            <Card key={asgn.id} className={`p-4 border-l-4 transition-all ${asgn.status === 'done' ? 'border-l-green-500 bg-green-50/30' : 'border-l-primary-500 bg-white'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="min-w-0">
                                        <h3 className="font-black text-gray-900 text-sm uppercase tracking-tight truncate">{asgn.clientName}</h3>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                                            <MapPin size={12} className="shrink-0" />
                                            <span className="truncate">{asgn.location || 'Nincs cím'}</span>
                                        </div>
                                    </div>
                                    <Badge className={asgn.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-primary-100 text-primary-700'}>
                                        {asgn.status === 'done' ? 'Kész' : 'Kiosztva'}
                                    </Badge>
                                </div>

                                {asgn.note && (
                                    <div className="bg-white/50 border border-gray-100 p-3 rounded-xl text-xs text-gray-600 mb-4 shadow-sm">
                                        <p className="font-bold text-[10px] text-gray-400 uppercase tracking-widest mb-1">Admin üzenete:</p>
                                        "{asgn.note}"
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="w-full text-xs font-bold py-2.5 rounded-xl shadow-sm"
                                        onClick={() => navigate(`/shop?project=${asgn.projectId}`)}
                                    >
                                        <ShoppingBag size={14} className="mr-2" /> Bevásárlólista
                                    </Button>
                                    {asgn.status !== 'done' && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="text-xs shrink-0 p-2.5 rounded-xl border-gray-200"
                                            onClick={async () => {
                                                await updateDoc(doc(db, 'users', currentUser.uid, 'assignments', asgn.id), { status: 'done' });
                                            }}
                                        >
                                            <CheckCircle2 size={16} />
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Eszközök</h3>
                <div className="grid grid-cols-1 gap-3">
                    <button
                        onClick={() => navigate('/shop')}
                        className="flex items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all gap-4 text-left group"
                    >
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors shrink-0">
                            <ShoppingBag className="text-emerald-600" size={24} />
                        </div>
                        <div>
                            <span className="block text-sm font-bold text-gray-900">Bolt</span>
                            <span className="text-xs text-gray-500">Anyagok beszerzése</span>
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
                            <span className="block text-sm font-bold text-gray-900">Kalkulátor</span>
                            <span className="text-xs text-gray-500">Szükséglet számítása</span>
                        </div>
                        <ChevronRight className="ml-auto text-gray-300" size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
