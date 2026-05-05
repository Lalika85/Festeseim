import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebase';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    onSnapshot, 
    query, 
    orderBy,
    serverTimestamp,
    getDoc,
    setDoc
} from 'firebase/firestore';
import { useAuth } from './useAuth';
import { APP_URL } from '../constants/urls';
import { localDB } from '../services/localDB';

export const PUBLIC_BASE_URL = APP_URL;

export const useQuotes = () => {
    const { currentUser, ownerUid, isEmployee } = useAuth();
    const [quotes, setQuotes] = useState([]);
    const [branding, setBranding] = useState({ logoUrl: null, primaryColor: '#2563eb' });
    const [companies, setCompanies] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);

    // Initial settings fetch (LocalDB)
    useEffect(() => {
        if (!ownerUid) return;

        const unsubSettings = localDB.subscribe(ownerUid, 'settings', (data) => {
            const b = data?.branding || {};
            setBranding({
                ...b,
                logoUrl: b.logoUrl || null,
                companyName: b.companyName || "",
                companyAddress: b.companyAddress || "",
                taxNumber: b.taxNumber || "",
                companyPhone: b.companyPhone || "",
                companyEmail: b.companyEmail || "",
                bankAccount: b.bankAccount || "",
                primaryColor: b.primaryColor || '#2563eb'
            });
        });

        return () => unsubSettings();
    }, [ownerUid]);

    useEffect(() => {
        if (!ownerUid) return;
        if (isEmployee) {
            setQuotes([]);
            setCompanies([]);
            setLoading(false);
            return;
        }

        // Quotes Listener (LocalDB)
        const unsubQuotes = localDB.subscribe(ownerUid, 'quotes', (data) => {
            const list = Object.values(data || {}).sort((a, b) => 
                new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
            );
            setQuotes(list);
            setLoading(false);
        });

        // Companies Listener (LocalDB)
        const unsubCompanies = localDB.subscribe(ownerUid, 'companies', (data) => {
            const list = Object.values(data || {});
            setCompanies(list);
        });

        // Templates Listener (LocalDB)
        const unsubTemplates = localDB.subscribe(ownerUid, 'quoteTemplates', (data) => {
            const list = Object.values(data || {}).sort((a, b) => 
                (a.description || "").localeCompare(b.description || "")
            );
            setTemplates(list);
        });

        return () => {
            unsubQuotes();
            unsubCompanies();
            unsubTemplates();
        };
    }, [ownerUid, isEmployee]);

    const saveQuote = useCallback(async (quoteData) => {
        if (!ownerUid || isEmployee) return;
        
        const id = quoteData.id || Date.now().toString();
        const finalData = {
            ...quoteData,
            id,
            updatedAt: new Date().toISOString(),
            createdAt: quoteData.createdAt || new Date().toISOString(),
            status: quoteData.status || 'draft'
        };

        localDB.set(ownerUid, 'quotes', id, finalData);
        return id;
    }, [ownerUid, isEmployee]);

    const deleteQuote = useCallback(async (id) => {
        if (!ownerUid || isEmployee) return;
        localDB.remove(ownerUid, 'quotes', id);
    }, [ownerUid, isEmployee]);

    const updateStatus = useCallback(async (id, status) => {
        if (!ownerUid || isEmployee) return;
        const current = localDB.get(ownerUid, 'quotes', id);
        if (current) {
            localDB.set(ownerUid, 'quotes', id, { 
                ...current,
                status, 
                updatedAt: new Date().toISOString() 
            });
        }
    }, [ownerUid, isEmployee]);

    const saveCompany = useCallback(async (companyData) => {
        if (!ownerUid || isEmployee) return;
        
        const id = companyData.id || Date.now().toString();
        const finalData = {
            ...companyData,
            id,
            updatedAt: new Date().toISOString()
        };

        // Handle default company logic
        if (finalData.isDefault) {
            const allCompanies = localDB.getAll(ownerUid, 'companies');
            Object.values(allCompanies).forEach(c => {
                if (c.id !== id && c.isDefault) {
                    localDB.set(ownerUid, 'companies', c.id, { ...c, isDefault: false });
                }
            });
        }

        localDB.set(ownerUid, 'companies', id, finalData);
        return id;
    }, [ownerUid, isEmployee]);

    const deleteCompany = useCallback(async (id) => {
        if (!ownerUid || isEmployee) return;
        localDB.remove(ownerUid, 'companies', id);
    }, [ownerUid, isEmployee]);

    const saveTemplate = useCallback(async (templateData) => {
        if (!ownerUid || isEmployee) return;
        const id = templateData.id || Date.now().toString();
        localDB.set(ownerUid, 'quoteTemplates', id, { ...templateData, id });
    }, [ownerUid, isEmployee]);

    const deleteTemplate = useCallback(async (id) => {
        if (!ownerUid || isEmployee) return;
        localDB.remove(ownerUid, 'quoteTemplates', id);
    }, [ownerUid, isEmployee]);

    const updateBranding = useCallback(async (newBranding) => {
        if (!ownerUid || isEmployee) return;
        const currentSettings = localDB.get(ownerUid, 'settings', 'branding') || {};
        localDB.set(ownerUid, 'settings', 'branding', {
            ...currentSettings,
            ...newBranding,
            updatedAt: new Date().toISOString()
        });
    }, [ownerUid, isEmployee]);


    const getPublicQuote = useCallback(async (userId, quoteId) => {
        // If the requested user is the current user, check localDB first
        if (ownerUid === userId) {
            const localQuote = localDB.get(ownerUid, 'quotes', quoteId);
            if (localQuote) {
                let resolvedCompany = null;
                if (localQuote.sellerId) {
                    resolvedCompany = localDB.get(ownerUid, 'companies', localQuote.sellerId);
                }

                const brandingData = localDB.get(ownerUid, 'settings', 'branding') || {};
                
                return {
                    quote: localQuote,
                    branding: {
                        logoUrl: resolvedCompany?.logoUrl || brandingData.logoUrl || null,
                        companyName: resolvedCompany?.name || brandingData.companyName || "Saját Vállalkozás",
                        companyAddress: resolvedCompany?.address || brandingData.companyAddress || "",
                        taxNumber: resolvedCompany?.taxNumber || resolvedCompany?.tax || brandingData.taxNumber || "",
                        companyPhone: resolvedCompany?.phone || brandingData.companyPhone || "",
                        companyEmail: resolvedCompany?.email || brandingData.companyEmail || "",
                        bankAccount: resolvedCompany?.bankAccount || resolvedCompany?.bank || brandingData.bankAccount || "",
                        primaryColor: resolvedCompany?.primaryColor || brandingData.primaryColor || '#2563eb'
                    }
                };
            }
        }

        // Fallback to Firestore (for truly public links or if not found locally)
        try {
            const quoteRef = doc(db, 'users', userId, 'quotes', quoteId);
            const quoteSnap = await getDoc(quoteRef);
            
            if (quoteSnap.exists()) {
                const quote = { id: quoteSnap.id, ...quoteSnap.data() };
                
                let resolvedCompany = null;
                if (quote.sellerId) {
                    const compRef = doc(db, 'users', userId, 'companies', quote.sellerId);
                    const compSnap = await getDoc(compRef);
                    if (compSnap.exists()) resolvedCompany = compSnap.data();
                }

                const brandRef = doc(db, 'users', userId, 'settings', 'branding');
                const brandSnap = await getDoc(brandRef);
                const brandingData = brandSnap.exists() ? brandSnap.data() : {};
                
                return {
                    quote,
                    branding: {
                        logoUrl: resolvedCompany?.logoUrl || brandingData.logoUrl || null,
                        companyName: resolvedCompany?.name || brandingData.companyName || "Saját Vállalkozás",
                        companyAddress: resolvedCompany?.address || brandingData.companyAddress || "",
                        taxNumber: resolvedCompany?.taxNumber || resolvedCompany?.tax || brandingData.taxNumber || "",
                        companyPhone: resolvedCompany?.phone || brandingData.companyPhone || "",
                        companyEmail: resolvedCompany?.email || brandingData.companyEmail || "",
                        bankAccount: resolvedCompany?.bankAccount || resolvedCompany?.bank || brandingData.bankAccount || "",
                        primaryColor: resolvedCompany?.primaryColor || brandingData.primaryColor || '#2563eb'
                    }
                };
            }
        } catch (err) {
            console.error("Error fetching public quote:", err);
        }
        return null;
    }, [ownerUid]);

    return {
        quotes,
        companies,
        templates,
        branding,
        loading,
        saveQuote,
        deleteQuote,
        saveCompany,
        deleteCompany,
        saveTemplate,
        deleteTemplate,
        updateStatus,
        updateBranding,
        getPublicQuote
    };
};
