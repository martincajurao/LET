'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase/index';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from 'next/link';
import { 
  GraduationCap, 
  History, 
  LogOut, 
  Zap, 
  Play, 
  Loader2, 
  Moon, 
  Sun, 
  Bell, 
  Settings, 
  Menu,
  LayoutDashboard,
  ListTodo,
  Trophy,
  Crown,
  Sparkles,
  ShieldAlert
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
import { getRankData, XP_REWARDS, COOLDOWNS, DAILY_AD_LIMIT } from '@/lib/xp-system';
import { NotificationsModal } from './notifications-modal';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const { user, loading, logout, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { isDark, toggleDarkMode } = useTheme();
  
  const [showAdModal, setShowAdModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [watchingAd, setWatchingAd] = useState(false);
  const [verifyingAd, setVerifyingAd] = useState(false);
  const [availableTasksCount, setAvailableTasksCount] = useState(0);
  const [claimableTasksCount, setClaimableTasksCount] = useState(0);

  const rankData = user ? getRankData(user.xp || 0) : null;
  const userRef = useRef(user);

  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (!userRef.current) {
      setAvailableTasksCount(0);
      setClaimableTasksCount(0);
      return;
    }

    const calculateCounts = () => {
      const currentUser = userRef.current;
      if (!currentUser) return;

      const now = Date.now();
      const lastAd = Number(currentUser.lastAdXpTimestamp) || 0;
      const lastQf = Number(currentUser.lastQuickFireTimestamp) || 0;
      
      const adAvailable = lastAd + COOLDOWNS.AD_XP <= now && (currentUser.dailyAdCount || 0) < DAILY_AD_LIMIT;
      const qfAvailable = lastQf + COOLDOWNS.QUICK_FIRE <= now;
      setAvailableTasksCount((adAvailable ? 1 : 0) + (qfAvailable ? 1 : 0));

      let claimableCount = 0;
      const userTier = currentUser.userTier || 'Bronze';
      const qGoal = userTier === 'Platinum' ? 35 : 20;
      if (!currentUser.taskLoginClaimed) claimableCount++;
      if ((currentUser.dailyQuestionsAnswered || 0) >= qGoal && !currentUser.taskQuestionsClaimed) claimableCount++;
      if ((currentUser.dailyTestsFinished || 0) >= 1 && !currentUser.taskMockClaimed) claimableCount++;
      if ((currentUser.mistakesReviewed || 0) >= 10 && !currentUser.taskMistakesClaimed) claimableCount++;
      setClaimableTasksCount(claimableCount);
    };

    calculateCounts();
    const interval = setInterval(calculateCounts, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleWatchAd = async () => {
    if (!user || !firestore || watchingAd) return;
    
    if ((user.dailyAdCount || 0) >= DAILY_AD_LIMIT) {
      toast({ title: "Allowance Reached", description: "Daily limit reached.", variant: "destructive" });
      return;
    }
    
    setWatchingAd(true);
    setVerifyingAd(false);

    setTimeout(async () => {
      setVerifyingAd(true);
      setTimeout(async () => {
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          await updateDoc(userDocRef, {
            credits: increment(5),
            xp: increment(XP_REWARDS.AD_WATCH_XP),
            lastAdXpTimestamp: Date.now(),
            dailyAdCount: increment(1)
          });
          await refreshUser();
          toast({ variant: "reward", title: "Growth Boost Received!", description: `+${XP_REWARDS.AD_WATCH_XP} XP earned.` });
          setShowAdModal(false);
          setShowAlertsModal(false);
        } catch (e) {
          toast({ variant: "destructive", title: "Sync Failed", description: "Verification failed." });
        } finally {
          setWatchingAd(false);
          setVerifyingAd(false);
        }
      }, 1500); 
    }, 3500);
  };

  // Final visibility check after all hook calls
  if (loading || !user) return null;

  const navItems = [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, href: '/dashboard' },
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
      <nav className="min-h-16 pt-[env(safe-area-inset-top)] flex items-center justify-between px-4 md:px-8 bg-background/80 backdrop-blur-xl border-b sticky top-0 z-[100] shadow-sm">
        <div className="h-16 flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 bg-primary rounded-[1rem] flex items-center justify-center shadow-lg shadow-primary/25">
                <GraduationCap className="text-primary-foreground w-6 h-6" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-tight text-foreground block leading-none">LET's Prep</span>
                  <Badge variant="outline" className="h-5 px-2 font-black text-[9px] border-primary/20 text-primary bg-primary/5">
                    Rank {rankData?.rank}
                  </Badge>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Professional Ranking
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1 sm:gap-2">
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
                        if (item.onClick) { e.preventDefault(); item.onClick(); }
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

              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-muted" onClick={toggleDarkMode}>
                {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </Button>
              
              <div className="flex items-center gap-2 bg-muted/40 hover:bg-accent/10 px-3 sm:px-4 py-2 rounded-2xl border border-border/50 cursor-pointer transition-all active:scale-95 group" onClick={() => setShowAdModal(true)}>
                <div className="w-5 h-5 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-600 fill-current animate-sparkle" />
                </div>
                <span className="text-sm font-black text-foreground">{typeof user.credits === 'number' ? user.credits : 0}</span>
                <Zap className="w-3 h-3 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-0.5 rounded-full hover:bg-muted transition-all outline-none focus:ring-2 focus:ring-primary/20 relative">
                  <Avatar className="w-9 h-9 border-2 border-background shadow-md">
                    {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || "User"} />}
                    <AvatarFallback className="text-xs font-black bg-primary/10 text-primary uppercase">{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  {user.isPro && (
                    <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 shadow-sm border border-background">
                      <Crown className="w-2.5 h-2.5 text-yellow-900" />
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
                  <Link href="/profile?tab=settings" className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl hover:bg-muted transition-colors">
                    <Settings className="w-4 h-4 text-primary" /> Profile Settings
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
          </div>
        </div>
      </nav>

      <Dialog open={showAdModal} onOpenChange={(open) => !watchingAd && setShowAdModal(open)}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl max-w-[380px] outline-none" hideCloseButton={watchingAd}>
          <DialogHeader className="space-y-3">
            <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-2">
              {verifyingAd ? <ShieldAlert className="w-8 h-8 text-primary animate-pulse" /> : <Zap className="w-8 h-8 text-primary" />}
            </div>
            <DialogTitle className="text-2xl font-black text-center">{verifyingAd ? "Verifying..." : "Refill AI Credits"}</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground font-medium">Watch a professional tutorial to earn <span className="text-primary font-black">+5 AI Credits</span>.</DialogDescription>
          </DialogHeader>
          <div className="py-10 flex flex-col items-center justify-center bg-muted/30 rounded-[2rem] border-2 border-dashed border-border/50 relative overflow-hidden">
            <Play className={cn("w-14 h-14 transition-all duration-500", watchingAd ? "text-primary scale-110" : "text-primary opacity-20")} />
            <p className="text-xs font-bold text-center mt-4 px-6 leading-tight">{watchingAd ? "Please complete the clip." : `Daily Allowance: ${user?.dailyAdCount || 0} / ${DAILY_AD_LIMIT}`}</p>
          </div>
          <DialogFooter className="flex-col gap-3">
            <Button className="w-full h-14 font-black rounded-2xl text-lg gap-3 shadow-lg bg-primary text-primary-foreground active:scale-[0.98] transition-all" onClick={handleWatchAd} disabled={watchingAd || (user?.dailyAdCount || 0) >= DAILY_AD_LIMIT}>
              {verifyingAd ? <Loader2 className="w-6 h-6 animate-spin" /> : watchingAd ? "Watching..." : <Play className="w-6 h-6 fill-current" />}
              {!watchingAd && "Watch & Earn +5"}
            </Button>
            {!watchingAd && <Button variant="ghost" className="w-full font-bold text-muted-foreground" onClick={() => setShowAdModal(false)}>Maybe Later</Button>}
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
