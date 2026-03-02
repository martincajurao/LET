'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSelfUpdate, useIsNativeWebView } from '@/components/webview-bridge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Smartphone, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Loader2, 
  Info, 
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

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
    try {
      const release = await fetchLatestRelease();
      if (!release) throw new Error('Failed to fetch release metadata');
      
      const data: ApkInfo = {
        version: release.version,
        downloadURL: release.downloadURL,
        message: release.releaseNotes
      };
      
      setApkInfo(data);
      const serverVersionStr = data.version.toString();
      const appVersionStr = currentVersion.toString();
      const hasUpdate = serverVersionStr !== appVersionStr;
      
      setUpdateAvailable(hasUpdate);
      if (hasUpdate) setUpdateStatus(`Update v${data.version} is ready for installation.`);
      else setUpdateStatus('Your application is running the latest professional version.');
    } catch (err: any) {
      setError(err?.message || 'Update check failed');
      setUpdateStatus('Check failed. Ensure you have an active internet connection.');
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
    if (apkInfo?.downloadURL) {
      // Explicitly skipping SHA verification as requested
      downloadUpdate(apkInfo.downloadURL, '');
    } else {
      setError('Download trace unavailable. Please check again.');
    }
  };

  const isDownloading = updateProgress > 0 && updateProgress < 100;
  const isSuccess = updateStatus.toLowerCase().includes('success') || updateStatus.toLowerCase().includes('complete');
  const isError = updateStatus.toLowerCase().includes('error') || !!error;

  return (
    <div className="space-y-6">
      {/* Environment Status Notice */}
      {!isNative && (
        <div className="p-4 bg-blue-500/10 border-2 border-dashed border-blue-500/20 rounded-2xl flex items-start gap-3 mb-4">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider leading-relaxed">
            WEB PREVIEW: Self-update functions are restricted to the native Android environment. This section would manage binary traces in the app wrapper.
          </p>
        </div>
      )}

      {/* Version Card */}
      <div className="p-6 bg-muted/20 rounded-[2.25rem] border-2 border-dashed border-border/50 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner">
            <Smartphone className="w-7 h-7 text-primary" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">Active Binary</p>
            <p className="text-2xl font-black text-foreground leading-none">v{currentVersion}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Badge variant="outline" className={cn(
            "flex-1 sm:flex-none justify-center font-black text-[10px] uppercase tracking-widest px-4 h-9 rounded-xl border-2 transition-all",
            updateAvailable ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 animate-pulse" : "bg-primary/5 text-primary border-primary/20"
          )}>
            {loading ? "Checking Vault..." : updateAvailable ? "Update Ready" : "System Up to Date"}
          </Badge>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchApkInfo} 
            disabled={loading || isDownloading} 
            className="h-10 w-10 rounded-xl hover:bg-primary/5 shrink-0"
          >
            <RefreshCw className={cn("w-5 h-5 text-primary", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Progress & Status */}
      <AnimatePresence mode="wait">
        {(isDownloading || updateStatus) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {isDownloading && (
              <div className="space-y-2 p-5 bg-primary/5 rounded-[1.75rem] border border-primary/10 shadow-inner">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-primary">
                  <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Downloading Trace</span>
                  <span>{updateProgress}%</span>
                </div>
                <Progress value={updateProgress} className="h-2 rounded-full" />
              </div>
            )}

            <div className={cn(
              "p-5 rounded-[1.75rem] flex items-start gap-4 border-2 transition-all shadow-sm",
              isSuccess ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700" : 
              isError ? "bg-rose-500/10 border-rose-500/20 text-rose-700" : 
              "bg-primary/5 border-primary/10 text-primary"
            )}>
              {isSuccess ? <ShieldCheck className="w-6 h-6 shrink-0" /> : 
               isError ? <AlertCircle className="w-6 h-6 shrink-0" /> : 
               <Info className="w-6 h-6 shrink-0 opacity-60" />}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Network Status</p>
                <p className="text-xs font-bold leading-relaxed">{updateStatus}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="grid gap-3">
        {updateAvailable && apkInfo?.downloadURL && (
          <Button 
            onClick={handleDownloadUpdate} 
            disabled={isDownloading || !isNative} 
            className="w-full h-16 rounded-[1.75rem] font-black text-lg gap-3 shadow-2xl shadow-primary/30 active:scale-95 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Download className="w-6 h-6" />
            Launch Secure Update
            <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
          </Button>
        )}
        
        <div className="p-5 bg-yellow-500/5 rounded-[1.75rem] border-2 border-dashed border-yellow-500/20 flex items-start gap-4 shadow-inner">
          <Sparkles className="w-6 h-6 text-yellow-600 shrink-0 mt-0.5 animate-sparkle" />
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-yellow-700 tracking-widest">Maintenance Protocol</p>
            <p className="text-[11px] font-medium text-yellow-800/80 leading-relaxed uppercase tracking-tight">
              Updates are distributed via the professional GitHub releases vault. Ensure "Install Unknown Apps" is enabled for your mobile browser if prompted during installation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SelfUpdate;