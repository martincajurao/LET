'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { nativeAuth } from '@/lib/native-auth';
import { useUser } from '@/firebase';

/**
 * This component ensures session persistence in the WebView
 * by checking the auth state when routes change and listening for native auth events
 */
export function SessionPersistence() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading } = useUser();
  const lastPathRef = useRef(pathname);

  // Function to check and restore session
  const checkSession = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    // Check if we're on a native platform
    // @ts-ignore
    const capacitor = window.Capacitor;
    if (!capacitor) return;
    
    // @ts-ignore
    const platform = capacitor.platform;
    if (platform !== 'android' && platform !== 'ios') return;
    
    console.log('[SessionPersistence] Checking session...');
    
    try {
      // Check for existing native user
      const result = await nativeAuth.getCurrentUser();
      if (result.user) {
        console.log('[SessionPersistence] Found native user:', result.user.uid);
      } else {
        console.log('[SessionPersistence] No native user found');
      }
    } catch (error) {
      console.error('[SessionPersistence] Error checking session:', error);
    }
  }, []);

  // Check session when route changes (but not on first load)
  useEffect(() => {
    // Skip on initial load
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    
    // Only check if user is not loaded and we're on native
    if (!loading && !user) {
      console.log('[SessionPersistence] Route changed, checking session...');
      checkSession();
    }
  }, [pathname, searchParams, loading, user, checkSession]);

  // Check on mount
  useEffect(() => {
    // Delay check to ensure app is fully loaded
    const timer = setTimeout(() => {
      checkSession();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [checkSession]);

  return null;
}

export default SessionPersistence;
