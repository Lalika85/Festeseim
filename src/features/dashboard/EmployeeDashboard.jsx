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

    if (loading) return <div className="text-center py-20 animate-spin text-4xl">⏳</div>;

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Üdvözöljük!</h1>
                <p className="text-gray-500 text-sm">Munkatársi felület</p>
            </header>

            {/* Assignments List */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight mb-4 flex items-center gap-2">
                    <Briefcase size={20} className="text-primary-600" />
                    Mai feladatok
                </h2>

                <div className="space-y-4">
                    {assignments.length === 0 ? (
                        <Card className="p-8 text-center border-dashed border-2 flex flex-col items-center gap-3">
                            <p className="text-sm text-gray-500 font-medium">Jelenleg nincs új kiosztott munkád.</p>
                        </Card>
                    ) : (
                        assignments.map((asgn) => (
                            <Card key={asgn.id} className={`p-5 border-l-4 transition-all shadow-sm ${asgn.status === 'done' ? 'border-l-green-500 bg-green-50/20' : 'border-l-primary-500 bg-white'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="min-w-0">
                                        <h3 className="font-black text-gray-900 text-sm uppercase tracking-tight truncate">{asgn.clientName}</h3>
                                        <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                                            <MapPin size={12} className="shrink-0" />
                                            <span className="truncate">{asgn.location || 'Helyszíni munka'}</span>
                                        </p>
                                    </div>
                                    <Badge className={asgn.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-primary-100 text-primary-700'}>
                                        {asgn.status === 'done' ? 'Kész' : 'Aktív'}
                                    </Badge>
                                </div>

                                {asgn.note && (
                                    <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl text-xs text-gray-600 mb-4 italic">
                                        "{asgn.note}"
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="w-full text-xs font-bold py-3 rounded-xl shadow-lg bg-emerald-600 hover:bg-emerald-700"
                                        onClick={() => navigate(`/shop?project=${asgn.projectId}`)}
                                    >
                                        <ShoppingBag size={14} className="mr-2" /> Bolt / Anyaglista
                                    </Button>
                                    {asgn.status !== 'done' && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="text-xs shrink-0 p-3 rounded-xl border-gray-200"
                                            onClick={async () => {
                                                if (window.confirm('Késznek jelölöd ezt a feladatot?')) {
                                                    await updateDoc(doc(db, 'users', currentUser.uid, 'assignments', asgn.id), { status: 'done' });
                                                }
                                            }}
                                        >
                                            <CheckCircle2 size={18} className="text-green-600" />
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* Tools Area - STRICTLY ONLY SHOP AND CALCULATOR */}
            <div className="pt-4 border-t border-gray-100">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Gyorselérés</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => navigate('/shop')}
                        className="flex flex-col items-center justify-center p-6 bg-white border border-gray-100 rounded-[2rem] shadow-sm active:scale-95 transition-all gap-3"
                    >
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                            <ShoppingBag size={28} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-tighter text-gray-900">Bolt</span>
                    </button>
                    <button
                        onClick={() => navigate('/calculator')}
                        className="flex flex-col items-center justify-center p-6 bg-white border border-gray-100 rounded-[2rem] shadow-sm active:scale-95 transition-all gap-3"
                    >
                        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                            <CalcIcon size={28} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-tighter text-gray-900">Kalkulátor</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
