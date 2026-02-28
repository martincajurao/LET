'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

import { useRouter, usePathname } from 'next/navigation';

interface WebViewBridgeProps {
  children?: React.ReactNode;
}

// Component to handle routing in Android WebView
// This intercepts navigation and ensures proper client-side routing
export function WebViewBridge({ children }: WebViewBridgeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isNavigatingRef = useRef(false);

  // Handle messages from Android WebView
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = event.data;
      
      if (data && data.type === 'ROUTE_CHANGE') {
        const url = data.url;
        if (url && url.startsWith('/')) {
          router.push(url);
        }
      }
      
      if (data && data.type === 'DEEP_LINK') {
        const url = data.url;
        if (url) {
          const urlObj = new URL(url);
          const path = urlObj.pathname;
          if (path) {
            router.push(path);
          }
        }
      }
    } catch (error) {
      console.error('WebViewBridge: Error handling message:', error);
    }
  }, [router]);

  // Set up WebView message listener
  useEffect(() => {
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('message', handleMessage);
      
      // Handle hash changes for routing
      const handleHashChange = () => {
        const hash = window.location.hash.slice(1);
        if (hash && hash !== pathname && !isNavigatingRef.current) {
          isNavigatingRef.current = true;
          router.push(hash);
          setTimeout(() => { isNavigatingRef.current = false; }, 100);
        }
      };
      
      window.addEventListener('hashchange', handleHashChange);
      
      return () => {
        window.removeEventListener('message', handleMessage);
        window.removeEventListener('hashchange', handleHashChange);
      };
    }
  }, [handleMessage, router, pathname]);

  // Notify native side of route changes
  useEffect(() => {
    const win = window as any;
    if (typeof window !== 'undefined' && win.Capacitor?.isNativePlatform?.()) {
      const Cordova = win.Cordova;
      if (Cordova && Cordova.fireDocumentEvent) {
        Cordova.fireDocumentEvent('routeChange', { 
          path: pathname,
          url: window.location.href 
        });
      }
    }
  }, [pathname]);

  return <>{children}</>;
}

// Hook to check if running in native WebView
export function useIsNativeWebView(): boolean {
  if (typeof window === 'undefined') return false;
  
  const capacitor = (window as any).Capacitor;
  if (capacitor && capacitor.isNativePlatform && capacitor.isNativePlatform()) {
    return true;
  }
  
  const android = (window as any).android;
  if (android) {
    return true;
  }
  
  const webkit = (window as any).webkit;
  if (webkit && webkit.messageHandlers && webkit.messageHandlers.nativeReady) {
    return true;
  }
  
  return false;
}

// Hook to send messages to native WebView
export function useWebViewCommunication() {
  const sendMessage = useCallback((type: string, data: Record<string, any> = {}) => {
    if (typeof window !== 'undefined') {
      const android = (window as any).android;
      if (android && android.onWebViewMessage) {
        android.onWebViewMessage(JSON.stringify({ type, ...data }));
      }

      const webkit = (window as any).webkit;
      if (webkit && webkit.messageHandlers && webkit.messageHandlers.nativeReady) {
        webkit.messageHandlers.nativeReady.postMessage({ type, ...data });
      }
    }
  }, []);

  return { sendMessage };
}

// Hook for self-update functionality
export function useSelfUpdate() {
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [updateStatus, setUpdateStatus] = useState<string>('');

  useEffect(() => {
    const handleProgress = (event: CustomEvent) => {
      setUpdateProgress(event.detail);
    };

    const handleResult = (event: CustomEvent) => {
      const data = JSON.parse(event.detail);
      setUpdateStatus(data.status + ': ' + data.message);
    };

    window.addEventListener('updateProgress', handleProgress as EventListener);
    window.addEventListener('updateResult', handleResult as EventListener);

    return () => {
      window.removeEventListener('updateProgress', handleProgress as EventListener);
      window.removeEventListener('updateResult', handleResult as EventListener);
    };
  }, []);

  const downloadUpdate = useCallback((apkUrl: string, expectedSha256: string) => {
    if (typeof window !== 'undefined') {
      const android = (window as any).android;
      if (android && android.checkForUpdate) {
        // Only pass SHA256 if it's a valid non-empty hash (starts with sha256: or is 64 char hex)
        const hasValidSha256 = expectedSha256 && (
          expectedSha256.startsWith('sha256:') || 
          /^[a-fA-F0-9]{64}$/.test(expectedSha256)
        );
        
        if (hasValidSha256) {
          android.checkForUpdate(apkUrl, expectedSha256);
        } else {
          // Call without SHA256 or with empty string to skip verification
          android.checkForUpdate(apkUrl, '');
        }
        setUpdateStatus('Starting download...');
      } else {
        setUpdateStatus('Self-update not available on this platform');
      }
    }
  }, []);

  return { downloadUpdate, updateProgress, updateStatus, setUpdateStatus };
}


export default WebViewBridge;
