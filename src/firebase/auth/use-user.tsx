'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut,
  signInAnonymously,
  signInWithCredential,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { auth, firestore } from '../index';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
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
  bypassLogin: () => Promise<void>;
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
  bypassLogin: async () => {},
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

  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (!auth || !firestore) return;
    
    // Check for Virtual Bypass Session first
    const virtualUid = localStorage.getItem('virtual_educator_uid');
    if (virtualUid) {
      handleVirtualSession(virtualUid);
      return;
    }

    let unsubFromProfile: (() => void) | undefined;
    const unsubFromAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubFromProfile) unsubFromProfile();
      
      if (firebaseUser) {
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          await createUserProfileInFirestore(firebaseUser);
        }

        unsubFromProfile = onSnapshot(userDocRef, (profileSnap) => {
          if (profileSnap.exists()) {
            const scrubbed = scrubUserData(profileSnap.data(), userRef.current);
            setUser({ ...scrubbed, uid: firebaseUser.uid });
            setLoading(false);
          }
        }, (error) => {
          console.error('Firestore Profile Sync Error:', error);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubFromAuth();
      if (unsubFromProfile) unsubFromProfile();
    };
  }, [firestore, auth]);

  const handleVirtualSession = async (uid: string) => {
    const userDocRef = doc(firestore, 'users', uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const scrubbed = scrubUserData(snap.data(), userRef.current);
        setUser({ ...scrubbed, uid });
      } else {
        const virtualProfile = createMockProfile(uid);
        await setDoc(userDocRef, virtualProfile);
        setUser(virtualProfile);
      }
    } catch (e) {
      console.error('Virtual Session Sync Error:', e);
      setUser(createMockProfile(uid));
    } finally {
      setLoading(false);
    }
  };

  const createMockProfile = (uid: string): UserProfile => ({
    uid,
    displayName: `Tester_${uid.substring(0, 4)}`,
    email: 'test@educator.app',
    photoURL: 'https://picsum.photos/seed/tester/200/200',
    onboardingComplete: true,
    credits: 100,
    xp: 5000,
    lastRewardedRank: 1,
    isPro: true,
    streakCount: 14,
    majorship: 'Mathematics',
    lastActiveDate: Date.now(),
    lastTaskReset: Date.now(),
    unlockedTracks: ['General Education', 'Professional Education', 'Specialization', 'all'],
    referralCode: 'TESTER'
  });

  const createUserProfileInFirestore = async (firebaseUser: any) => {
    const newUserProfile: UserProfile = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || 'Educator',
      email: firebaseUser.email || 'educator@practice.app',
      photoURL: firebaseUser.photoURL || 'https://picsum.photos/seed/user/200/200',
      onboardingComplete: true,
      credits: 20,
      xp: 0,
      lastRewardedRank: 1,
      isPro: false,
      dailyAdCount: 0,
      dailyQuestionsAnswered: 0,
      dailyTestsFinished: 0,
      streakCount: 0,
      majorship: 'English',
      lastActiveDate: Date.now(),
      lastTaskReset: Date.now(),
      referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      unlockedTracks: ['General Education']
    };
    
    try {
      await setDoc(doc(firestore, 'users', firebaseUser.uid), newUserProfile, { merge: true });
      return newUserProfile;
    } catch (e) {
      console.error('[Auth] Firestore Init Error:', e);
      return null;
    }
  };

  const bypassLogin = async () => {
    setLoading(true);
    try {
      if (!auth || !firestore) return;
      await signInAnonymously(auth);
      toast({ variant: "reward", title: "Test Session Active", description: "Authenticated via Firebase trace." });
    } catch (e: any) {
      console.warn('Firebase Auth Restricted (Bypassing to Virtual Trace):', e.message);
      const virtualUid = `bypass_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('virtual_educator_uid', virtualUid);
      await handleVirtualSession(virtualUid);
      toast({ variant: "reward", title: "Virtual Trace Active", description: "Using persistent local trace." });
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('virtual_educator_uid');
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
      console.error('Google Sign-In Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loginWithFacebook = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      localStorage.removeItem('virtual_educator_uid');
      const provider = new FacebookAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Facebook Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('virtual_educator_uid');
    if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut();
    if (auth) await signOut(auth);
    setUser(null);
    router.push('/');
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!firestore || !user?.uid) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    try { 
      await updateDoc(userDocRef, data); 
    } catch (e) { 
      setUser(prev => prev ? { ...prev, ...data } : null);
    }
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
      bypassLogin, logout, updateProfile, 
      addXp: async (amt) => { 
        if (user && firestore) {
          await updateDoc(doc(firestore, 'users', user.uid), { xp: increment(amt) });
        }
      },
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useUser = () => useContext(AuthContext);
