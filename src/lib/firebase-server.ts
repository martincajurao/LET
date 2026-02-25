import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDQmt8o2YeCrB3yIoxjVDosJA7EJUttWTU",
  authDomain: "letpractice.firebaseapp.com",
  projectId: "letpractice",
  storageBucket: "letpractice.firebasestorage.app",
  messagingSenderId: "322612236786",
  appId: "1:322612236786:web:922392c848421068621b6b"
};

// Server-side Firebase initialization
let firebaseApp: FirebaseApp;
let firestore: Firestore;
let storage: FirebaseStorage;

if (getApps().length === 0) {
  firebaseApp = initializeApp(firebaseConfig);
  firestore = getFirestore(firebaseApp);
  storage = getStorage(firebaseApp);
} else {
  firebaseApp = getApp();
  firestore = getFirestore(firebaseApp);
  storage = getStorage(firebaseApp);
}

export { firebaseApp, firestore, storage };
