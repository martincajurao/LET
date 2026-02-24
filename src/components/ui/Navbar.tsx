
'use client';

import React, { useState } from 'react';
import { useUser, useFirestore } from '@/firebase/index';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from 'next/link';
import { 
  Coins, 
  GraduationCap, 
  ChevronDown, 
  User, 
  History, 
  LogOut, 
  Zap, 
  Play, 
  Loader2, 
  CheckCircle2, 
  Moon, 
  Sun, 
  Bell, 
  Settings, 
  Facebook,
  ShieldCheck,
  Menu,
  Home,
  ListTodo,
  Trophy
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { user, logout, loginWithGoogle, loginWithFacebook, bypassLogin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isDark, toggleDarkMode } = useTheme();
  const [showAdModal, setShowAdModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [watchingAd, setWatchingAd] = useState(false);

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
        toast({ title: "Reward Granted", description: "+3 Credits added to your account." });
        setShowAdModal(false);
      } catch (e) {
        toast({ variant: "destructive", title: "Sync Failed", description: "Could not grant reward." });
      } finally {
        setWatchingAd(false);
      }
    }, 3000);
  };

  const navItems = [
    { label: 'Home', icon: <Home className="w-4 h-4" />, href: '/' },
    { label: 'Daily Tasks', icon: <ListTodo className="w-4 h-4" />, href: '/tasks' },
    { label: 'Global Arena', icon: <Trophy className="w-4 h-4" />, href: '/events' },
    { label: 'Settings', icon: <Settings className="w-4 h-4" />, href: '/profile?tab=account' },
  ];

  return (
    <>
      <nav className="h-16 flex items-center justify-between px-4 md:px-8 bg-background/80 backdrop-blur-xl border-b sticky top-0 z-[100] transition-all duration-300 shadow-sm">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-primary rounded-[1rem] flex items-center justify-center shadow-lg shadow-primary/25 transition-transform group-active:scale-95">
              <GraduationCap className="text-primary-foreground w-6 h-6" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-black tracking-tight text-foreground block leading-none">LET's Prep</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Professional Simulation</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Desktop Navigation Menu Icon */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-muted">
                    <Menu className="w-5 h-5 text-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 mt-2 rounded-2xl border bg-card shadow-2xl p-2" align="end">
                  <DropdownMenuLabel className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-3 py-2">Quick Navigation</DropdownMenuLabel>
                  {navItems.map((item) => (
                    <DropdownMenuItem key={item.label} asChild>
                      <Link href={item.href} className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl hover:bg-muted transition-colors">
                        <div className="text-primary">{item.icon}</div>
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-muted" onClick={toggleDarkMode}>
              {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </Button>
            
            {user && (
              <div 
                className="flex items-center gap-2 bg-muted/40 hover:bg-accent/10 px-3 sm:px-4 py-2 rounded-2xl border border-border/50 cursor-pointer transition-all active:scale-95 group"
                onClick={() => setShowAdModal(true)}
              >
                <div className="w-5 h-5 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Coins className="w-3.5 h-3.5 text-yellow-600 fill-current" />
                </div>
                <span className="text-sm font-black text-foreground">{user.credits ?? 0}</span>
                <Zap className="w-3 h-3 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>

          {!user ? (
            <Button onClick={() => setShowAuthModal(true)} className="font-bold rounded-2xl h-10 px-6 shadow-md shadow-primary/20">Sign In</Button>
          ) : (
            <>
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 relative">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-0.5 rounded-full hover:bg-muted transition-all outline-none focus:ring-2 focus:ring-primary/20">
                    <Avatar className="w-9 h-9 border-2 border-background shadow-md">
                      {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || "User"} />}
                      <AvatarFallback className="text-xs font-black bg-primary/10 text-primary uppercase">
                        {user.displayName?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 mt-2 rounded-2xl border bg-card shadow-2xl p-2" align="end">
                  <div className="p-3 mb-2 bg-muted/30 rounded-xl">
                    <p className="text-sm font-black truncate">{user.displayName}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">{user.email}</p>
                  </div>
                  <DropdownMenuLabel className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-3 py-2">Simulation Hub</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl hover:bg-muted transition-colors">
                      <User className="w-4 h-4 text-primary" /> Profile Overview
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile?tab=history" className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl hover:bg-muted transition-colors">
                      <History className="w-4 h-4 text-emerald-500" /> Analysis Vault
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile?tab=account" className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl hover:bg-muted transition-colors">
                      <Settings className="w-4 h-4 text-slate-500" /> Account Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-2 bg-border/50" />
                  <DropdownMenuItem onClick={logout} className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl text-destructive hover:bg-destructive/10 transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </nav>

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-8 max-w-sm">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black">Welcome to LET's Prep</DialogTitle>
            <DialogDescription className="text-muted-foreground">Choose your preferred sign-in method to continue your professional journey.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-6">
            <Button onClick={async () => { await loginWithGoogle(); setShowAuthModal(false); }} className="h-14 rounded-2xl font-bold gap-3 shadow-lg">
              <Zap className="w-5 h-5 fill-current" /> Continue with Google
            </Button>
            <Button onClick={async () => { await loginWithFacebook(); setShowAuthModal(false); }} className="h-14 rounded-2xl font-bold gap-3 shadow-lg bg-[#1877F2] text-white hover:bg-[#1877F2]/90 border-none">
              <Facebook className="w-5 h-5 fill-current" /> Continue with Facebook
            </Button>
            <Button variant="outline" onClick={() => { bypassLogin(); setShowAuthModal(false); }} className="h-14 rounded-2xl font-bold border-2">
              Guest Simulation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdModal} onOpenChange={setShowAdModal}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl max-w-[380px]">
          <DialogHeader className="space-y-3">
            <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-2">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black text-center">Refill AI Credits</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground font-medium">
              Watch a quick tutorial or educational promo to earn <span className="text-primary font-black">+3 Credits</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-10 flex flex-col items-center justify-center bg-muted/30 rounded-[2rem] border-2 border-dashed border-border/50">
            <Play className="w-14 h-14 text-primary opacity-20 mb-4" />
            <div className="flex flex-col items-center">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Daily Allowance</p>
              <p className="text-lg font-black text-foreground">{user?.dailyAdCount || 0} / 5</p>
            </div>
          </div>
          <DialogFooter className="flex-col gap-3">
            <Button 
              className="w-full h-14 font-black rounded-2xl text-lg gap-3 shadow-lg shadow-primary/30 active:scale-[0.98] transition-all" 
              onClick={handleWatchAd} 
              disabled={watchingAd || (user?.dailyAdCount || 0) >= 5}
            >
              {watchingAd ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6 fill-current" />}
              {watchingAd ? "Connecting..." : "Watch & Earn +3"}
            </Button>
            <Button variant="ghost" className="w-full font-bold text-muted-foreground" onClick={() => setShowAdModal(false)}>Maybe Later</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
