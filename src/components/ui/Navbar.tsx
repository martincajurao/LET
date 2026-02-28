'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Trophy,
  Crown,
  Shield,
  Star,
  ShieldAlert,
  Smartphone
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/use-theme';
import { useIsMobile } from '@/hooks/use-mobile';
import { nativeAuth } from '@/lib/native-auth';
import { cn } from '@/lib/utils';
import { getRankData, XP_REWARDS, COOLDOWNS, DAILY_AD_LIMIT } from '@/lib/xp-system';
import { NotificationsModal } from './notifications-modal';
import { SelfUpdate } from '@/components/self-update';
import { useRouter } from 'next/navigation';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.18 1-.78 1.85-1.63 2.42v2.01h2.64c1.54-1.42 2.43-3.5 2.43-5.44z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.33C3.99 20.15 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.67H2.18C1.43 9.24 1 10.57 1 12s.43 2.76 1.18 4.33l3.66-2.24z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.85 2.18 7.67l3.66 2.33c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export function Navbar() {
  const { user, loading, logout, loginWithGoogle, loginWithFacebook, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { isDark, toggleDarkMode } = useTheme();
  const isMobile = useIsMobile();
  const [showAdModal, setShowAdModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [watchingAd, setWatchingAd] = useState(false);
  const [verifyingAd, setVerifyingAd] = useState(false);
  const [availableTasksCount, setAvailableTasksCount] = useState(0);
  const [claimableTasksCount, setClaimableTasksCount] = useState(0);

  const rankData = user ? getRankData(user.xp || 0) : null;

  // Use ref to always have latest user data in interval callback
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (!userRef.current) {
      setAvailableTasksCount(0);
      setClaimableTasksCount(0);
      return;
    }

    const calculateAvailable = () => {
      const currentUser = userRef.current;
      if (!currentUser) return;

      const now = Date.now();
      const lastAd = typeof currentUser.lastAdXpTimestamp === 'number' ? currentUser.lastAdXpTimestamp : 0;
      const lastQf = typeof currentUser.lastQuickFireTimestamp === 'number' ? currentUser.lastQuickFireTimestamp : 0;
      
      const adAvailable = lastAd + COOLDOWNS.AD_XP <= now && (currentUser.dailyAdCount || 0) < DAILY_AD_LIMIT;
      const qfAvailable = lastQf + COOLDOWNS.QUICK_FIRE <= now;
      setAvailableTasksCount((adAvailable ? 1 : 0) + (qfAvailable ? 1 : 0));

      let claimableCount = 0;
      const qGoal = currentUser.userTier === 'Platinum' ? 35 : 20;
      if (!currentUser.taskLoginClaimed) claimableCount++;
      if ((currentUser.dailyQuestionsAnswered || 0) >= qGoal && !currentUser.taskQuestionsClaimed) claimableCount++;
      if ((currentUser.dailyTestsFinished || 0) >= 1 && !currentUser.taskMockClaimed) claimableCount++;
      if ((currentUser.mistakesReviewed || 0) >= 10 && !currentUser.taskMistakesClaimed) claimableCount++;
      setClaimableTasksCount(claimableCount);
    };

    calculateAvailable();
    // Update every second for real-time countdown
    const interval = setInterval(calculateAvailable, 1000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) return null;

  const handleWatchAd = async () => {
    if (!user || !firestore) return;
    if ((user.dailyAdCount || 0) >= DAILY_AD_LIMIT) {
      toast({ title: "Daily Limit Reached", description: "You've reached your daily professional allowance.", variant: "destructive" });
      return;
    }
    
    setWatchingAd(true);
    setVerifyingAd(false);

    setTimeout(async () => {
      setVerifyingAd(true);
      setTimeout(async () => {
        try {
          const userRef = doc(firestore, 'users', user.uid);
          await updateDoc(userRef, {
            credits: increment(5),
            xp: increment(XP_REWARDS.AD_WATCH_XP),
            lastAdXpTimestamp: Date.now(),
            dailyAdCount: increment(1)
          });
          // Refresh user data to ensure UI updates properly
          await refreshUser();
          toast({ 
            variant: "reward",
            title: "Growth Boost Received!", 
            description: `+${XP_REWARDS.AD_WATCH_XP} XP and +5 Credits added to vault.` 
          });
          setShowAdModal(false);
          setShowAlertsModal(false);
        } catch (e) {
          toast({ variant: "destructive", title: "Sync Failed", description: "Could not verify reward completion." });
        } finally {
          setWatchingAd(false);
          setVerifyingAd(false);
        }
      }, 1500); 
    }, 3500);
  };

  const navItems = [
    { label: 'Home', icon: <Home className="w-4 h-4" />, href: '/' },
    { 
      label: 'Daily Tasks', 
      icon: (
        <div className="relative">
          <ListTodo className="w-4 h-4" />
          {claimableTasksCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary text-primary-foreground text-[7px] font-black rounded-full flex items-center justify-center border border-card shadow-sm animate-bounce">
              {claimableTasksCount}
            </span>
          )}
        </div>
      ), 
      href: '/tasks' 
    },
    { label: 'Global Arena', icon: <Trophy className="w-4 h-4" />, href: '/events' },
    { 
      label: 'Notifications', 
      icon: (
        <div className="relative">
          <Bell className="w-4 h-4" />
          {availableTasksCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-primary-foreground text-[8px] font-black rounded-full flex items-center justify-center border border-card shadow-sm animate-bounce">
              {availableTasksCount}
            </span>
          )}
        </div>
      ), 
      href: '#', 
      onClick: async () => { await refreshUser(); setShowAlertsModal(true); } 
    },
  ];

  return (
    <>
      <nav className="min-h-16 pt-[env(safe-area-inset-top)] flex items-center justify-between px-4 md:px-8 bg-background/80 backdrop-blur-xl border-b sticky top-0 z-[100] transition-all duration-300 shadow-sm">
        <div className="h-16 flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 bg-primary rounded-[1rem] flex items-center justify-center shadow-lg shadow-primary/25 transition-transform group-active:scale-95">
                <GraduationCap className="text-primary-foreground w-6 h-6" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-tight text-foreground block leading-none">LET's Prep</span>
                  {user && (
                    <Badge variant="outline" className="h-5 px-2 font-black text-[9px] border-primary/20 text-primary bg-primary/5">
                      {rankData?.title} (Rank {rankData?.rank})
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Professional Ranking
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {user && (
              <div className="hidden lg:flex flex-col items-end gap-1 min-w-[120px] mr-2">
                <div className="flex justify-between w-full px-1">
                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{rankData?.title}</span>
                  <span className="text-[8px] font-black text-primary">{Math.round(rankData?.progress || 0)}%</span>
                </div>
                <Progress value={rankData?.progress} className="h-1 w-full bg-muted" />
              </div>
            )}

            <div className="flex items-center gap-1 sm:gap-2">
              {user && (
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 p-1 px-3 rounded-full hover:bg-muted transition-all border border-transparent hover:border-border outline-none">
                        <Menu className="w-5 h-5 text-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 mt-2 rounded-2xl border bg-card shadow-2xl p-2" align="end">
                      <DropdownMenuLabel className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-3 py-2">Quick Navigation</DropdownMenuLabel>
                      {navItems.map((item) => (
                        <DropdownMenuItem key={item.label} asChild onSelect={(e) => {
                          if (item.onClick) {
                            e.preventDefault();
                            item.onClick();
                          }
                        }}>
                          {item.onClick ? (
                            <div className="flex items-center gap-3 font-bold cursor-pointer rounded-xl hover:bg-muted transition-colors">
                              <div className="text-primary">{item.icon}</div>
                              {item.label}
                            </div>
                          ) : (
                            <Link href={item.href} className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl hover:bg-muted transition-colors">
                              <div className="text-primary">{item.icon}</div>
                              {item.label}
                            </Link>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

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
                  <span className="text-sm font-black text-foreground">{typeof user.credits === 'number' ? user.credits : 0}</span>
                  <Zap className="w-3 h-3 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>

            {!user ? (
              <Button onClick={() => setShowAuthModal(true)} className="font-bold rounded-2xl h-10 px-6 shadow-md shadow-primary/20">Sign In</Button>
            ) : (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 p-0.5 rounded-full hover:bg-muted transition-all outline-none focus:ring-2 focus:ring-primary/20 relative">
                      <Avatar className="w-9 h-9 border-2 border-background shadow-md">
                        {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || "User"} />}
                        <AvatarFallback className="text-xs font-black bg-primary/10 text-primary uppercase">
                          {user.displayName?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {user.isPro ? (
                        <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 shadow-sm border border-background">
                          <Crown className="w-2.5 h-2.5 text-yellow-900" />
                        </div>
                      ) : (
                        <div className="absolute -top-1 -right-1 bg-blue-400 rounded-full p-0.5 shadow-sm border border-background">
                          <ShieldCheck className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 mt-2 rounded-2xl border bg-card shadow-2xl p-2" align="end">
                    <div className="p-3 mb-2 bg-muted/30 rounded-xl">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-black truncate">{user.displayName}</p>
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] font-black uppercase px-1.5 py-0">{rankData?.title}</Badge>
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">{user.email}</p>
                    </div>
                    <DropdownMenuLabel className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-3 py-2">Career Overview</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <div className="px-3 py-2 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                          <span className="text-muted-foreground">{rankData?.title}</span>
                          <span className="text-primary">{rankData?.xpInRank || 0} / {rankData?.nextRankXp} XP</span>
                        </div>
                        <Progress value={rankData?.progress} className="h-1.5" />
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-2 bg-border/50" />
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
                      <Link href="/settings" className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl hover:bg-muted transition-colors">
                        <Settings className="w-4 h-4 text-blue-500" /> App Settings
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
        </div>
      </nav>

      <Dialog open={showAuthModal} onOpenChange={(open) => !watchingAd && setShowAuthModal(open)}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-0 max-w-sm outline-none overflow-hidden">
          <div className="bg-emerald-500/10 p-10 flex flex-col items-center text-center relative">
            <div className="w-20 h-20 bg-card rounded-[2rem] flex items-center justify-center shadow-xl mb-4 relative z-10">
              <ShieldCheck className="w-10 h-10 text-emerald-500" />
            </div>
            <div className="space-y-1 relative z-10">
              <DialogTitle className="text-2xl font-black tracking-tight">Verified Access</DialogTitle>
              <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">
                Professional Credentials Required
              </DialogDescription>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent z-0" />
          </div>
          <div className="p-8 space-y-6 bg-card">
            <div className="grid gap-3">
              <Button 
                onClick={async () => { await loginWithGoogle(); setShowAuthModal(false); }} 
                className="h-14 rounded-2xl font-black gap-3 shadow-xl bg-white text-black border border-border hover:bg-muted transition-all active:scale-95"
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </Button>
              {isMobile && (
                <Button 
                  onClick={async () => { await loginWithGoogle(); setShowAuthModal(false); }} 
                  className="h-14 rounded-2xl font-black gap-3 shadow-xl bg-[#3DDC84] text-black border border-border hover:bg-[#3DDC84]/90 transition-all active:scale-95"
                >
                  <Smartphone className="w-5 h-5" />
                  <span>Android sign in</span>
                </Button>
              )}
              <Button 
                onClick={async () => { await loginWithFacebook(); setShowAuthModal(false); }} 
                className="h-14 rounded-2xl font-black gap-3 shadow-xl bg-[#1877F2] text-white hover:bg-[#1877F2]/90 border-none transition-all active:scale-95"
              >
                <Facebook className="w-5 h-5 fill-current text-white" />
                <span>Continue with Facebook</span>
              </Button>
            </div>
            <p className="text-center text-[10px] font-medium text-muted-foreground leading-relaxed px-4">
              By signing in, you agree to track your professional board readiness and maintain your academic streak.
            </p>
            <div className="pt-4 border-t border-border/50 text-center">
              <Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest border-emerald-500/20 text-emerald-600 bg-emerald-500/5 py-1 px-4">
                Free Forever Practice Access
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdModal} onOpenChange={(open) => !watchingAd && setShowAdModal(open)}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl max-w-[380px] outline-none" hideCloseButton={watchingAd}>
          <DialogHeader className="space-y-3">
            <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-2">
              {verifyingAd ? <ShieldAlert className="w-8 h-8 text-primary animate-pulse" /> : <Zap className="w-8 h-8 text-primary" />}
            </div>
            <DialogTitle className="text-2xl font-black text-center">{verifyingAd ? "Verifying Access..." : "Refill AI Credits"}</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground font-medium">
              {verifyingAd ? "Our system is validating your professional viewing." : "Watch a professional tutorial to earn "}<span className="text-primary font-black">+5 Credits</span>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-10 flex flex-col items-center justify-center bg-muted/30 rounded-[2rem] border-2 border-dashed border-border/50 relative overflow-hidden">
            {watchingAd && !verifyingAd && (
              <div className="absolute inset-0 bg-primary/5 animate-pulse" />
            )}
            <Play className={cn("w-14 h-14 transition-all duration-500", watchingAd ? "text-primary scale-110" : "text-primary opacity-20")} />
            <div className="flex flex-col items-center mt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Status</p>
              <p className="text-sm font-bold text-center px-6 leading-tight">
                {watchingAd ? "Please complete the clip to claim your reward." : `Daily Allowance: ${user?.dailyAdCount || 0} / ${DAILY_AD_LIMIT}`}
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-3">
            <Button 
              className="w-full h-14 font-black rounded-2xl text-lg gap-3 shadow-lg shadow-primary/30 active:scale-[0.98] transition-all" 
              onClick={handleWatchAd} 
              disabled={watchingAd || (user?.dailyAdCount || 0) >= DAILY_AD_LIMIT}
            >
              {verifyingAd ? <Loader2 className="w-6 h-6 animate-spin" /> : watchingAd ? <div className="flex items-center gap-2">Watching... <Loader2 className="w-4 h-4 animate-spin" /></div> : <Play className="w-6 h-6 fill-current" />}
              {!watchingAd && ((user?.dailyAdCount || 0) >= DAILY_AD_LIMIT ? "Limit Reached" : "Watch & Earn +5")}
            </Button>
            {!watchingAd && (
              <Button variant="ghost" className="w-full font-bold text-muted-foreground" onClick={() => setShowAdModal(false)}>Maybe Later</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NotificationsModal 
        isOpen={showAlertsModal}
        onClose={() => !watchingAd && setShowAlertsModal(false)}
        onStartQuickFire={() => router.push('/?start=quickfire')}
        onWatchAd={handleWatchAd}
        isWatchingAd={watchingAd}
        isVerifyingAd={verifyingAd}
      />
    </>
  );
}
