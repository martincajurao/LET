
'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut,
  signInAnonymously,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { auth, firestore } from '../index';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { nativeAuth, NativeUser } from '@/lib/native-auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';
import { Capacitor } from '@capacitor/core';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  majorship?: string;
  onboardingComplete?: boolean;
  credits?: number;
  xp?: number;
  level?: number;
  lastRewardedRank?: number;
  isPro?: boolean;
  dailyAdCount?: number;
  lastAdXpTimestamp?: number;
  lastQuickFireTimestamp?: number;
  dailyAiUsage?: number;
  dailyQuestionsAnswered?: number;
  dailyTestsFinished?: number;
  dailyCreditEarned?: number;
  streakCount?: number;
  lastActiveDate?: any;
  lastTaskReset?: any;
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;
  referralCreditsEarned?: number;
  referralTier?: string;
  taskLoginClaimed?: boolean;
  taskQuestionsClaimed?: boolean;
  taskMockClaimed?: boolean;
  taskMistakesClaimed?: boolean;
  mistakesReviewed?: number;
  lastExplanationRequest?: number;
  dailyEventEntries?: number;
  userTier?: string;
  totalSessionTime?: number;
  averageQuestionTime?: number;
  deviceFingerprints?: string[];
  lastAbuseWarning?: any;
  qualityScore?: number;
  lastQualityUpdate?: any;
  unlockedTracks?: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  loginAnonymously: () => Promise<void>;
  bypassLogin: () => void;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  loginWithFacebook: async () => {},
  loginAnonymously: async () => {},
  bypassLogin: () => {},
  logout: async () => {},
  updateProfile: async () => {},
  addXp: async () => {},
  refreshUser: async () => {},
});

function isFirestoreSentinel(val: any): boolean {
  if (!val || typeof val !== 'object') return false;
  return (
    val.constructor?.name === 'FieldValue' || 
    (typeof val._methodName === 'string') ||
    (typeof val.type === 'string' && ['increment', 'arrayUnion', 'arrayRemove', 'serverTimestamp', 'delete'].includes(val.type)) ||
    ('_type' in val && val._type === 'FieldValue')
  );
}

function scrubUserData(data: any, prevUser: UserProfile | null): UserProfile {
  const scrubbed: any = { ...data };
  
  const numFields = [
    'credits', 'xp', 'streakCount', 'dailyAdCount', 
    'dailyQuestionsAnswered', 'dailyTestsFinished', 
    'dailyCreditEarned', 'referralCount', 'referralCreditsEarned', 
    'mistakesReviewed', 'dailyAiUsage'
  ];

  // Distinguish between event dates (defaults to now) and cooldown dates (defaults to zero)
  const eventDateFields = ['lastActiveDate', 'lastTaskReset', 'lastQualityUpdate'];
  const cooldownDateFields = ['lastAdXpTimestamp', 'lastQuickFireTimestamp', 'lastExplanationRequest'];

  numFields.forEach(key => {
    if (scrubbed[key] === undefined || scrubbed[key] === null || isFirestoreSentinel(scrubbed[key])) {
      scrubbed[key] = (prevUser as any)?.[key] ?? 0;
    }
  });

  eventDateFields.forEach(key => {
    if (scrubbed[key] === undefined || scrubbed[key] === null || isFirestoreSentinel(scrubbed[key])) {
      scrubbed[key] = (prevUser as any)?.[key] ?? Date.now();
    } else if (scrubbed[key] && typeof scrubbed[key] === 'object' && scrubbed[key].toMillis) {
      scrubbed[key] = scrubbed[key].toMillis();
    }
  });

  cooldownDateFields.forEach(key => {
    if (scrubbed[key] === undefined || scrubbed[key] === null || isFirestoreSentinel(scrubbed[key])) {
      scrubbed[key] = (prevUser as any)?.[key] ?? 0; // CRITICAL: Cooldowns default to 0 so they are "ready"
    } else if (scrubbed[key] && typeof scrubbed[key] === 'object' && scrubbed[key].toMillis) {
      scrubbed[key] = scrubbed[key].toMillis();
    }
  });

  for (const key in scrubbed) {
    if (!numFields.includes(key) && !eventDateFields.includes(key) && !cooldownDateFields.includes(key)) {
      if (isFirestoreSentinel(scrubbed[key])) {
        scrubbed[key] = (prevUser as any)?.[key] ?? null;
      }
    }
  }

  return scrubbed as UserProfile;
}

function cleanFirestoreData(data: any): any {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;
  if (isFirestoreData(data)) return data;
  if (Array.isArray(data)) return data.map(cleanFirestoreData);
  
  const cleaned: any = {};
  for (const key in data) {
    const val = cleanFirestoreData(data[key]);
    if (val !== undefined) cleaned[key] = val;
  }
  return cleaned;
}

