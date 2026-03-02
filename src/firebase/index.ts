'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  indexedDBLocalPersistence,
  Auth, 
  GoogleAuthProvider, 
  signInWithCredential 
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { firebaseConfig } from './config';

let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

// Check if we're in a Capacitor environment (mobile)
export const isCapacitorNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

// Check if we're running in a WebView (Capacitor WebView)
export const isWebView = typeof window !== 'undefined' && (
  // @ts-ignore
  window.Capacitor !== undefined || 
  // @ts-ignore
  window.android !== undefined ||
  // @ts-ignore
  window.webkit !== undefined
);

// Singleton initialization pattern
if (getApps().length === 0) {
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  firestore = getFirestore(firebaseApp);
  
  // Set persistence for both web and WebView environments
  // We prefer indexedDB for WebView stability
  const persistence = isWebView ? indexedDBLocalPersistence : browserLocalPersistence;
  setPersistence(auth, persistence).catch(console.error);
} else {
  firebaseApp = getApp();
  auth = getAuth(firebaseApp);
  firestore = getFirestore(firebaseApp);
}

export function initializeFirebase() {
  return { firebaseApp, auth, firestore };
}

/**
 * Google Login handler that works on both web and native platforms
 * On mobile (Capacitor), uses the native Google sign-in bridge
 */
export async function signInWithGoogle(): Promise<{ user: import('firebase/auth').User | null; error: Error | null }> {
  try {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle();
      
      if (result.credential?.idToken) {
        const credential = GoogleAuthProvider.credential(result.credential.idToken);
        const userCredential = await signInWithCredential(auth, credential);
        return { user: userCredential.user, error: null };
      }
      
      return { user: null, error: new Error('No credential returned from native sign-in') };
    } else {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const { signInWithPopup } = await import('firebase/auth');
      const result = await signInWithPopup(auth, provider);
      return { user: result.user, error: null };
    }
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    return { user: null, error: error as Error };
  }
}

export { firebaseApp, auth, firestore };

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
