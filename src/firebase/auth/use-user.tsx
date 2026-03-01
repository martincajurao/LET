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

/**
 * Robustly detects if a value is a Firestore sentinel (increment, arrayUnion, etc.)
 * These objects must NOT be cleaned or recursed into.
 */
function isFirestoreSentinel(val: any): boolean {
  if (!val || typeof val !== 'object') return false;
  
  // Standard Sentinel checks for Modular SDK
  return (
    val.constructor?.name === 'FieldValue' || 
    (typeof val._methodName === 'string') ||
    (typeof val.type === 'string' && ['increment', 'arrayUnion', 'arrayRemove', 'serverTimestamp', 'delete'].includes(val.type)) ||
    ('_type' in val && val._type === 'FieldValue')
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
    if (scrubbed[key] === undefined || scrubbed[key] === null || isFirestoreSentinel(scrubbed[key])) {
      scrubbed[key] = (prevUser as any)?.[key] ?? 0;
    }
  });

  dateFields.forEach(key => {
    if (scrubbed[key] === undefined || scrubbed[key] === null || isFirestoreSentinel(scrubbed[key])) {
      scrubbed[key] = (prevUser as any)?.[key] ?? Date.now();
    } else if (scrubbed[key] && typeof scrubbed[key] === 'object' && scrubbed[key].toMillis) {
      scrubbed[key] = scrubbed[key].toMillis();
    }
  });

  // Handle remaining fields
  for (const key in scrubbed) {
    if (!numFields.includes(key) && !dateFields.includes(key)) {
      if (isFirestoreSentinel(scrubbed[key])) {
        scrubbed[key] = (prevUser as any)?.[key] ?? null;
      }
    }
  }

  return scrubbed as UserProfile;
}

/**
 * Safely cleans data for Firestore by removing undefined values 
 * while PROTECTING Firestore internal objects like FieldValue.
 */
