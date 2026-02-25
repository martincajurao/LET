'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut,
  signInAnonymously,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { auth, firestore } from '../index';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

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
});

/**
 * Detects if a value is an internal Firestore FieldValue object 
 * (like increment or serverTimestamp) that cannot be rendered by React.
 */
function isFirestoreInternal(val: any): boolean {
  if (!val || typeof val !== 'object') return false;
  return (
    val.constructor?.name === 'FieldValue' || 
    (typeof val._methodName === 'string') ||
    (val.type === 'increment' || val.type === 'arrayUnion' || val.type === 'serverTimestamp')
  );
}

/**
 * Scrubs the user object of any non-renderable Firestore objects.
 * Uses previous state as a fallback to prevent "jumping to 0" during pending increments.
 */
function scrubUserData(data: any, prevUser: UserProfile | null): UserProfile {
  const scrubbed: any = { ...data };
  
  const numFields = [
    'credits', 'xp', 'streakCount', 'dailyAdCount', 
    'dailyQuestionsAnswered', 'dailyTestsFinished', 
    'dailyCreditEarned', 'referralCount', 'referralCreditsEarned', 
    'mistakesReviewed', 'dailyAiUsage'
  ];

  const dateFields = [
    'lastAdXpTimestamp', 'lastQuickFireTimestamp', 'lastActiveDate', 
    'lastTaskReset', 'lastQualityUpdate', 'lastExplanationRequest'
  ];

  // Atomic Field Scrubbing:
  // If a field is currently an internal FieldValue (pending write) or null/undefined
  // in the snapshot, we fill it from the last known good state (prevUser).
  numFields.forEach(key => {
    if (scrubbed[key] === undefined || scrubbed[key] === null || isFirestoreInternal(scrubbed[key])) {
      scrubbed[key] = (prevUser as any)?.[key] ?? 0;
    }
  });

  dateFields.forEach(key => {
    if (scrubbed[key] === undefined || scrubbed[key] === null || isFirestoreInternal(scrubbed[key])) {
      scrubbed[key] = (prevUser as any)?.[key] ?? Date.now();
    } else if (scrubbed[key] && typeof scrubbed[key] === 'object' && scrubbed[key].toMillis) {
      scrubbed[key] = scrubbed[key].toMillis();
    }
  });

  // Handle remaining fields
  for (const key in scrubbed) {
    if (!numFields.includes(key) && !dateFields.includes(key)) {
      if (isFirestoreInternal(scrubbed[key])) {
        scrubbed[key] = (prevUser as any)?.[key] ?? null;
      }
    }
  }

  return scrubbed as UserProfile;
}

/**
 * Safely cleans data for Firestore by removing undefined values 
 * while protecting Firestore internal objects like FieldValue.
 */
function cleanFirestoreData(data: any): any {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;
  
  if (data.constructor?.name === 'FieldValue' || (data._methodName && data._methodName.startsWith('FieldValue.'))) {
    return data;
  }

  if (Array.isArray(data)) return data.map(cleanFirestoreData);
  
  const cleaned: any = {};
  for (const key in data) {
    const val = cleanFirestoreData(data[key]);
    if (val !== undefined) {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<UserProfile | null>(null);
  const isResettingRef = useRef(false);

  // Sync ref with state for use in the async scrub callback
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!auth || !firestore) {
      setLoading(false);
      return;
    }

    let unsubFromProfile: (() => void) | undefined;

    const unsubFromAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubFromProfile) {
        unsubFromProfile();
      }

      if (firebaseUser) {
        setLoading(true);
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        
        unsubFromProfile = onSnapshot(userDocRef, async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const scrubbed = scrubUserData(data, userRef.current);
            setUser({
              ...scrubbed,
              uid: firebaseUser.uid,
            });
          } else {
            const newUserProfile: any = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || (firebaseUser.isAnonymous ? 'Guest Educator' : 'Educator'),
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              onboardingComplete: false,
              credits: 20, // Default starting credits
              xp: 0,
              lastRewardedRank: 1,
              isPro: false,
              dailyAdCount: 0,
              dailyAiUsage: 0,
              dailyQuestionsAnswered: 0,
              dailyTestsFinished: 0,
              dailyCreditEarned: 0,
              streakCount: 0,
              lastActiveDate: serverTimestamp(),
              lastTaskReset: serverTimestamp(),
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
            try {
              await setDoc(userDocRef, newUserProfile);
            } catch (error) {
              console.error("Error creating user document:", error);
              toast({ variant: "destructive", title: "Setup Failed", description: "Could not create your user profile." });
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore subscription error:", error);
          toast({ variant: "destructive", title: "Sync Error", description: "Failed to sync your profile." });
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubFromAuth();
      if (unsubFromProfile) {
        unsubFromProfile();
      }
    };
  }, [toast, firestore, auth]);

  // Handle Daily Task Reset (Calendar Day Check)
  useEffect(() => {
    if (user && user.uid && user.uid !== 'bypass-user' && firestore && !isResettingRef.current) {
      const now = new Date();
      const lastReset = user.lastTaskReset || 0;
      
      if (lastReset !== 0) {
        const lastResetDate = new Date(lastReset).toDateString();
        const nowDate = now.toDateString();
        
        if (lastResetDate !== nowDate) {
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
          })
          .catch(err => console.error("Auto Reset Failed:", err))
          .finally(() => {
            isResettingRef.current = false;
          });
        }
      }
    }
  }, [user?.uid, user?.lastTaskReset, firestore]);

  const addXp = async (amount: number) => {
    if (!user || !firestore) return;
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        xp: increment(amount)
      });
    } catch (e) {
      console.error("XP Error:", e);
    }
  };

  const loginWithGoogle = async () => {
    if (!auth) return;
    setLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({ 
          variant: "destructive", 
          title: "Sign In Failed", 
          description: error.message || "Could not complete popup sign-in." 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithFacebook = async () => {
    if (!auth) return;
    setLoading(true);
    const provider = new FacebookAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({ 
          variant: "destructive", 
          title: "Sign In Failed", 
          description: error.message || "Could not complete Facebook sign-in." 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loginAnonymously = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Guest Access Error",
        description: "Please ensure Anonymous Sign-in is enabled in your Firebase Console.",
      });
    } finally {
      setLoading(false);
    }
  };

  const bypassLogin = () => {
    setUser({
      uid: 'bypass-user',
      displayName: 'Bypass User',
      email: 'bypass@example.com',
      photoURL: null,
      majorship: 'Mathematics',
      onboardingComplete: true,
      credits: 100,
      xp: 1500,
      lastRewardedRank: 1,
      streakCount: 3,
      dailyAiUsage: 25,
      dailyQuestionsAnswered: 40,
      dailyTestsFinished: 2,
      lastTaskReset: Date.now(),
      unlockedTracks: []
    });
    setLoading(false);
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
    setUser(null);
    router.push('/');
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!firestore || !user?.uid) return;
    const cleaned = cleanFirestoreData(data);
    const userDocRef = doc(firestore, 'users', user.uid);
    try {
      // Use atomic updateDoc to preserve existing fields and handle FieldValues correctly
      await updateDoc(userDocRef, cleaned);
    } catch (e) {
      // Fallback only if document missing
      await setDoc(userDocRef, cleaned, { merge: true });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      loginWithGoogle, 
      loginWithFacebook,
      loginAnonymously, 
      bypassLogin, 
      logout, 
      updateProfile,
      addXp
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useUser = () => useContext(AuthContext);