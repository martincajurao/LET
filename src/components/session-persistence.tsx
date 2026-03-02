'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/firebase';
import { useUser } from '@/firebase/auth/use-user';
import { Capacitor } from '@capacitor/core';

/**
 * SessionPersistence maintains authentication stability within the Android WebView.
 * It ensures the native Capacitor session is actively synchronized with the 
 * client-side Firebase state during mount and route transitions.
 */
export function SessionPersistence() {
  const pathname = usePathname();
  const { user, loading, refreshUser } = useUser();
  const lastPathRef = useRef(pathname);
  const syncInProgress = useRef(false);

  // Function to verify and restore native session
  const checkSession = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !auth || syncInProgress.current) return;
    
    try {
      syncInProgress.current = true;
      
      // Check native layer for current user
      const result = await FirebaseAuthentication.getCurrentUser();
      
      if (result.user) {
        console.log('[SessionPersistence] Native user trace found:', result.user.uid);
        
        // If JS layer is missing the user, attempt silent re-auth
        if (!auth.currentUser) {
          console.log('[SessionPersistence] JS layer out of sync. Re-authenticating...');
          
          // Note: In a full production app, we would use the latest idToken from the native side
          // For now, we trigger a refresh which should pull from the native persistence layer
          await refreshUser();
        }
      } else if (user && !user.uid.startsWith('bypass')) {
        // Native layer says no user, but JS layer thinks there is one
        // This is an inconsistent state, but we prioritize the native session in WebViews
        console.warn('[SessionPersistence] Native layer session missing. JS layer may be stale.');
      }
    } catch (error) {
      console.error('[SessionPersistence] Synchronization failed:', error);
    } finally {
      syncInProgress.current = false;
    }
  }, [user, refreshUser]);

  // Handle route change synchronization
  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    
    // Only verify session if we are in a native platform and appear unauthenticated
    if (!loading && !user) {
      checkSession();
    }
  }, [pathname, loading, user, checkSession]);

  // Initial mount verification
  useEffect(() => {
    const timer = setTimeout(() => {
      checkSession();
    }, 1500); // Allow additional time for bridge hydration
    
    return () => clearTimeout(timer);
  }, [checkSession]);

  return null;
}

export default SessionPersistence;
