import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAFZmehglvpwSuwmTKTJjAW2lrOoo_X4Gc',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'festonaplo-2026.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'festonaplo-2026',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'festonaplo-2026.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1082153493197',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1082153493197:web:daaeb000effbd9ba5fff84',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-03BLH5N37R'
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');

export default app;
