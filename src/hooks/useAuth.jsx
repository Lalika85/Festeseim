import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { loadUserSettings } from '../services/firestore';
import { Capacitor } from '@capacitor/core';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [ownerUid, setOwnerUid] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshProfile = async (uid) => {};

    const handleUser = async (user) => {
        setCurrentUser(user);
        setOwnerUid(user ? user.uid : null);
        setLoading(false);
    };

    useEffect(() => {
        // Platform detection
        const isNative = Capacitor.isNativePlatform();

        let unsubscribe;

        const setupAuth = async () => {

            if (isNative) {
                // Native Auth Listener
                try {
                    const authModule = await import('@capacitor-firebase/authentication');
                    const result = await authModule.FirebaseAuthentication.getCurrentUser();

                    await handleUser(result.user);

                    await authModule.FirebaseAuthentication.addListener('authStateChange', async (change) => {
                        // Prevent race condition if we are currently manually signing out
                        if (window._isSigningOut) return;
                        await handleUser(change.user);
                    });
                } catch (err) {
                    console.error("Native auth setup failed:", err);
                    unsubscribe = onAuthStateChanged(auth, handleUser);
                }
            } else {
                // Web Auth Listener
                unsubscribe = onAuthStateChanged(auth, async (user) => {
                    await handleUser(user);
                    if (user) refreshProfile(user.uid);
                });
            }
        };

        setupAuth();

        return () => {
            if (unsubscribe) unsubscribe();
            import('@capacitor-firebase/authentication').then(m => m.FirebaseAuthentication.removeAllListeners()).catch(() => { });
        };
    }, []);

    const login = async (email, password) => {
        window._isSigningOut = false; // Just in case
        if (Capacitor.isNativePlatform()) {
            const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
            const result = await FirebaseAuthentication.signInWithEmailAndPassword({ email, password });
            if (result.user) await handleUser(result.user);
            return result.user;
        }
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (userCredential.user) await handleUser(userCredential.user);
        return userCredential.user;
    };

    const register = async (email, password) => {
        window._isSigningOut = false; // Just in case
        if (Capacitor.isNativePlatform()) {
            const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
            const result = await FirebaseAuthentication.createUserWithEmailAndPassword({ email, password });
            if (result.user) await handleUser(result.user);
            return result.user;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (userCredential.user) await handleUser(userCredential.user);
        return userCredential.user;
    };

    const resetPassword = async (email) => {
        if (Capacitor.isNativePlatform()) {
            const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
            await FirebaseAuthentication.sendPasswordResetEmail({ email });
            return;
        }
        return sendPasswordResetEmail(auth, email);
    };
    const logout = async () => {
        try {
            window._isSigningOut = true;
            if (window.Capacitor?.isNative) {
                const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
                await FirebaseAuthentication.signOut();
            }
            await signOut(auth);
            await handleUser(null);
        } catch (err) {
            console.error("Logout failed:", err);
            await signOut(auth).catch(() => {});
            await handleUser(null);
        } finally {
            window._isSigningOut = false;
        }
    };

    const value = {
        currentUser,
        role: currentUser ? 'admin' : null,
        ownerUid,
        isAdmin: !!currentUser,
        isEmployee: false,
        login,
        register,
        resetPassword,
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
