import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
// ... imports

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Enable persistence
enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a a time.
        // ...
        console.warn("Firestore persistence failed-precondition", err);
    } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        // ...
        console.warn("Firestore persistence unimplemented", err);
    }
});

export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');

export default app;
