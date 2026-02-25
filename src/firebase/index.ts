
'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let storage: FirebaseStorage;

// Singleton initialization pattern
if (getApps().length === 0) {
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  firestore = getFirestore(firebaseApp);
  storage = getStorage(firebaseApp);
  setPersistence(auth, browserLocalPersistence).catch(console.error);
} else {
  firebaseApp = getApp();
  auth = getAuth(firebaseApp);
  firestore = getFirestore(firebaseApp);
  storage = getStorage(firebaseApp);
}

export function initializeFirebase() {
  return { firebaseApp, auth, firestore, storage };
}

export { firebaseApp, auth, firestore, storage };

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
