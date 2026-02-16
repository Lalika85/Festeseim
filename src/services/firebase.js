import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "vallalkozoi-app.firebaseapp.com",
    projectId: "vallalkozoi-app",
    storageBucket: "vallalkozoi-app.firebasestorage.app",
    messagingSenderId: "636447035549",
    appId: "1:636447035549:web:86efa1a0ba9e86bb488474",
    measurementId: "G-KLG9X8ZVP4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');

export default app;
