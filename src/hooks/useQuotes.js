import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    setDoc,
    getDoc
} from 'firebase/firestore';
import { useAuth } from './useAuth';

export const PUBLIC_BASE_URL = 'https://festonaplo-2026.web.app';

export const useQuotes = () => {
    const { currentUser, ownerUid, isEmployee } = useAuth();
    const [quotes, setQuotes] = useState([]);
    const [branding, setBranding] = useState({ logoUrl: null, primaryColor: '#2563eb' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser || !ownerUid) return;

        // Employees don't get to see or load any quotes
        if (isEmployee) {
            setQuotes([]);
            setLoading(false);
            return;
        }

        const quotesRef = collection(db, 'users', ownerUid, 'quotes');
        const brandingRef = doc(db, 'users', ownerUid, 'settings', 'branding');

        // Listen for quotes
        const q = query(quotesRef, orderBy('createdAt', 'desc'));
        const unsubscribeQuotes = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setQuotes(list);
            setLoading(false);
        });

        // Listen for branding settings
        const unsubscribeBranding = onSnapshot(brandingRef, (docSnap) => {
            if (docSnap.exists()) {
                setBranding(docSnap.data());
            }
        });

        return () => {
            unsubscribeQuotes();
            unsubscribeBranding();
        };
    }, [currentUser, ownerUid, isEmployee]);

    const saveQuote = async (quoteData) => {
        if (!currentUser || !ownerUid || isEmployee) return;
        const data = {
            ...quoteData,
            updatedAt: new Date().toISOString(),
            createdAt: quoteData.createdAt || new Date().toISOString(),
            status: quoteData.status || 'draft'
        };

        const quotesRef = collection(db, 'users', ownerUid, 'quotes');
        if (quoteData.id) {
            const docRef = doc(db, 'users', ownerUid, 'quotes', quoteData.id);
            await updateDoc(docRef, data);
            return quoteData.id;
        } else {
            const docRef = await addDoc(quotesRef, data);
            return docRef.id;
        }
    };

    const deleteQuote = async (id) => {
        if (!currentUser || !ownerUid || isEmployee) return;
        await deleteDoc(doc(db, 'users', ownerUid, 'quotes', id));
    };

    const updateStatus = async (id, status) => {
        if (!currentUser || !ownerUid || isEmployee) return;
        const docRef = doc(db, 'users', ownerUid, 'quotes', id);
        await updateDoc(docRef, { status, updatedAt: new Date().toISOString() });
    };

    const updateBranding = async (newBranding) => {
        if (!currentUser || !ownerUid || isEmployee) return;
        const brandingRef = doc(db, 'users', ownerUid, 'settings', 'branding');
        await setDoc(brandingRef, newBranding, { merge: true });
    };

    const getPublicQuote = async (userId, quoteId) => {
        // This helper is for the public view to fetch a specific quote
        const docRef = doc(db, 'users', userId, 'quotes', quoteId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            // Also fetch branding for this user
            const bRef = doc(db, 'users', userId, 'settings', 'branding');
            const bSnap = await getDoc(bRef);
            return {
                quote: { id: snap.id, ...snap.data() },
                branding: bSnap.exists() ? bSnap.data() : { primaryColor: '#2563eb' }
            };
        }
        return null;
    };

    return {
        quotes,
        branding,
        loading,
        saveQuote,
        deleteQuote,
        updateStatus,
        updateBranding,
        getPublicQuote
    };
};
