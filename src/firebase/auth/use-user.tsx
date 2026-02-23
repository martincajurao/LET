
'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInAnonymously,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from '../index';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  majorship?: string;
  onboardingComplete?: boolean;
  credits?: number;
  isPro?: boolean;
  dailyAdCount?: number;
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
  taskQuestionsClaimed?: boolean;
  taskMockClaimed?: boolean;
  lastExplanationRequest?: number;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAnonymously: () => Promise<void>;
  bypassLogin: () => void;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  loginAnonymously: async () => {},
  bypassLogin: () => {},
  logout: async () => {},
  updateProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
            setUser({
              ...snap.data() as UserProfile,
              uid: firebaseUser.uid,
            });
          } else {
            const newUserProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || (firebaseUser.isAnonymous ? 'Guest Educator' : 'Educator'),
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              onboardingComplete: false,
              credits: 20,
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
              taskQuestionsClaimed: false,
              taskMockClaimed: false,
              referralCount: 0,
              referralCreditsEarned: 0,
              referralTier: 'Bronze'
            };
            try {
              await setDoc(userDocRef, newUserProfile);
              setUser(newUserProfile);
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
      streakCount: 3,
      dailyAiUsage: 25,
      dailyQuestionsAnswered: 40,
      dailyTestsFinished: 2,
    });
    setLoading(false);
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
    setUser(null);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!firestore || !user?.uid) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    await setDoc(userDocRef, data, { merge: true });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      loginWithGoogle, 
      loginAnonymously, 
      bypassLogin, 
      logout, 
      updateProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useUser = () => useContext(AuthContext);
