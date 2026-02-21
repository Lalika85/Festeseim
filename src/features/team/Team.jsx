import React, { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { Users, UserPlus, Mail, Shield, User, MoreVertical, Briefcase, Star, Phone } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { db } from '../../services/firebase';
import { doc, onSnapshot, updateDoc, setDoc, collection, query } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';

export default function Team() {
    const { currentUser } = useAuth();
    const [members, setMembers] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('employee');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        const teamRef = doc(db, 'users', currentUser.uid, 'settings', 'team');
        const unsub = onSnapshot(teamRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setMembers(data.members || []);
            } else {
                const initialTeam = {
                    members: [{
                        id: currentUser.uid,
                        email: currentUser.email,
                        name: currentUser.displayName || 'Tulajdonos',
                        role: 'admin',
                        status: 'active',
                        joinedAt: new Date().toISOString()
                    }]
                };
                setDoc(teamRef, initialTeam);
                setMembers(initialTeam.members);
            }
            setLoading(false);
        });

        return () => unsub();
    }, [currentUser]);

    const handleInvite = async () => {
        if (!inviteEmail) return;

        const newMember = {
            id: Math.random().toString(36).substr(2, 9),
            email: inviteEmail,
            role: inviteRole,
            status: 'invited',
            invitedAt: new Date().toISOString()
        };

        // Email küldése EmailJS-szel
        const templateParams = {
            to_email: inviteEmail,
            email: inviteEmail, // Backup mezőnév
            from_name: currentUser.displayName || 'Vállalkozó',
            role: inviteRole === 'admin' ? 'Admin' : 'Alkalmazott',
            app_url: import.meta.env.VITE_APP_URL || window.location.origin
        };

        try {
            const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
            const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
            const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

            console.log('--- EmailJS Küldés Részletei ---');
            console.log('Címzett:', inviteEmail);
            console.log('Service ID:', serviceId);
            console.log('Template ID:', templateId);
            console.log('Public Key:', publicKey ? 'Rendben (vágva...)' : 'HIÁNYZIK');

            if (serviceId && templateId && publicKey) {
                emailjs.init(publicKey);
                const res = await emailjs.send(serviceId, templateId, templateParams);
                console.log('EmailJS sikeres válasz:', res);
            } else {
                console.error('EmailJS adatok hiányoznak!', { serviceId, templateId, publicKey });
                throw new Error('Konfigurációs hiba: Hiányzó EmailJS kulcsok a .env fájlból.');
            }

            const teamRef = doc(db, 'users', currentUser.uid, 'settings', 'team');
            await updateDoc(teamRef, {
                members: [...members, newMember]
            });

            setInviteEmail('');
            setShowAddModal(false);
            alert('Meghívó elküldve! Az új tag az email címével fog tudni belépni.');
        } catch (err) {
            console.error('Email küldési hiba részletei:', err);
            const errorMsg = err?.text || err?.message || 'Ismeretlen hiba';
            alert(`Hiba történt a meghívó kiküldésekor: ${errorMsg}`);
        }
    };

    const handleUpdateMember = async () => {
        if (!editingMember) return;
        const teamRef = doc(db, 'users', currentUser.uid, 'settings', 'team');
        const updatedMembers = members.map(m =>
            m.id === editingMember.id ? editingMember : m
        );
        await updateDoc(teamRef, { members: updatedMembers });
        setShowEditModal(false);
        setEditingMember(null);
    };

    const handleDeleteMember = async (id) => {
        if (!window.confirm('Biztosan törölni akarod ezt a csapattagot?')) return;
        const teamRef = doc(db, 'users', currentUser.uid, 'settings', 'team');
        const updatedMembers = members.filter(m => m.id !== id);
        await updateDoc(teamRef, { members: updatedMembers });
        setShowEditModal(false);
        setEditingMember(null);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Betöltés...</div>;

    return (
        <div className="view-container">
            <header className="mb-6 flex justify-between items-center gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="text-primary-600 shrink-0" /> Csapat
                    </h1>
                    <p className="text-gray-500 text-sm truncate">Alkalmazottak kezelése</p>
                </div>
                <Button
                    onClick={() => setShowAddModal(true)}
                    className="shrink-0 whitespace-nowrap shadow-md shadow-primary-100"
                    size="sm"
                >
                    <UserPlus size={18} className="mr-2" /> Új tag
                </Button>
            </header>

            <div className="grid gap-3">
                {members.map((member) => (
                    <Card key={member.id} className="flex items-center justify-between p-3 group hover:border-primary-200 transition-colors bg-white shadow-sm border border-gray-100">
                        <div className="flex gap-3 items-center min-w-0">
                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors shrink-0">
                                <User size={20} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-gray-900 text-sm truncate">{member.name || member.email}</h3>
                                    <Badge className={`${member.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'} text-[10px] px-1.5 py-0`}>
                                        {member.role === 'admin' ? 'Adm' : 'Alk'}
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-gray-500 flex items-center gap-1 truncate">
                                    <Mail size={10} className="shrink-0" /> {member.email}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {member.phone && (
                                <a
                                    href={`tel:${member.phone}`}
                                    className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Hívás"
                                >
                                    <Phone size={16} />
                                </a>
                            )}
                            <a
                                href={`mailto:${member.email}`}
                                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                                title="Email"
                            >
                                <Mail size={16} />
                            </a>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="p-1 h-8 w-8 text-gray-400"
                                onClick={() => {
                                    setEditingMember({ ...member });
                                    setShowEditModal(true);
                                }}
                            >
                                <MoreVertical size={18} />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Invite Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Új csapattag meghívása</h2>
                        <div className="space-y-4">
                            <Input
                                label="Email cím"
                                placeholder="alkalmazott@email.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                            />
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Szerepkör</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setInviteRole('employee')}
                                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${inviteRole === 'employee' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-gray-50 border-gray-100 text-gray-500'}`}
                                    >
                                        Alkalmazott
                                    </button>
                                    <button
                                        onClick={() => setInviteRole('admin')}
                                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${inviteRole === 'admin' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-100 text-gray-500'}`}
                                    >
                                        Admin
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-8">
                            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Mégse</Button>
                            <Button onClick={handleInvite} disabled={!inviteEmail}>Meghívó küldése</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingMember && (
                <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Tag szerkesztése</h2>
                            <Button variant="ghost" size="sm" className="text-red-500 font-bold" onClick={() => handleDeleteMember(editingMember.id)}>Törlés</Button>
                        </div>
                        <div className="space-y-4">
                            <Input
                                label="Név"
                                placeholder="Alkalmazott neve"
                                value={editingMember.name || ''}
                                onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                            />
                            <Input
                                label="Telefonszám"
                                placeholder="+36 30 123 4567"
                                value={editingMember.phone || ''}
                                onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                            />
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Szerepkör</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setEditingMember({ ...editingMember, role: 'employee' })}
                                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${editingMember.role === 'employee' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-gray-50 border-gray-100 text-gray-500'}`}
                                    >
                                        Alkalmazott
                                    </button>
                                    <button
                                        onClick={() => setEditingMember({ ...editingMember, role: 'admin' })}
                                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${editingMember.role === 'admin' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-100 text-gray-500'}`}
                                    >
                                        Admin
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-8">
                            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Mégse</Button>
                            <Button onClick={handleUpdateMember}>Mentés</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
