'use client';

import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  signInAnonymously,
  User
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldAlert, CheckCircle2, LogOut, Info } from 'lucide-react';
import { firebaseConfig } from '@/firebase/config';

// Self-contained initialization for testing
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Navigation path helper - avoids JSX parsing issues with > characters
const getNavPath = () => "Firebase Console > Auth > Settings > Authorized Domains";

export default function TestAuthPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hostname, setHostname] = useState("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHostname(window.location.hostname);
    }
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Popup Error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError(`Unauthorized Domain: ${hostname}. Please add this domain to the Firebase Console Authorized Domains list.`);
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError(`Auth Error: ${err.message} (${err.code})`);
      }
    }
  };

  const handleAnonLogin = async () => {
    setError(null);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      setError(`Anonymous Login Error: ${err.message} (${err.code})`);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const navPath = getNavPath();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <Card className="max-w-xl w-full border-none shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-primary/5 p-8 border-b">
          <CardTitle className="font-black text-2xl">Auth Diagnostic Center</CardTitle>
          <CardDescription>Verify Firebase connectivity and domain authorization via Popup.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="p-5 bg-slate-100/50 rounded-2xl space-y-3 border border-slate-200">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-500 uppercase tracking-widest font-bold">Current Hostname</span>
              <span className="font-black text-primary bg-white px-2 py-1 rounded border shadow-sm">{hostname}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-500 uppercase tracking-widest font-bold">Connection Status</span>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <Badge variant={user ? "default" : "secondary"} className="font-black rounded-lg">
                  {user ? "Authenticated" : "Unauthenticated"}
                </Badge>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="rounded-2xl border-2">
              <ShieldAlert className="h-5 w-5" />
              <AlertTitle className="font-black">Configuration Issue Detected</AlertTitle>
              <AlertDescription className="text-xs font-medium space-y-2">
                <p className="break-all">{error}</p>
                {error.includes('Unauthorized Domain') && (
                  <div className="mt-4 p-4 bg-white/10 rounded-xl border border-white/20">
                    <p className="font-black mb-1">REQUIRED ACTION:</p>
                    <p>{"Go to " + navPath + " and add the hostname: " + hostname}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-5 bg-white border-2 rounded-2xl shadow-sm">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center font-black text-xl text-primary border-2 border-primary/20">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-lg text-slate-800 truncate">{user.displayName || "Guest Educator"}</p>
                  <p className="text-xs text-slate-500 font-bold truncate">{user.email || "No email provider"}</p>
                </div>
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <Button variant="outline" className="w-full h-14 rounded-2xl font-black gap-2 shadow-sm border-2" onClick={handleLogout}>
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <Button onClick={handleGoogleLogin} className="h-16 font-black gap-3 rounded-2xl shadow-lg shadow-primary/20 transition-transform active:scale-95 text-lg">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google Popup Sign In
              </Button>
              <Button variant="outline" onClick={handleAnonLogin} className="h-16 font-black rounded-2xl border-2 text-lg">
                Guest / Demo Login
              </Button>
            </div>
          )}

          <div className="pt-6 border-t text-[11px] text-slate-400 space-y-3 font-medium">
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[9px]">
              <Info className="w-3.5 h-3.5" /> 
              Popup Troubleshooting
            </div>
            <p>1. If clicking does nothing, check if your browser blocked the popup (icon in address bar).</p>
            <p>2. Ensure your domain is added to <strong>Authorized Domains</strong> in the Firebase Console.</p>
            <p>3. If using an incognito window, ensure third-party cookies are allowed.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