function cleanFirestoreData(data: any): any {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;
  
  // IMPORTANT: If this is a sentinel, return it AS IS.
  // Do NOT recurse or try to turn it into a plain object.
  if (isFirestoreData(data)) {
    return data;
  }

  if (Array.isArray(data)) return data.map(cleanFirestoreData);
  
  const cleaned: any = {};
  for (const key in data) {
    const val = cleanFirestoreData(data[key]);
    // Preserve nulls but skip undefined
    if (val !== undefined) {
      cleaned[key] = val;
    }
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

  // Sync ref with state for use in the async scrub callback
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Handle redirect result on page load (for mobile/Capacitor)
  useEffect(() => {
    if (!auth) return;
    
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("Redirect sign-in successful:", result.user);
        }
      } catch (error: any) {
        console.error("Redirect result error:", error);
      }
    };
    
    checkRedirectResult();
  }, [auth]);

  // Listen for native Firebase Auth state changes (important for session persistence)
  useEffect(() => {
    if (!auth) return;

    let unsubscribe: (() => void) | null = null;

    const setupAuthListener = async () => {
      try {
        // Add listener for native auth state changes
        const handler = await FirebaseAuthentication.addListener('authStateChange', async (event) => {
          console.log('[Auth] Native auth state changed:', event);
          
          if (event.user) {
            // User is signed in via native auth
            console.log('[Auth] Native user signed in:', event.user.uid);
            
            // Fetch user profile from Firestore
            const userProfile = await fetchUserProfileFromFirestore(event.user.uid);
            if (userProfile) {
              setUser(userProfile);
            } else {
              // Create new profile if doesn't exist
              const newProfile = await createUserProfileInFirestore({
                uid: event.user.uid,
                displayName: event.user.displayName,
                email: event.user.email,
                photoURL: event.user.photoUrl
              });
              setUser(newProfile);
            }
          } else {
            // User signed out from native auth
            console.log('[Auth] Native user signed out');
          }
        });
        
        unsubscribe = () => {
          handler.remove();
        };
      } catch (error) {
        console.error('[Auth] Failed to setup native auth listener:', error);
      }
    };

    setupAuthListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [auth, firestore]);

  // Check for existing native user on mount (for session persistence)
  useEffect(() => {
    const checkExistingNativeUser = async () => {
      if (!auth || !firestore) return;
      
      try {
        const nativeUser = await nativeAuth.getCurrentUser();
        if (nativeUser.user) {
          console.log('[Auth] Found existing native user on mount:', nativeUser.user.uid);
          const userProfile = await fetchUserProfileFromFirestore(nativeUser.user.uid);
          if (userProfile) {
            setUser(userProfile);
          } else {
            const newProfile = await createUserProfileInFirestore({
              uid: nativeUser.user.uid,
              displayName: nativeUser.user.displayName,
              email: nativeUser.user.email,
              photoURL: nativeUser.user.photoURL
            });
            setUser(newProfile);
          }
        }
      } catch (error) {
        console.error('[Auth] Error checking existing native user:', error);
      }
    };

    checkExistingNativeUser();
  }, [auth, firestore]);

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
        }, async (error) => {
          const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'get',
          });
          errorEmitter.emit('permission-error', permissionError);
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

  // Helper to check if we're on native mobile (Capacitor - Android/iOS)
  // This is used when the bottom navbar is visible (mobile view)
  const isNativeMobile = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    // Check for Capacitor first (more reliable)
    // @ts-ignore
    const capacitor = window.Capacitor;
    if (capacitor) {
      // @ts-ignore
      const platform = capacitor.platform;
      if (platform === 'android' || platform === 'ios') {
        return true;
      }
      // Check isNativePlatform method
      // @ts-ignore
      const isNative = capacitor.isNativePlatform?.();
      if (isNative === true) {
        return true;
      }
    }
    
    // Fallback to window.android or webkit (older detection)
    // @ts-ignore
    const hasAndroid = window.android !== undefined;
    // @ts-ignore
    const hasWebkit = window.webkit !== undefined;
    
    if (hasAndroid || hasWebkit) {
      return true;
    }
    
    return false;
  };

  // Function to fetch user profile from Firestore directly
  const fetchUserProfileFromFirestore = async (uid: string): Promise<UserProfile | null> => {
    if (!firestore) return null;
    try {
      const userDocRef = doc(firestore, 'users', uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  };

  // Function to create a new user profile in Firestore
  const createUserProfileInFirestore = async (firebaseUser: any): Promise<UserProfile> => {
    if (!firestore) throw new Error("Firestore not initialized");
    
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
    
    const userDocRef = doc(firestore, 'users', firebaseUser.uid);
    await setDoc(userDocRef, newUserProfile);
    return newUserProfile;
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    
    try {
      // Check if we're on native mobile (Capacitor) - use native Firebase Auth
      // This applies when the bottom navbar is visible (mobile view)
      if (isNativeMobile()) {
        try {
          // Use native Firebase Auth on Android
          const result = await nativeAuth.signInWithGoogle();
          
          if (result.error) {
            console.error('Native auth error:', result.error);
            toast({ 
              variant: "destructive", 
              title: "Native Sign-In Failed", 
              description: result.error.message || "Could not complete native sign-in. Please try again." 
            });
            setLoading(false);
            return;
          }
          
          if (result.user) {
            // Fetch user profile directly from Firestore using native user's UID
            let userProfile = await fetchUserProfileFromFirestore(result.user.uid);
            
            if (!userProfile) {
              // Create new user profile
              userProfile = await createUserProfileInFirestore({
                uid: result.user.uid,
                displayName: result.user.displayName,
                email: result.user.email,
                photoURL: result.user.photoURL
              });
            }
            
            // Set user directly in state (bypass Firebase Web Auth)
            setUser(userProfile);
            setLoading(false);
            return;
          }
        } catch (nativeError: any) {
          console.error('Native auth failed:', nativeError);
          // Show error message instead of falling through to web auth
          toast({ 
            variant: "destructive", 
            title: "Native Sign-In Failed", 
            description: nativeError.message || "Could not complete native sign-in. Please try again." 
          });
          setLoading(false);
          return;
        }
      }
      
      // Fallback to Firebase Auth (web popup or redirect)
      if (!auth) {
        toast({ 
          variant: "destructive", 
          title: "Sign In Failed", 
          description: "Authentication not initialized" 
        });
        return;
      }
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      // Check if we're in a Capacitor environment (mobile)
      const isCapacitor = typeof window !== 'undefined' && (
        // @ts-ignore
        window.Capacitor?.isNativePlatform?.() || 
        // @ts-ignore  
        window.webkit !== undefined
      );
      
      if (isCapacitor) {
        // Use redirect for mobile/Capacitor - more reliable
        await signInWithRedirect(auth, provider);
      } else {
        // Use popup for web
        await signInWithPopup(auth, provider);
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/redirect-cancelled-by-user') {
        toast({ 
          variant: "destructive", 
          title: "Sign In Failed", 
          description: error.message || "Could not complete sign-in." 
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
      // Check if we're in a Capacitor environment (mobile)
      const isCapacitor = typeof window !== 'undefined' && (
        // @ts-ignore
        window.Capacitor?.isNativePlatform?.() || 
        // @ts-ignore  
        window.android !== undefined ||
        // @ts-ignore
        window.webkit !== undefined
      );
      
      if (isCapacitor) {
        // Use redirect for mobile/Capacitor
        await signInWithRedirect(auth, provider);
      } else {
        // Use popup for web
        await signInWithPopup(auth, provider);
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/redirect-cancelled-by-user') {
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
    // Check if we're on native mobile
    if (isNativeMobile()) {
      try {
        await nativeAuth.signOut();
      } catch (error) {
        console.error('Native logout error:', error);
      }
    }
    
    if (auth) {
      await signOut(auth);
    }
    setUser(null);
    router.push('/');
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!firestore || !user?.uid) return;
    
    // Use cleaned data that preserves FieldValue sentinels
    const cleaned = cleanFirestoreData(data);
    const userDocRef = doc(firestore, 'users', user.uid);
    
    try {
      await updateDoc(userDocRef, cleaned);
    } catch (e) {
      await setDoc(userDocRef, cleaned, { merge: true });
    }
  };

  // Manual refresh function to force re-fetch user data from Firestore
  // This is needed for Android WebView where onSnapshot may not work reliably
  const refreshUser = async () => {
    if (!firestore || !user?.uid) return;
    
    try {
      console.log('[Auth] Refreshing user data manually...');
      const userDocRef = doc(firestore, 'users', user.uid);
      const snap = await getDoc(userDocRef);
      
      if (snap.exists()) {
        const data = snap.data();
        const scrubbed = scrubUserData(data, user);
        setUser({
          ...scrubbed,
          uid: user.uid,
        });
        console.log('[Auth] User data refreshed successfully');
      }
    } catch (error) {
      console.error('[Auth] Error refreshing user data:', error);
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
      addXp,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useUser = () => useContext(AuthContext);
