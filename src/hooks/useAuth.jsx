import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Platform detection
        const isNative = window.Capacitor?.isNative;

        let unsubscribe;

        const setupAuth = async () => {
            if (isNative) {
                // Native Auth Listener
                try {
                    // Initialize or check current user from native layer
                    const result = await import('@capacitor-firebase/authentication').then(m => m.FirebaseAuthentication.getCurrentUser());
                    if (result.user) {
                        setCurrentUser(result.user);
                    }

                    // Listen for changes
                    await import('@capacitor-firebase/authentication').then(m => {
                        m.FirebaseAuthentication.addListener('authStateChange', (change) => {
                            setCurrentUser(change.user);
                            setLoading(false);
                        });
                    });
                } catch (err) {
                    console.error("Native auth setup failed:", err);
                    // Fallback to web auth if native fails
                    unsubscribe = onAuthStateChanged(auth, (user) => {
                        setCurrentUser(user);
                        setLoading(false);
                    });
                }
                setLoading(false);
            } else {
                // Web Auth Listener
                unsubscribe = onAuthStateChanged(auth, (user) => {
                    setCurrentUser(user);
                    setLoading(false);
                });
            }
        };

        setupAuth();

        return () => {
            if (unsubscribe) unsubscribe();
            // Native listeners are persistent or require removeListener which is complex here, 
            // but for a singleton Provider it's acceptable.
            import('@capacitor-firebase/authentication').then(m => m.FirebaseAuthentication.removeAllListeners());
        };
    }, []);

    const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
    const register = (email, password) => createUserWithEmailAndPassword(auth, email, password);
    const logout = () => signOut(auth);

    const value = {
        currentUser,
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
