'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut,
  signInAnonymously,
  signInWithCredential
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { auth, firestore } from '../index';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { nativeAuth } from '@/lib/native-auth';
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
  lastLoginRewardClaimedAt?: number;
  lastQotdClaimedAt?: number;
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
    'mistakesReviewed', 'dailyAiUsage', 'lastLoginRewardClaimedAt',
    'lastQotdClaimedAt'
  ];

  const dateFields = ['lastActiveDate', 'lastTaskReset', 'lastQualityUpdate', 'lastAdXpTimestamp', 'lastQuickFireTimestamp', 'lastExplanationRequest'];

  numFields.forEach(key => {
    if (scrubbed[key] === undefined || scrubbed[key] === null || isFirestoreSentinel(scrubbed[key])) {
      scrubbed[key] = (prevUser as any)?.[key] ?? 0;
    }
  });

  dateFields.forEach(key => {
    if (scrubbed[key] === undefined || scrubbed[key] === null || isFirestoreSentinel(scrubbed[key])) {
      scrubbed[key] = (prevUser as any)?.[key] ?? 0;
    } else if (scrubbed[key] && typeof scrubbed[key] === 'object' && scrubbed[key].toMillis) {
      scrubbed[key] = scrubbed[key].toMillis();
    }
  });

  return scrubbed as UserProfile;
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
    if (!auth || !firestore) return;
    
    let unsubFromProfile: (() => void) | undefined;
    const unsubFromAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubFromProfile) unsubFromProfile();
      
      if (firebaseUser) {
        setLoading(true);
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        unsubFromProfile = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const scrubbed = scrubUserData(snap.data(), userRef.current);
            setUser({ ...scrubbed, uid: firebaseUser.uid });
          } else {
            createUserProfileInFirestore(firebaseUser).then(setUser);
          }
          setLoading(false);
        }, (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'get' }));
          setLoading(false);
        });
      } else {
        // Hold user state if it's a bypass user OR if we might be in a route transition
        if (!userRef.current?.uid.startsWith('bypass')) {
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => {
      unsubFromAuth();
      if (unsubFromProfile) unsubFromProfile();
    };
  }, [firestore, auth]);

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
      lastLoginRewardClaimedAt: 0,
      lastQotdClaimedAt: 0,
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
        const result = await FirebaseAuthentication.signInWithGoogle();
        if (result.credential?.idToken) {
          const credential = GoogleAuthProvider.credential(result.credential.idToken);
          await signInWithCredential(auth!, credential);
        }
      } else {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth!, provider);
      }
    } catch (error: any) {
      console.error('Sign-In Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loginWithFacebook = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const provider = new FacebookAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Facebook Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const bypassLogin = () => {
    setLoading(true);
    const mockUser: UserProfile = {
      uid: 'bypass-' + Math.random().toString(36).substring(7),
      displayName: 'Premium Tester',
      email: 'tester@letprep.app',
      photoURL: 'https://picsum.photos/seed/tester/200/200',
      onboardingComplete: true,
      credits: 100,
      xp: 15000,
      isPro: true,
      streakCount: 14,
      majorship: 'Mathematics',
      lastRewardedRank: 1,
      dailyAdCount: 0,
      dailyQuestionsAnswered: 0,
      dailyTestsFinished: 0,
      dailyCreditEarned: 0,
      lastTaskReset: Date.now(),
      referralCode: 'TESTER',
      taskLoginClaimed: false,
      taskQuestionsClaimed: false,
      taskMockClaimed: false,
      taskMistakesClaimed: false,
      unlockedTracks: ['General Education', 'Professional Education', 'Specialization', 'all']
    };
    setUser(mockUser);
    setLoading(false);
    toast({ variant: "reward", title: "Bypass Mode Active", description: "Test environment established." });
  };

  const logout = async () => {
    if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut();
    if (auth) await signOut(auth);
    setUser(null);
    router.push('/');
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!firestore || !user?.uid) return;
    if (user.uid.startsWith('bypass')) {
      setUser(prev => prev ? ({ ...prev, ...data }) : null);
      return;
    }
    const userDocRef = doc(firestore, 'users', user.uid);
    try { await updateDoc(userDocRef, data); } catch (e) { await setDoc(userDocRef, data, { merge: true }); }
  };

  const refreshUser = async () => {
    if (!firestore || !user?.uid || user.uid.startsWith('bypass')) return;
    const snap = await getDoc(doc(firestore, 'users', user.uid));
    if (snap.exists()) setUser({ ...scrubUserData(snap.data(), user), uid: user.uid });
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, loginWithGoogle, loginWithFacebook, 
      loginAnonymously: async () => { if (auth) await signInAnonymously(auth); }, 
      bypassLogin, logout, updateProfile, 
      addXp: async (amt) => { 
        if (user && firestore && !user.uid.startsWith('bypass')) {
          await updateDoc(doc(firestore, 'users', user.uid), { xp: increment(amt) });
        } else if (user?.uid.startsWith('bypass')) {
          setUser(prev => prev ? ({ ...prev, xp: (prev.xp || 0) + amt }) : null);
        }
      },
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useUser = () => useContext(AuthContext);
