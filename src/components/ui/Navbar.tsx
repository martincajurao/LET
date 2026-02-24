'use client';

import React, { useState, useEffect } from 'react';
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
  Star
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
import { cn } from '@/lib/utils';
import { getRankData, XP_REWARDS, COOLDOWNS } from '@/lib/xp-system';
import { NotificationsModal } from './notifications-modal';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const { user, logout, loginWithGoogle, loginWithFacebook, bypassLogin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { isDark, toggleDarkMode } = useTheme();
  const [showAdModal, setShowAdModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [watchingAd, setWatchingAd] = useState(false);
  const [availableTasksCount, setAvailableTasksCount] = useState(0);
  const [claimableTasksCount, setClaimableTasksCount] = useState(0);

  const rankData = user ? getRankData(user.xp || 0) : null;

  useEffect(() => {
    if (!user) {
      setAvailableTasksCount(0);
      setClaimableTasksCount(0);
      return;
    }

    const calculateAvailable = () => {
      const now = Date.now();
      const adAvailable = (user.lastAdXpTimestamp || 0) + COOLDOWNS.AD_XP <= now;
      const qfAvailable = (user.lastQuickFireTimestamp || 0) + COOLDOWNS.QUICK_FIRE <= now;
      setAvailableTasksCount((adAvailable ? 1 : 0) + (qfAvailable ? 1 : 0));

      // Calculate claimable daily missions
      let claimableCount = 0;
      const qGoal = user.userTier === 'Platinum' ? 35 : 20;
      if (!user.taskLoginClaimed) claimableCount++;
      if ((user.dailyQuestionsAnswered || 0) >= qGoal && !user.taskQuestionsClaimed) claimableCount++;
      if ((user.dailyTestsFinished || 0) >= 1 && !user.taskMockClaimed) claimableCount++;
      if ((user.mistakesReviewed || 0) >= 10 && !user.taskMistakesClaimed) claimableCount++;
      setClaimableTasksCount(claimableCount);
    };

    calculateAvailable();
    const interval = setInterval(calculateAvailable, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [user]);

  const handleWatchAd = async () => {
    if (!user || !firestore) return;
    setWatchingAd(true);
    setTimeout(async () => {
      try {
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, {
          credits: increment(5),
          xp: increment(XP_REWARDS.AD_WATCH_XP),
          lastAdXpTimestamp: Date.now()
        });
        toast({ title: "Growth Boost!", description: `+${XP_REWARDS.AD_WATCH_XP} XP and +5 Credits added.` });
        setShowAdModal(false);
        setShowAlertsModal(false);
      } catch (e) {
        toast({ variant: "destructive", title: "Sync Failed", description: "Could not grant reward." });
      } finally {
        setWatchingAd(false);
      }
    }, 3000);
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
      onClick: () => setShowAlertsModal(true) 
    },
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
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-foreground block leading-none">LET's Prep</span>
                {user && (
                  <Badge variant="outline" className="h-5 px-2 font-black text-[9px] border-primary/20 text-primary bg-primary/5">
                    {rankData?.title}
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
                          <div className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl hover:bg-muted transition-colors">
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
                <span className="text-sm font-black text-foreground">{user.credits ?? 0}</span>
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
                        <span className="text-primary">{user.xp || 0} XP</span>
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

      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-8 max-sm">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black">Welcome to LET's Prep</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">Choose your preferred sign-in method to continue your professional journey. <span className="text-primary font-black">Free Forever Access.</span></DialogDescription>
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
              Watch a professional tutorial or academic promo to earn <span className="text-primary font-black">+5 Credits</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-10 flex flex-col items-center justify-center bg-muted/30 rounded-[2rem] border-2 border-dashed border-border/50">
            <Play className="w-14 h-14 text-primary opacity-20 mb-4" />
            <div className="flex flex-col items-center">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Daily Allowance</p>
              <p className="text-lg font-black text-foreground">{user?.dailyAdCount || 0} / 10</p>
            </div>
          </div>
          <DialogFooter className="flex-col gap-3">
            <Button 
              className="w-full h-14 font-black rounded-2xl text-lg gap-3 shadow-lg shadow-primary/30 active:scale-[0.98] transition-all" 
              onClick={handleWatchAd} 
              disabled={watchingAd || (user?.dailyAdCount || 0) >= 10}
            >
              {watchingAd ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6 fill-current" />}
              {watchingAd ? "Connecting..." : "Watch & Earn +5"}
            </Button>
            <Button variant="ghost" className="w-full font-bold text-muted-foreground" onClick={() => setShowAdModal(false)}>Maybe Later</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NotificationsModal 
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
        onStartQuickFire={() => router.push('/?start=quickfire')}
        onWatchAd={handleWatchAd}
        isWatchingAd={watchingAd}
      />
    </>
  );
}
