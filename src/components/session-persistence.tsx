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
        // This is critical for WebViews where the JS SDK might lose context
        if (!auth.currentUser) {
          console.log('[SessionPersistence] JS layer out of sync. Forcing re-hydration...');
          
          // Attempt to get a fresh token if available
          const tokenResult = await FirebaseAuthentication.getIdToken();
          if (tokenResult.token) {
            // Note: Firebase JS SDK usually manages its own session, but we can trigger
            // a reload of the current user context to force it to look at the persistence layer
            await refreshUser();
          } else {
            await refreshUser();
          }
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
    
    // Periodically verify session during navigation if user appears unauthenticated
    if (!loading && !user) {
      checkSession();
    }
  }, [pathname, loading, user, checkSession]);

  // Initial mount verification
  useEffect(() => {
    const timer = setTimeout(() => {
      checkSession();
    }, 1000); // Allow bridge hydration
    
    return () => clearTimeout(timer);
  }, [checkSession]);

  return null;
}

export default SessionPersistence;