function isFirestoreData(val: any): boolean {
  return val && typeof val === 'object' && (
    val.constructor?.name === 'FieldValue' ||
    typeof val._methodName === 'string' ||
    (val.type && typeof val.type === 'string')
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<UserProfile | null>(null);
  const isResettingRef = useRef(false);

  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (!auth) return;
    getRedirectResult(auth).catch(console.error);
  }, [auth]);

  useEffect(() => {
    if (!auth) return;
    let unsubscribe: (() => void) | null = null;
    const setupAuthListener = async () => {
      try {
        const handler = await FirebaseAuthentication.addListener('authStateChange', async (event) => {
          if (event.user) {
            const userProfile = await fetchUserProfileFromFirestore(event.user.uid);
            if (userProfile) setUser(userProfile);
            else {
              const newProfile = await createUserProfileInFirestore({ uid: event.user.uid, displayName: event.user.displayName, email: event.user.email, photoURL: event.user.photoUrl });
              setUser(newProfile);
            }
          }
        });
        unsubscribe = () => handler.remove();
      } catch (error) { console.error('[Auth] Native listener failed:', error); }
    };
    setupAuthListener();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [auth, firestore]);

  useEffect(() => {
    if (!auth || !firestore) { setLoading(false); return; }
    let unsubFromProfile: (() => void) | undefined;
    const unsubFromAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubFromProfile) unsubFromProfile();
      if (firebaseUser) {
        setLoading(true);
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        unsubFromProfile = onSnapshot(userDocRef, async (snap) => {
          if (snap.exists()) {
            const scrubbed = scrubUserData(snap.data(), userRef.current);
            setUser({ ...scrubbed, uid: firebaseUser.uid });
          } else {
            const newUserProfile = await createUserProfileInFirestore(firebaseUser);
            setUser(newUserProfile);
          }
          setLoading(false);
        }, async (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'get' }));
          setLoading(false);
        });
      } else { setUser(null); setLoading(false); }
    });
    return () => { unsubFromAuth(); if (unsubFromProfile) unsubFromProfile(); };
  }, [toast, firestore, auth]);

  useEffect(() => {
    if (user?.uid && user.uid !== 'bypass-user' && firestore && !isResettingRef.current) {
      const now = new Date();
      const lastReset = user.lastTaskReset || 0;
      if (lastReset !== 0 && new Date(lastReset).toDateString() !== now.toDateString()) {
        isResettingRef.current = true;
        const userRef = doc(firestore, 'users', user.uid);
        updateDoc(userRef, {
          dailyQuestionsAnswered: 0,
          dailyTestsFinished: 0,
          dailyAiUsage: 0,
          dailyCreditEarned: 0,
          dailyAdCount: 0,
          taskLoginClaimed: false,
          taskQuestionsClaimed: false,
          taskMockClaimed: false,
          taskMistakesClaimed: false,
          lastTaskReset: serverTimestamp()
        }).finally(() => { isResettingRef.current = false; });
      }
    }
  }, [user?.uid, user?.lastTaskReset, firestore]);

  const fetchUserProfileFromFirestore = async (uid: string) => {
    if (!firestore) return null;
    const snap = await getDoc(doc(firestore, 'users', uid));
    return snap.exists() ? snap.data() as UserProfile : null;
  };

  const createUserProfileInFirestore = async (firebaseUser: any) => {
    const newUserProfile: UserProfile = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || 'Educator',
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
      onboardingComplete: false,
      credits: 20, 
      xp: 0,
      lastRewardedRank: 1,
      isPro: false,
      dailyAdCount: 0,
      dailyAiUsage: 0,
      dailyQuestionsAnswered: 0,
      dailyTestsFinished: 0,
      dailyCreditEarned: 0,
      streakCount: 0,
      lastActiveDate: Date.now(),
      lastTaskReset: Date.now(),
      referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      taskLoginClaimed: false,
      taskQuestionsClaimed: false,
      taskMockClaimed: false,
      taskMistakesClaimed: false,
      mistakesReviewed: 0,
      referralCount: 0,
      referralCreditsEarned: 0,
      referralTier: 'Bronze',
      dailyEventEntries: 1,
      unlockedTracks: []
    };
    await setDoc(doc(firestore, 'users', firebaseUser.uid), newUserProfile);
    return newUserProfile;
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await nativeAuth.signInWithGoogle();
        if (result.user) {
          let userProfile = await fetchUserProfileFromFirestore(result.user.uid);
          if (!userProfile) userProfile = await createUserProfileInFirestore(result.user);
          setUser(userProfile);
        }
      } else {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth!, provider);
      }
    } catch (error: any) { console.error('Sign-In Error:', error); }
    finally { setLoading(false); }
  };

  const loginWithFacebook = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const provider = new FacebookAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) { console.error('Facebook Error:', error); }
    finally { setLoading(false); }
  };

  const logout = async () => {
    if (Capacitor.isNativePlatform()) await nativeAuth.signOut();
    if (auth) await signOut(auth);
    setUser(null);
    router.push('/');
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!firestore || !user?.uid) return;
    const cleaned = cleanFirestoreData(data);
    const userDocRef = doc(firestore, 'users', user.uid);
    try { await updateDoc(userDocRef, cleaned); } catch (e) { await setDoc(userDocRef, cleaned, { merge: true }); }
  };

  const refreshUser = async () => {
    if (!firestore || !user?.uid) return;
    const snap = await getDoc(doc(firestore, 'users', user.uid));
    if (snap.exists()) setUser({ ...scrubUserData(snap.data(), user), uid: user.uid });
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, loginWithGoogle, loginWithFacebook, 
      loginAnonymously: async () => { if (auth) await signInAnonymously(auth); }, 
      bypassLogin: () => {}, logout, updateProfile, 
      addXp: async (amt) => { if (user && firestore) await updateDoc(doc(firestore, 'users', user.uid), { xp: increment(amt) }); },
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useUser = () => useContext(AuthContext);
