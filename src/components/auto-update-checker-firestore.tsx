'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useIsNativeWebView, useSelfUpdate } from '@/components/webview-bridge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, X, Smartphone, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/firebase';

// Interface for version info from Firestore
interface VersionInfo {
  version: string;
  downloadURL: string;
  releaseNotes: string;
  sha256?: string;
}

interface AutoUpdateCheckerProps {
  checkOnMount?: boolean;
  checkInterval?: number; // in milliseconds, default 24 hours
  autoDownload?: boolean; // Automatically download without showing dialog
}

export function AutoUpdateChecker({ 
  checkOnMount = true, 
  checkInterval = 24 * 60 * 60 * 1000, // 24 hours
  autoDownload = false
}: AutoUpdateCheckerProps) {

  const isNative = useIsNativeWebView();
  const { downloadUpdate, updateProgress, updateStatus } = useSelfUpdate();
  
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<number>(0);
  const [serverVersion, setServerVersion] = useState<string>('');
  const [downloadURL, setDownloadURL] = useState<string>('');
  const [releaseNotes, setReleaseNotes] = useState<string>('');

  // Get current app version - with retry logic for Android WebView
  useEffect(() => {
    const getVersion = async () => {
      try {
        const win = window as any;
        
        // Try multiple times with delay to handle WebView initialization timing
        for (let attempt = 0; attempt < 3; attempt++) {
          if (win.appVersion) {
            console.log('[AutoUpdateChecker] Version from window.appVersion:', win.appVersion);
            setCurrentVersion(win.appVersion);
            sessionStorage.setItem('appVersion', win.appVersion);
            return;
          }
          
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // Fallback to meta tag
        const metaVersion = document.querySelector('meta[name="app-version"]')?.getAttribute('content');
        if (metaVersion) {
          setCurrentVersion(metaVersion);
          sessionStorage.setItem('appVersion', metaVersion);
          return;
        }
        
        // Check if version changed since last session
        const lastVersion = sessionStorage.getItem('appVersion');
        if (lastVersion) {
          setCurrentVersion(lastVersion);
        } else {
          setCurrentVersion('1.0.0');
        }
      } catch (err) {
        console.error('[AutoUpdateChecker] Error getting version:', err);
        setCurrentVersion('1.0.0');
      }
    };
    
    if (isNative) {
      getVersion();
    }
  }, [isNative]);

  // Fetch latest version from Firestore (Spark plan compatible)
  const fetchLatestVersion = useCallback(async (): Promise<VersionInfo | null> => {
    try {
      console.log('[AutoUpdateChecker] Fetching version from Firestore...');
      
      const docRef = doc(firestore, 'app_config', 'version');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as VersionInfo;
        console.log('[AutoUpdateChecker] Firestore version:', data.version);
        return data;
      }
      
      console.log('[AutoUpdateChecker] No Firestore version document found');
      return null;
    } catch (err) {
      console.error('[AutoUpdateChecker] Failed to fetch Firestore version:', err);
      return null;
    }
  }, []);

  // Check for updates
  const checkForUpdates = useCallback(async (silent = false) => {
    if (!isNative) return;
    
    setIsChecking(true);
    setError(null);
    
    try {
      console.log('[AutoUpdateChecker] Checking for updates...');
      
      // Fetch latest version from Firestore
      const versionInfo = await fetchLatestVersion();
      
      if (versionInfo && versionInfo.version) {
        const version = versionInfo.version.replace(/^v/, '');
        setServerVersion(version);
        setDownloadURL(versionInfo.downloadURL);
        setReleaseNotes(versionInfo.releaseNotes || 'New version available');
        
        // Compare versions
        const appVersion = currentVersion.replace(/^v/, '');
        const hasUpdate = version !== appVersion;
        
        console.log('[AutoUpdateChecker] Current:', appVersion, 'Server:', version, 'Update available:', hasUpdate);
        
        if (hasUpdate) {
          setUpdateAvailable(true);
          if (autoDownload) {
            console.log('[AutoUpdateChecker] Auto-downloading update...');
            handleDownload();
          } else if (!silent) {
            setShowDialog(true);
          }
        } else {
          setUpdateAvailable(false);
        }
      } else {
        console.log('[AutoUpdateChecker] No version info in Firestore');
        setUpdateAvailable(false);
      }

      setLastCheck(Date.now());
      
    } catch (err: any) {
      console.error('[AutoUpdateChecker] Error checking for updates:', err);
      setError(err?.message || 'Failed to check for updates');
    } finally {
      setIsChecking(false);
    }
  }, [isNative, currentVersion, autoDownload, fetchLatestVersion]);

  // Auto-check on mount
  useEffect(() => {
    if (checkOnMount && isNative) {
      const shouldCheck = Date.now() - lastCheck > checkInterval;
      if (shouldCheck) {
        const timer = setTimeout(() => {
          checkForUpdates(true); 
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [checkOnMount, isNative, checkInterval, lastCheck, checkForUpdates]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!downloadURL) {
      setError('No download URL available');
      return;
    }
    setIsDownloading(true);
    // Explicitly skipping SHA verification as requested
    downloadUpdate(downloadURL, '');
  }, [downloadURL, downloadUpdate]);

  // Close dialog
  const handleDismiss = () => {
    setShowDialog(false);
  };

  if (!isNative) {
    return null;
  }

  const isSuccess = updateStatus?.includes('success');
  const isError = updateStatus?.includes('error') || error;

  return (
    <>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-none shadow-2xl">
          <DialogHeader className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <DialogTitle className="text-2xl font-black tracking-tight">
                Update Available!
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground font-medium">
                A new version of the app is ready to install
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center px-4 py-2 bg-muted/20 rounded-xl">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Current</p>
                <p className="font-black text-lg">v{currentVersion}</p>
              </div>
              <div className="text-primary">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
              <div className="text-center px-4 py-2 bg-primary/10 rounded-xl border border-primary/20">
                <p className="text-[10px] font-black uppercase text-primary tracking-widest">New</p>
                <p className="font-black text-lg text-primary">v{serverVersion}</p>
              </div>
            </div>

            <div className="p-4 bg-muted/20 rounded-2xl border border-border/50">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">What's New</p>
              <p className="text-sm font-medium">{releaseNotes}</p>
            </div>

            {isDownloading && updateProgress > 0 && updateProgress < 100 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <span>Downloading Update</span>
                  <span>{updateProgress}%</span>
                </div>
                <Progress value={updateProgress} className="h-2" />
              </div>
            )}

            {updateStatus && (
              <div className={`p-4 rounded-2xl flex items-start gap-3 ${
                isSuccess ? 'bg-emerald-500/10 border border-emerald-500/20' : 
                isError ? 'bg-rose-500/10 border border-rose-500/20' : 
                'bg-primary/5 border border-primary/10'
              }`}>
                {isSuccess ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : isError ? (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <Loader2 className="w-5 h-5 text-primary shrink-0 mt-0.5 animate-spin" />
                )}
                <p className={`text-sm font-medium ${
                  isSuccess ? 'text-emerald-700' : 
                  isError ? 'text-rose-700' : 
                  'text-foreground'
                }`}>
                  {updateStatus}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-3 sm:flex-col">
            <Button
              onClick={() => handleDownload()}
              disabled={isDownloading || isSuccess}
              className="w-full h-14 rounded-2xl font-black text-base gap-2 shadow-lg shadow-primary/20"
            >
              {isDownloading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              {isDownloading ? 'Downloading...' : 'Download & Install Now'}
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={handleDismiss}
              disabled={isDownloading}
              className="w-full h-12 rounded-2xl font-bold gap-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
              Remind Me Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AutoUpdateChecker;
