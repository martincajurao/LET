'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { nativeAuth } from '@/lib/native-auth';
import { useUser } from '@/firebase';

/**
 * SessionPersistence maintains authentication stability within the Android WebView.
 * It ensures the native Capacitor session is actively synchronized with the 
 * client-side Firebase state during route transitions.
 */
export function SessionPersistence() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading, refreshUser } = useUser();
  const lastPathRef = useRef(pathname);

  // Function to verify and restore native session
  const checkSession = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    // Detect Capacitor environment
    const win = window as any;
    const capacitor = win.Capacitor;
    if (!capacitor) return;
    
    const platform = capacitor.platform;
    if (platform !== 'android' && platform !== 'ios') return;
    
    try {
      // Check for existing native user tokens via bridge
      const result = await nativeAuth.getCurrentUser();
      if (result.user) {
        console.log('[SessionPersistence] Native Trace found:', result.user.uid);
        // Force refresh to ensure local profile is hydrated with latest cloud metadata
        if (!user && !loading) {
          await refreshUser();
        }
      }
    } catch (error) {
      console.error('[SessionPersistence] Sync Error:', error);
    }
  }, [user, loading, refreshUser]);

  // Handle route change synchronization
  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    
    // Only verify session if we appear unauthenticated in the web layer
    if (!loading && !user) {
      checkSession();
    }
  }, [pathname, loading, user, checkSession]);

  // Initial mount verification
  useEffect(() => {
    const timer = setTimeout(() => {
      checkSession();
    }, 1200); // Allow bridge initialization time
    
    return () => clearTimeout(timer);
  }, [checkSession]);

  return null;
}

export default SessionPersistence;
