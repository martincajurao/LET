'use client';

import React, { useState } from 'react';
import { useUser, useFirestore } from '@/firebase/index';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from 'next/link';
import { Coins, GraduationCap, ChevronDown, User, History, LogOut, Zap, Play, Loader2, CheckCircle2, Moon, Sun } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/use-theme';

export function Navbar() {
  const { user, logout, loginWithGoogle, loginWithFacebook } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isDark, toggleDarkMode } = useTheme();
  const [showAdModal, setShowAdModal] = useState(false);
  const [watchingAd, setWatchingAd] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  const GoogleIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );

  const FacebookIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );

  const handleWatchAd = async () => {
    if (!user || !firestore) return;
    setWatchingAd(true);
    setTimeout(async () => {
      try {
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, {
          credits: increment(3),
          dailyAdCount: increment(1)
        });
        toast({ title: "Ad Complete", description: "You earned +3 AI Credits!" });
        setShowAdModal(false);
      } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "Failed to grant reward." });
      } finally {
        setWatchingAd(false);
      }
    }, 3000);
  };

  return (
<nav className="flex items-center justify-between px-6 py-4 bg-card/80 backdrop-blur-md border-b sticky top-0 z-[100] shadow-sm">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <GraduationCap className="text-primary-foreground w-6 h-6" />
          </div>
          <span className="hidden md:inline">LET's Prep</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {!user ? (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="w-10 h-10 rounded-full bg-transparent border-border hover:bg-muted"
              onClick={() => loginWithGoogle?.()}
            >
              <GoogleIcon />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="w-10 h-10 rounded-full bg-transparent border-border hover:bg-muted"
              onClick={() => loginWithFacebook?.()}
            >
              <FacebookIcon />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="w-10 h-10 rounded-full bg-transparent border-border hover:bg-muted"
              onClick={toggleDarkMode}
            >
              {isDark ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-foreground" />}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-2xl border border-border cursor-pointer hover:bg-accent transition-colors" onClick={() => setShowAdModal(true)}>
              <Coins className="w-4 h-4 text-yellow-500 fill-current" />
              <div className="flex flex-col">
                <span className="text-sm font-black text-foreground leading-none">{user.credits ?? 0}</span>
                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Credits</span>
              </div>
            </div>

            {!user.isPro && (
              <Button size="sm" variant="outline" className="hidden md:flex border-primary text-primary font-black rounded-xl gap-2 hover:bg-primary/5" onClick={() => setShowProModal(true)}>
                <Zap className="w-3 h-3 fill-current" /> GO PRO
              </Button>
            )}

            <Button 
              variant="outline" 
              size="icon" 
              className="w-10 h-10 rounded-full bg-transparent border-border hover:bg-muted"
              onClick={toggleDarkMode}
            >
              {isDark ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-foreground" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-muted transition-all outline-none">
                  <Avatar className="w-10 h-10 border-2 border-background shadow-md">
                    {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />}
                    <AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary">
                      {user.displayName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mt-2 rounded-2xl border bg-card shadow-2xl" align="end">
                <DropdownMenuLabel className="font-black text-xs uppercase tracking-widest text-muted-foreground p-4 pb-2">Account</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl"><User className="w-4 h-4 text-primary" /> Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile?tab=history" className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl"><History className="w-4 h-4 text-secondary" /> History</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="mx-2" />
                <DropdownMenuItem onClick={logout} className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl text-destructive hover:text-destructive"><LogOut className="w-4 h-4" /> Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      <Dialog open={showAdModal} onOpenChange={setShowAdModal}>
        <DialogContent className="rounded-[2rem] bg-card">
          <DialogHeader>
            <DialogTitle className="font-black">Earn AI Credits</DialogTitle>
            <DialogDescription>Watch a short promotional video to earn +3 credits for AI explanations.</DialogDescription>
          </DialogHeader>
          <div className="py-8 flex flex-col items-center justify-center bg-muted rounded-2xl border border-dashed">
            <Play className="w-12 h-12 text-primary opacity-40 mb-4" />
            <p className="text-xs font-bold text-muted-foreground">Daily limit: {user?.dailyAdCount || 0} / 5 ads</p>
          </div>
          <DialogFooter>
            <Button className="w-full font-black rounded-xl h-12" onClick={handleWatchAd} disabled={watchingAd || (user?.dailyAdCount || 0) >= 5}>
              {watchingAd ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {watchingAd ? "Streaming Ad..." : "Watch and Earn +3 Credits"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showProModal} onOpenChange={setShowProModal}>
        <DialogContent className="rounded-[2.5rem] max-w-md bg-card">
          <DialogHeader className="pt-8">
            <DialogTitle className="text-center text-3xl font-black">Go Professional</DialogTitle>
            <DialogDescription className="text-center">Unlock the full power of AI for your board preparation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-6">
            {[
              "Unlimited AI explanations",
              "Instant performance analytics",
              "No promotional ads",
              "Priority AI access",
              "Special Profile badge"
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-3 bg-primary/5 rounded-xl border border-primary/10">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold text-foreground">{benefit}</span>
              </div>
            ))}
          </div>
          <DialogFooter className="pb-8">
            <Button className="w-full h-14 rounded-2xl font-black text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20">
              Upgrade to Pro — $9.99/mo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </nav>
  );
}