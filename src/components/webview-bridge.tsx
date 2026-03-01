'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface WebViewBridgeProps {
  children?: React.ReactNode;
}

/**
 * WebViewBridge ensures seamless routing between the Next.js web layer 
 * and the native Android wrapper. It intercepts native navigation messages
 * and dispatches them through the client-side router.
 */
export function WebViewBridge({ children }: WebViewBridgeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isNavigatingRef = useRef(false);

  // Handle messages from Android WebView/Capacitor
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = event.data;
      
      // Standard route change requested by native code
      if (data && data.type === 'ROUTE_CHANGE') {
        const url = data.url;
        if (url && url.startsWith('/')) {
          console.log('[WebViewBridge] Native Route Change:', url);
          router.push(url);
        }
      }
      
      // Deep link handling (e.g. from notifications or intents)
      if (data && data.type === 'DEEP_LINK') {
        const url = data.url;
        if (url) {
          try {
            const urlObj = new URL(url);
            const path = urlObj.pathname;
            if (path) {
              console.log('[WebViewBridge] Deep Link detected:', path);
              router.push(path);
            }
          } catch (e) {
            // If not a full URL, attempt to use as direct path
            if (url.startsWith('/')) {
              router.push(url);
            }
          }
        }
      }
    } catch (error) {
      console.error('WebViewBridge: Error handling message:', error);
    }
  }, [router]);

  // Set up WebView message listener and native version logging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleMessage);
      
      const win = window as any;
      if (win.appVersion) {
        console.log('[WebViewBridge] Native Android App detected. Version:', win.appVersion);
      }
      
      // Handle hash changes for older legacy routing if needed
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

  // Notify native side of route changes for system-level tracking
  useEffect(() => {
    const win = window as any;
    if (typeof window !== 'undefined' && (win.Capacitor?.isNativePlatform?.() || win.android)) {
      // Notify Capacitor
      if (win.Capacitor?.isNativePlatform?.()) {
        const Capacitor = win.Capacitor;
        try {
          // Attempt to notify native side using common bridge patterns
          if (Capacitor.Plugins?.App?.notifyPathChange) {
            Capacitor.Plugins.App.notifyPathChange({ path: pathname });
          }
        } catch (e) {}
      }

      // Legacy Android Bridge support
      if (win.android && win.android.onRouteChanged) {
        win.android.onRouteChanged(pathname);
      }
    }
  }, [pathname]);

  return <>{children}</>;
}

// Hook to check if running in a native context
export function useIsNativeWebView(): boolean {
  if (typeof window === 'undefined') return false;
  
  const win = window as any;
  const capacitor = win.Capacitor;
  if (capacitor && capacitor.isNativePlatform && capacitor.isNativePlatform()) {
    return true;
  }
  
  const android = win.android;
  if (android) {
    return true;
  }
  
  const webkit = win.webkit;
  if (webkit && webkit.messageHandlers && webkit.messageHandlers.nativeReady) {
    return true;
  }
  
  return false;
}

// Hook to send telemetry or events to native WebView
export function useWebViewCommunication() {
  const sendMessage = useCallback((type: string, data: Record<string, any> = {}) => {
    if (typeof window !== 'undefined') {
      const win = window as any;
      
      // Standard Capacitor call pattern
      if (win.Capacitor?.isNativePlatform?.()) {
        window.postMessage({ type, ...data }, '*');
      }

      // Android JavaScript Interface
      const android = win.android;
      if (android && android.onWebViewMessage) {
        android.onWebViewMessage(JSON.stringify({ type, ...data }));
      }

      // iOS Message Handlers
      const webkit = win.webkit;
      if (webkit && webkit.messageHandlers && webkit.messageHandlers.nativeReady) {
        webkit.messageHandlers.nativeReady.postMessage({ type, ...data });
      }
    }
  }, []);

  return { sendMessage };
}

// Hook for high-fidelity self-update orchestration
export function useSelfUpdate() {
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [updateStatus, setUpdateStatus] = useState<string>('');

  useEffect(() => {
    const handleProgress = (event: CustomEvent) => {
      setUpdateProgress(event.detail);
    };

    const handleResult = (event: CustomEvent) => {
      try {
        const data = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail;
        setUpdateStatus(data.status + ': ' + data.message);
      } catch (e) {
        setUpdateStatus('Update Status: ' + event.detail);
      }
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
        const hasValidSha256 = expectedSha256 && (
          expectedSha256.startsWith('sha256:') || 
          /^[a-fA-F0-9]{64}$/.test(expectedSha256)
        );
        
        android.checkForUpdate(apkUrl, hasValidSha256 ? expectedSha256 : '');
        setUpdateStatus('Initiating secure download...');
      } else {
        setUpdateStatus('Self-update unavailable on this platform');
      }
    }
  }, []);

  return { downloadUpdate, updateProgress, updateStatus, setUpdateStatus };
}

export default WebViewBridge;
