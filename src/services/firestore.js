import { db } from "./firebase";
import { 
    doc, 
    setDoc, 
    deleteDoc, 
    collection, 
    getDocs, 
    getDoc,
    query,
    orderBy
} from "firebase/firestore";

export const syncItem = async (uid, collName, item) => {
    if (!uid || !item.id) return;
    const docRef = doc(db, 'users', uid, collName, String(item.id));
    await setDoc(docRef, item, { merge: true });
};

export const removeItem = async (uid, collName, id) => {
    if (!uid || !id) return;
    const docRef = doc(db, 'users', uid, collName, String(id));
    await deleteDoc(docRef);
};

export const syncSettings = async (uid, docName, data) => {
    if (!uid) return;
    const docRef = doc(db, 'users', uid, 'settings', docName);
    await setDoc(docRef, data, { merge: true });
};

export const loadUserCollection = async (uid, collName, sortBy = 'createdAt') => {
    if (!uid) return [];
    try {
        const colRef = collection(db, 'users', uid, collName);
        const q = query(colRef, orderBy(sortBy, 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
        console.error(`Error loading collection ${collName}:`, err);
        return [];
    }
};

export const loadUserSettings = async (uid, docName) => {
    if (!uid) return null;
    try {
        const docRef = doc(db, 'users', uid, 'settings', docName);
        const snapshot = await getDoc(docRef);
        return snapshot.exists() ? snapshot.data() : null;
    } catch (err) {
        console.error(`Error loading settings ${docName}:`, err);
        return null;
    }
};
