'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSelfUpdate, useIsNativeWebView } from '@/components/webview-bridge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Smartphone, Download, CheckCircle2, AlertCircle, RefreshCw, Loader2, Info } from 'lucide-react';
// GitHub repository configuration
const GITHUB_OWNER = 'martincajurao';
const GITHUB_REPO = 'LET';

// Fetch latest release from GitHub API
const fetchLatestRelease = async (): Promise<{ version: string; downloadURL: string; sha256?: string; releaseNotes: string } | null> => {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    const release = await response.json();

    // Find APK asset
    const apkAsset = release.assets.find((asset: any) =>
      asset.name.toLowerCase().endsWith('.apk')
    );

    if (!apkAsset) {
      throw new Error('No APK asset found in latest release');
    }

    return {
      version: release.tag_name.replace(/^v/, ''),
      downloadURL: apkAsset.browser_download_url,
      sha256: '', // GitHub doesn't provide SHA256 in API, skip verification
      releaseNotes: release.body || 'New version available'
    };
  } catch (error) {
    console.error('Failed to fetch latest release:', error);
    return null;
  }
};

interface ApkInfo {
  version: string;
  downloadURL: string;
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  sha256?: string;
  message?: string;
}

export function SelfUpdate() {
  const isNative = useIsNativeWebView();
  const { downloadUpdate, updateProgress, updateStatus, setUpdateStatus } = useSelfUpdate();

  const [apkInfo, setApkInfo] = useState<ApkInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');
  const [error, setError] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Fetch current APK info from GitHub API
  const fetchApkInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUpdateStatus('');

    try {
      console.log('[SelfUpdate] Fetching latest release from GitHub API');

      // Fetch latest release from GitHub
      const release = await fetchLatestRelease();

      if (!release) {
        throw new Error('Failed to fetch latest release from GitHub');
      }

      const data: ApkInfo = {
        version: release.version,
        downloadURL: release.downloadURL,
        sha256: release.sha256,
        message: release.releaseNotes
      };

      console.log('[SelfUpdate] GitHub release:', data);

      setApkInfo(data);

      // Check if update is available (compare versions)
      if (currentVersion) {
        const serverVersion = data.version.toString().replace(/^/, '');
        const appVersion = currentVersion.toString().replace(/^/, '');
        const hasUpdate = serverVersion !== appVersion;
        setUpdateAvailable(hasUpdate);

        if (hasUpdate) {
          setUpdateStatus(`Update available: v${data.version}`);
        } else {
          setUpdateStatus('You have the latest version');
        }
      }

    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to check for updates';
      setError(errorMsg);
      console.error('[SelfUpdate] Error:', err);
    } finally {
      setLoading(false);
    }


  }, [currentVersion]);

  // Get current app version from Capacitor or window
  useEffect(() => {
    const getVersion = async () => {
      try {
        // Try to get version from window object (set by native app)
        const win = window as any;

        // Check if native app injected version info
        if (win.appVersion) {
          console.log('[SelfUpdate] App version from native:', win.appVersion);
          setCurrentVersion(win.appVersion);
          return;
        }

        // Fallback: try to get from meta tag or default

        const metaVersion = document.querySelector('meta[name="app-version"]')?.getAttribute('content');
        const version = metaVersion || '1.0.0';
        console.log('[SelfUpdate] App version from meta/default:', version);
        setCurrentVersion(version);
      } catch (err) {
        console.log('[SelfUpdate] Could not get app version:', err);
        setCurrentVersion('1.0.0');
      }
    };

    getVersion();
  }, []);

  // Initial check on mount
  useEffect(() => {
    if (isNative) {
      fetchApkInfo();
    }
  }, [isNative, fetchApkInfo]);

  const handleCheckUpdate = () => {
    fetchApkInfo();
  };

  const handleDownloadUpdate = () => {
    console.log('[SelfUpdate] Starting download:', apkInfo?.downloadURL);

    // Check if we have a download URL
    let downloadUrl = apkInfo?.downloadURL;

    // If no direct URL but we have a Google Drive file ID, construct the URL
    if (!downloadUrl && apkInfo?.fileId) {
      downloadUrl = `https://drive.google.com/uc?export=download&id=${apkInfo.fileId}`;
    }

    // If still no URL, try the Firebase download function
    if (!downloadUrl) {
      const win = window as any;
      if (win?.android) {
        // Use direct function URL for Android
        downloadUrl = 'https://us-central1-letpractice.cloudfunctions.net/download';
      }
    }

    if (downloadUrl) {
      const sha256 = apkInfo?.sha256 || '';
      downloadUpdate(downloadUrl, sha256);
    } else {
      setError('No download URL available. Please contact support.');
    }
  };

  // Update app version when update is successful
  useEffect(() => {
    if (updateStatus.includes('success') && apkInfo?.version) {
      console.log('[SelfUpdate] Update successful, updating app version to:', apkInfo.version);
      setCurrentVersion(apkInfo.version);
      // Also update the window object if it exists
      const win = window as any;
      if (win) {
        win.appVersion = apkInfo.version;
      }
    }
  }, [updateStatus, apkInfo?.version]);

  // If not in native WebView, don't show the update component
  if (!isNative) {
    return null;
  }

  const isDownloading = updateProgress > 0 && updateProgress < 100;
  const isSuccess = updateStatus.includes('success');
  const isError = updateStatus.includes('error') || error;

  return (
    <Card className="android-surface rounded-[2rem] border-none shadow-xl overflow-hidden">
      <CardHeader className="p-6 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-black tracking-tight">App Update</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
                Native Android Client
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="font-black text-[10px] uppercase tracking-wider">
            v{currentVersion}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/50">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Server Version</p>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : apkInfo?.version ? (
              <p className="font-black text-lg">v{apkInfo.version}</p>
            ) : (
              <p className="text-sm text-muted-foreground font-medium">Not available</p>
            )}
          </div>

          {updateAvailable && !loading && (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black text-[10px] uppercase">
              Update Available
            </Badge>
          )}

          {!updateAvailable && !loading && apkInfo?.version && (
            <Badge variant="outline" className="font-bold text-[10px] uppercase border-primary/20">
              Up to Date
            </Badge>
          )}

          {!updateAvailable && !loading && !apkInfo?.version && (
            <Badge variant="outline" className="font-bold text-[10px] uppercase border-muted-foreground/30 text-muted-foreground">
              No Server Update
            </Badge>
          )}

        </div>

        {/* Download Progress */}
        {isDownloading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <span>Download Progress</span>
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

        {/* Error Message */}
        {error && !updateStatus && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {/* GitHub API Notice */}
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-700">GitHub API Mode</p>
            <p className="text-xs text-blue-600/80">
              Update version is fetched from GitHub Releases API. SHA256 verification is skipped.
            </p>
          </div>
        </div>

        {/* APK Info */}
        {apkInfo?.fileName && (
          <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> {apkInfo.fileName}
            </span>
            {apkInfo.fileSize && (
              <>
                <div className="w-1 h-1 bg-border rounded-full" />
                <span>{(apkInfo.fileSize / 1024 / 1024).toFixed(2)} MB</span>
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {updateAvailable && apkInfo?.downloadURL && (
            <Button
              onClick={handleDownloadUpdate}
              disabled={isDownloading}
              className="w-full h-14 rounded-2xl font-black text-base gap-2 shadow-lg shadow-primary/20"
            >
              {isDownloading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              {isDownloading ? 'Downloading...' : 'Download & Install Update'}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleCheckUpdate}
            disabled={loading || isDownloading}
            className="w-full h-12 rounded-2xl font-bold gap-2 border-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {loading ? 'Checking...' : 'Check for Updates'}
          </Button>
        </div>

        {/* Security Note */}
        <p className="text-[9px] font-medium text-muted-foreground text-center leading-relaxed">
          Updates are downloaded directly from GitHub Releases.
          The app will prompt for installation after download.
        </p>
      </CardContent>
    </Card>
  );
}

export default SelfUpdate;
