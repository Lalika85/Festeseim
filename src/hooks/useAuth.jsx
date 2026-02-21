import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, updateDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [role, setRole] = useState('admin');
    const [ownerUid, setOwnerUid] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Platform detection
        const isNative = window.Capacitor?.isNative;

        let unsubscribe;

        const fetchRoleInfo = async (uid, email) => {
            try {
                const profileRef = doc(db, 'users', uid, 'settings', 'profile');
                const snap = await getDoc(profileRef);

                if (snap.exists() && snap.data().role) {
                    const data = snap.data();
                    setRole(data.role);
                    setOwnerUid(data.ownerUid || uid);
                } else if (email) {
                    // Try to discover invite if no role is set or profile is new
                    const inviteRef = doc(db, 'invites', email.toLowerCase());
                    const inviteSnap = await getDoc(inviteRef);

                    if (inviteSnap.exists()) {
                        const inviteData = inviteSnap.data();
                        const newProfile = {
                            email: email,
                            displayName: inviteData.name || '',
                            role: inviteData.role || 'employee',
                            ownerUid: inviteData.ownerUid,
                            ownerName: inviteData.ownerName || '',
                            joinedAt: new Date().toISOString()
                        };
                        // Auto-provision profile
                        await setDoc(profileRef, newProfile);

                        // Notify Admin
                        await addDoc(collection(db, 'users', inviteData.ownerUid, 'notifications'), {
                            type: 'new_member',
                            title: 'Új csapattag csatlakozott!',
                            body: `${newProfile.displayName || email} elfogadta a meghívást.`,
                            createdAt: new Date().toISOString(),
                            read: false
                        });

                        // Update team member status in admin's settings/team
                        const teamRef = doc(db, 'users', inviteData.ownerUid, 'settings', 'team');
                        const teamSnap = await getDoc(teamRef);
                        if (teamSnap.exists()) {
                            const teamData = teamSnap.data();
                            const updatedMembers = teamData.members.map(m =>
                                m.email.toLowerCase() === email.toLowerCase()
                                    ? { ...m, name: newProfile.displayName, status: 'active', joinedAt: newProfile.joinedAt, id: uid }
                                    : m
                            );
                            await updateDoc(teamRef, { members: updatedMembers });
                        }

                        setRole(newProfile.role);
                        setOwnerUid(newProfile.ownerUid);
                    } else {
                        // Default to admin if no invite found
                        setRole('admin');
                        setOwnerUid(uid);
                    }
                } else {
                    setRole('admin');
                    setOwnerUid(uid);
                }
            } catch (err) {
                console.error("Error fetching role info:", err);
                setRole('admin');
                setOwnerUid(uid);
            }
        };

        const setupAuth = async () => {
            if (isNative) {
                // Native Auth Listener
                try {
                    const result = await import('@capacitor-firebase/authentication').then(m => m.FirebaseAuthentication.getCurrentUser());
                    if (result.user) {
                        setCurrentUser(result.user);
                        await fetchRoleInfo(result.user.uid, result.user.email);
                    }

                    await import('@capacitor-firebase/authentication').then(m => {
                        m.FirebaseAuthentication.addListener('authStateChange', async (change) => {
                            setCurrentUser(change.user);
                            if (change.user) {
                                await fetchRoleInfo(change.user.uid, change.user.email);
                            } else {
                                setRole('admin');
                                setOwnerUid(null);
                            }
                            setLoading(false);
                        });
                    });
                } catch (err) {
                    console.error("Native auth setup failed:", err);
                    unsubscribe = onAuthStateChanged(auth, async (user) => {
                        setCurrentUser(user);
                        if (user) await fetchRoleInfo(user.uid, user.email);
                        setLoading(false);
                    });
                }
                setLoading(false);
            } else {
                // Web Auth Listener
                unsubscribe = onAuthStateChanged(auth, async (user) => {
                    setCurrentUser(user);
                    if (user) {
                        await fetchRoleInfo(user.uid, user.email);
                    } else {
                        setRole('admin');
                        setOwnerUid(null);
                    }
                    setLoading(false);
                });
            }
        };

        setupAuth();

        return () => {
            if (unsubscribe) unsubscribe();
            import('@capacitor-firebase/authentication').then(m => m.FirebaseAuthentication.removeAllListeners());
        };
    }, []);

    const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
    const register = (email, password) => createUserWithEmailAndPassword(auth, email, password);
    const logout = () => signOut(auth);

    const value = {
        currentUser,
        role,
        ownerUid,
        isAdmin: role === 'admin',
        isEmployee: role === 'employee',
        login,
        register,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
