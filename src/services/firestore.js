import { db } from "./firebase";
import {
    doc,
    collection,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    orderBy
} from "firebase/firestore";

export const getUserRef = (uid, collName) => collection(db, 'users', uid, collName);
export const getSettingsRef = (uid, docName) => doc(db, 'users', uid, 'settings', docName);

export const syncItem = async (uid, collName, item) => {
    if (!uid || !item.id) return;
    await setDoc(doc(db, 'users', uid, collName, String(item.id)), item);
};

export const removeItem = async (uid, collName, id) => {
    if (!uid || !id) return;
    await deleteDoc(doc(db, 'users', uid, collName, String(id)));
};

export const syncSettings = async (uid, docName, data) => {
    if (!uid) return;
    await setDoc(getSettingsRef(uid, docName), data);
};

export const loadUserCollection = async (uid, collName, sortBy = 'id') => {
    const q = query(getUserRef(uid, collName), orderBy(sortBy, 'desc'));
    const snap = await getDocs(q);
    const items = [];
    snap.forEach(doc => items.push(doc.data()));
    return items;
};

export const loadUserSettings = async (uid, docName) => {
    const docSnap = await getDoc(getSettingsRef(uid, docName));
    return docSnap.exists() ? docSnap.data() : null;
};
