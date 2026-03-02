'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSelfUpdate, useIsNativeWebView } from '@/components/webview-bridge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Smartphone, Download, CheckCircle2, AlertCircle, RefreshCw, Loader2, Info, Sparkles } from 'lucide-react';

const GITHUB_OWNER = 'martincajurao';
const GITHUB_REPO = 'LET';

const fetchLatestRelease = async (): Promise<{ version: string; downloadURL: string; releaseNotes: string } | null> => {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`);
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
    const release = await response.json();
    const apkAsset = release.assets.find((asset: any) => asset.name.toLowerCase().endsWith('.apk'));
    if (!apkAsset) throw new Error('No APK asset found');
    return {
      version: release.tag_name.replace(/^v/, ''),
      downloadURL: apkAsset.browser_download_url,
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

  const fetchApkInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUpdateStatus('');
    try {
      const release = await fetchLatestRelease();
      if (!release) throw new Error('Failed to fetch release');
      const data: ApkInfo = {
        version: release.version,
        downloadURL: release.downloadURL,
        message: release.releaseNotes
      };
      setApkInfo(data);
      const serverVersion = data.version.toString();
      const appVersion = currentVersion.toString();
      const hasUpdate = serverVersion !== appVersion;
      setUpdateAvailable(hasUpdate);
      if (hasUpdate) setUpdateStatus(`Update v${data.version} ready.`);
      else setUpdateStatus('Latest version active.');
    } catch (err: any) {
      setError(err?.message || 'Update check failed');
    } finally {
      setLoading(false);
    }
  }, [currentVersion, setUpdateStatus]);

  useEffect(() => {
    const getVersion = async () => {
      const win = window as any;
      if (win.appVersion) setCurrentVersion(win.appVersion);
      else {
        const metaVersion = document.querySelector('meta[name="app-version"]')?.getAttribute('content');
        setCurrentVersion(metaVersion || '1.0.0');
      }
    };
    getVersion();
  }, []);

  useEffect(() => {
    if (isNative) fetchApkInfo();
  }, [isNative, fetchApkInfo]);

  const handleDownloadUpdate = () => {
    if (apkInfo?.downloadURL) downloadUpdate(apkInfo.downloadURL, '');
    else setError('Download link unavailable.');
  };

  if (!isNative) return null;

  const isDownloading = updateProgress > 0 && updateProgress < 100;
  const isSuccess = updateStatus.includes('success');
  const isError = updateStatus.includes('error') || error;

  return (
    <div className="space-y-6">
      <div className="p-5 bg-muted/20 rounded-[1.75rem] border-2 border-dashed border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner">
            <Smartphone className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Local Version</p>
            <p className="text-xl font-black">v{currentVersion}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn("font-black text-[10px] uppercase tracking-widest px-3 h-7", updateAvailable ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "border-primary/20 text-primary")}>
            {loading ? "Checking..." : updateAvailable ? "Update Available" : "Up to Date"}
          </Badge>
          <Button variant="ghost" size="icon" onClick={fetchApkInfo} disabled={loading || isDownloading} className="h-10 w-10 rounded-xl hover:bg-primary/5">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {isDownloading && (
        <div className="space-y-2 p-4 bg-primary/5 rounded-2xl border border-primary/10">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary">
            <span>Downloading Trace</span>
            <span>{updateProgress}%</span>
          </div>
          <Progress value={updateProgress} className="h-1.5" />
        </div>
      )}

      <AnimatePresence mode="wait">
        {updateStatus && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("p-4 rounded-2xl flex items-center gap-3 border-2", isSuccess ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700" : isError ? "bg-rose-500/10 border-rose-500/20 text-rose-700" : "bg-primary/5 border-primary/10 text-primary")}>
            {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : isError ? <AlertCircle className="w-5 h-5" /> : <Loader2 className="w-5 h-5 animate-spin" />}
            <p className="text-xs font-bold uppercase tracking-tight">{updateStatus}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-3">
        {updateAvailable && apkInfo?.downloadURL && (
          <Button onClick={handleDownloadUpdate} disabled={isDownloading} className="w-full h-16 rounded-2xl font-black text-lg gap-3 shadow-xl shadow-primary/30 active:scale-95 transition-all group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Download className="w-6 h-6" />
            Launch Secure Update
          </Button>
        )}
        <div className="p-4 bg-yellow-500/5 rounded-2xl border-2 border-dashed border-yellow-500/20 flex items-start gap-3">
          <Info className="w-4 h-4 text-yellow-600 mt-0.5" />
          <p className="text-[10px] font-medium text-yellow-700 leading-relaxed uppercase tracking-wider">
            This action will download the professional Android binary directly from our secure releases vault. Ensure you allow "Unknown Sources" if prompted by the system.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SelfUpdate;
