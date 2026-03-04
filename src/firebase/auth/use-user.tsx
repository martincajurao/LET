'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useRef, useCallback } from 'react';
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
  squadId?: string | null;
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
  locationRegion?: string;
  locationCity?: string;
  // New Gamification Fields
  streakFreezesAvailable?: number;
  lastStreakFreezeUsed?: number;
  hasStreakProtection?: boolean;
  lastFirstWinDate?: number;
  totalFirstWins?: number;
  lastMonthlyClaimDate?: number;
  monthlyStreakCount?: number;
  totalXpEarned?: number;
  soundEnabled?: boolean;
  hapticEnabled?: boolean;
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
  detectLocation: () => Promise<void>;
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
  detectLocation: async () => {},
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

  const detectLocation = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.geolocation || !userRef.current) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Use a free reverse geocoding API (low volume)
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
          const data = await response.json();
          
          if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.municipality || data.address.suburb || 'Unknown City';
            const region = data.address.state || data.address.region || 'Unknown Region';
            
            if (userRef.current && (userRef.current.locationCity !== city || userRef.current.locationRegion !== region)) {
              const userDocRef = doc(firestore!, 'users', userRef.current.uid);
              await updateDoc(userDocRef, {
                locationCity: city,
                locationRegion: region,
                lastActiveDate: serverTimestamp()
              });
              setUser(prev => prev ? { ...prev, locationCity: city, locationRegion: region } : null);
              console.log(`[Location] Calibrated to ${city}, ${region}`);
            }
          }
        } catch (e) {
          console.warn('[Location] Reverse geocode failed:', e);
        }
      },
      (error) => {
        console.warn('[Location] Access denied or failed:', error.message);
      },
      { timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (!auth || !firestore) return;
    
    const virtualUid = localStorage.getItem('virtual_educator_uid');
    if (virtualUid) {
      handleVirtualSession(virtualUid);
      return;
    }

    let unsubFromProfile: (() => void) | undefined;
    const unsubFromAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubFromProfile) {
        unsubFromProfile();
        unsubFromProfile = undefined;
      }
      
      if (firebaseUser) {
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        
        try {
          const snap = await getDoc(userDocRef);
          if (!snap.exists()) {
            await createUserProfileInFirestore(firebaseUser);
          } else {
            const scrubbed = scrubUserData(snap.data(), userRef.current);
            setUser({ ...scrubbed, uid: firebaseUser.uid });
          }
        } catch (e) {
          console.error('[Auth] Initial profile fetch error:', e);
        }

        unsubFromProfile = onSnapshot(userDocRef, (profileSnap) => {
          if (profileSnap.exists()) {
            const scrubbed = scrubUserData(profileSnap.data(), userRef.current);
            setUser({ ...scrubbed, uid: firebaseUser.uid });
            setLoading(false);
            
            // Auto-detect location if missing or potentially stale
            if (!scrubbed.locationCity || !scrubbed.locationRegion) {
              detectLocation();
            }
          }
        }, (error) => {
          console.error('[Auth] Firestore Profile Sync Error:', error);
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
  }, [firestore, auth, detectLocation]);

  const handleVirtualSession = async (uid: string) => {
    const userDocRef = doc(firestore!, 'users', uid);
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
    email: 'test@teacher.app',
    photoURL: 'https://picsum.photos/seed/tester/200/200',
    onboardingComplete: true,
    credits: 100,
    xp: 5000,
    lastRewardedRank: 1,
    isPro: true,
    streakCount: 14,
    majorship: 'English',
    lastActiveDate: Date.now(),
    lastTaskReset: Date.now(),
    unlockedTracks: ['General Education', 'Professional Education', 'Specialization', 'all'],
    referralCode: 'TESTER',
    squadId: null,
    locationRegion: 'Metro Manila',
    locationCity: 'Quezon City'
  });

  const createUserProfileInFirestore = async (firebaseUser: any) => {
    const newUserProfile: UserProfile = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || 'Teacher',
      email: firebaseUser.email || 'teacher@practice.app',
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
      unlockedTracks: ['General Education'],
      squadId: null
    };
    
    try {
      await setDoc(doc(firestore!, 'users', firebaseUser.uid), newUserProfile, { merge: true });
      detectLocation();
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
      const userCred = await signInAnonymously(auth);
      if (userCred.user) {
        await refreshUser();
      }
      toast({ variant: "reward", title: "Test Session Active", description: "Authenticated via Firebase trace." });
    } catch (e: any) {
      const virtualUid = localStorage.getItem('virtual_educator_uid') || `bypass_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('virtual_educator_uid', virtualUid);
      await handleVirtualSession(virtualUid);
      toast({ variant: "reward", title: "Virtual Trace Active", description: "Using persistent local session." });
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('virtual_educator_uid');
      let firebaseUser: FirebaseUser | null = null;

      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        if (result.credential?.idToken) {
          const credential = GoogleAuthProvider.credential(result.credential.idToken);
          const userCred = await signInWithCredential(auth!, credential);
          firebaseUser = userCred.user;
        }
      } else {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const userCred = await signInWithPopup(auth!, provider);
        firebaseUser = userCred.user;
      }

      if (firebaseUser) {
        const userDocRef = doc(firestore!, 'users', firebaseUser.uid);
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          const newProfile = await createUserProfileInFirestore(firebaseUser);
          if (newProfile) setUser(newProfile);
        } else {
          const scrubbed = scrubUserData(snap.data(), userRef.current);
          setUser({ ...scrubbed, uid: firebaseUser.uid });
        }
      }

      toast({ title: "Welcome back!", description: "Teacher session synchronized." });
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        toast({ variant: "destructive", title: "Sign-In Failed", description: error.message || "Could not authenticate." });
      }
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
      const userCred = await signInWithPopup(auth, provider);
      if (userCred.user) {
        await refreshUser();
      }
    } catch (error: any) {
      console.error('Facebook Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('virtual_educator_uid');
    setLoading(true);
    try {
      if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut();
      if (auth) await signOut(auth);
      setUser(null);
      router.push('/');
    } catch (e) {
      console.error('[Auth] Logout error:', e);
    } finally {
      setLoading(false);
    }
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
    if (!firestore || !auth?.currentUser) return;
    try {
      const snap = await getDoc(doc(firestore, 'users', auth.currentUser.uid));
      if (snap.exists()) {
        const scrubbed = scrubUserData(snap.data(), userRef.current);
        setUser({ ...scrubbed, uid: auth.currentUser.uid });
      }
    } catch (e) {
      console.error('[Auth] Manual sync error:', e);
    }
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
      refreshUser,
      detectLocation
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useUser = () => useContext(AuthContext);
