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

// Firestore collection for version info
import { doc, getDoc } from 'firebase/firestore';

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
  const [latestRelease, setLatestRelease] = useState<GitHubRelease | null>(null);
  const [serverVersion, setServerVersion] = useState<string>('');
  const [downloadURL, setDownloadURL] = useState<string>('');
  const [releaseNotes, setReleaseNotes] = useState<string>('');

  // Get current app version
  useEffect(() => {
    const getVersion = async () => {
      try {
        const win = window as any;
        if (win.appVersion) {
          setCurrentVersion(win.appVersion);
          return;
        }
        
        const metaVersion = document.querySelector('meta[name="app-version"]')?.getAttribute('content');
        setCurrentVersion(metaVersion || '1.0.0');
      } catch (err) {
        setCurrentVersion('1.0.0');
      }
    };
    
    if (isNative) {
      getVersion();
    }
  }, [isNative]);

  // Fetch latest release from GitHub API
  const fetchLatestRelease = useCallback(async (): Promise<GitHubRelease | null> => {
    try {
      console.log('[AutoUpdateChecker] Fetching latest release from GitHub...');
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'LET-App'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data: GitHubRelease = await response.json();
      console.log('[AutoUpdateChecker] Latest release:', data.tag_name, data.name);
      return data;
    } catch (err) {
      console.error('[AutoUpdateChecker] Failed to fetch GitHub release:', err);
      return null;
    }
  }, []);

  // Find APK asset in release
  const findApkAsset = useCallback((release: GitHubRelease) => {
    return release.assets.find(asset => 
      asset.name.toLowerCase().endsWith('.apk')
    );
  }, []);

  // Check for updates
  const checkForUpdates = useCallback(async (silent = false) => {
    if (!isNative) return;
    
    setIsChecking(true);
    setError(null);
    
    try {
      console.log('[AutoUpdateChecker] Checking for updates...');
      
      // Fetch latest release from GitHub
      const release = await fetchLatestRelease();
      
      if (release) {
        setLatestRelease(release);
        
        // Extract version from tag
        const version = release.tag_name.replace(/^v/, '');
        setServerVersion(version);
        
        // Find APK download URL
        const apkAsset = findApkAsset(release);
        if (apkAsset) {
          setDownloadURL(apkAsset.browser_download_url);
          console.log('[AutoUpdateChecker] APK found:', apkAsset.name);
        } else {
          // Fallback to constructed URL
          const url = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${release.tag_name}/let.apk`;
          setDownloadURL(url);
          console.log('[AutoUpdateChecker] Using fallback URL:', url);
        }
        
        // Set release notes
        setReleaseNotes(release.body || release.name || 'New version available');
        
        // Compare versions
        const appVersion = currentVersion.replace(/^v/, '');
        const hasUpdate = version !== appVersion;
        
        console.log('[AutoUpdateChecker] Current:', appVersion, 'Server:', version, 'Update available:', hasUpdate);
        
        if (hasUpdate) {
          setUpdateAvailable(true);
          if (autoDownload && downloadURL) {
            // Auto-download without showing dialog
            console.log('[AutoUpdateChecker] Auto-downloading update...');
            handleDownload();
          } else if (!silent) {
            setShowDialog(true);
          }
        } else {
          setUpdateAvailable(false);
        }
      } else {
        // Fallback to static config if GitHub API fails
        console.log('[AutoUpdateChecker] Using fallback static config');
        const serverVer = '2.0.0';
        const appVersion = currentVersion.replace(/^v/, '');
        const hasUpdate = serverVer !== appVersion;
        
        if (hasUpdate) {
          setUpdateAvailable(true);
          setServerVersion(serverVer);
          setDownloadURL('https://github.com/martincajurao/LET/releases/download/V2/let.apk');
          setReleaseNotes('Version 2 - New features and improvements');
          
          if (autoDownload) {
            handleDownload();
          } else if (!silent) {
            setShowDialog(true);
          }
        } else {
          setUpdateAvailable(false);
        }
      }

      
      setLastCheck(Date.now());
      
    } catch (err: any) {
      console.error('[AutoUpdateChecker] Error checking for updates:', err);
      setError(err?.message || 'Failed to check for updates');
    } finally {
      setIsChecking(false);
    }
  }, [isNative, currentVersion, autoDownload, downloadURL, fetchLatestRelease, findApkAsset]);

  // Auto-check on mount
  useEffect(() => {
    if (checkOnMount && isNative) {
      // Check if enough time has passed since last check
      const shouldCheck = Date.now() - lastCheck > checkInterval;
      if (shouldCheck) {
        // Small delay to let the app fully load
        const timer = setTimeout(() => {
          checkForUpdates(true); // Silent check - only show dialog if update available
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
    // SHA256 verification optional - leave empty for GitHub releases
    downloadUpdate(downloadURL, '');
  }, [downloadURL, downloadUpdate]);

  // Close dialog
  const handleDismiss = () => {
    setShowDialog(false);
  };

  // Don't render anything if not in native WebView
  if (!isNative) {
    return null;
  }

  const isSuccess = updateStatus?.includes('success');
  const isError = updateStatus?.includes('error') || error;

  return (
    <>
      {/* Update Available Dialog */}
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
            {/* Version Info */}
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
                <p className="font-black text-lg text-primary">v{serverVersion || latestRelease?.tag_name}</p>
              </div>
            </div>

            {/* Release Notes */}
            <div className="p-4 bg-muted/20 rounded-2xl border border-border/50">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">What's New</p>
              <p className="text-sm font-medium">{releaseNotes}</p>
            </div>

            {/* Download Progress */}
            {isDownloading && updateProgress > 0 && updateProgress < 100 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <span>Downloading Update</span>
                  <span>{updateProgress}%</span>
                </div>
                <Progress value={updateProgress} className="h-2" />
              </div>
            )}

            {/* Status Message */}
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
              onClick={handleDownload}
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
