'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard,
  ListTodo, 
  Trophy, 
  Zap,
  Target,
  Bell,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { PracticeModal } from './practice-modal';
import { NotificationsModal } from './notifications-modal';
import { useFirestore, useUser } from '@/firebase';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { XP_REWARDS, COOLDOWNS, DAILY_AD_LIMIT } from '@/lib/xp-system';

function NavContent() {
  const pathname = usePathname();
  const router = useRouter();
  const firestore = useFirestore();
  const { user, refreshUser } = useUser();
  const { toast } = useToast();
  
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [limits, setLimits] = useState({ limitGenEd: 10, limitProfEd: 10, limitSpec: 10 });
  const [watchingAd, setWatchingAd] = useState(false);
  const [verifyingAd, setVerifyingAd] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Real-time ticker for cooldowns
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!firestore) return;
    const configDocRef = doc(firestore, "system_configs", "global");
    const unsub = onSnapshot(configDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLimits({
          limitGenEd: data.limitGenEd || 10,
          limitProfEd: data.limitProfEd || 10,
          limitSpec: data.limitSpec || 10
        });
      }
    });
    return () => unsub();
  }, [firestore]);

  // INSTANT REACTIVE COUNTS: Derived directly from user state
  const { availableTasksCount, claimableTasksCount } = useMemo(() => {
    if (!user) return { availableTasksCount: 0, claimableTasksCount: 0 };

    const lastAd = Number(user.lastAdXpTimestamp) || 0;
    const lastQf = Number(user.lastQuickFireTimestamp) || 0;
    
    const adAvailable = lastAd + COOLDOWNS.AD_XP <= currentTime && (user.dailyAdCount || 0) < DAILY_AD_LIMIT;
    const qfAvailable = lastQf + COOLDOWNS.QUICK_FIRE <= currentTime;
    
    let claimable = 0;
    const userTier = user.userTier || 'Bronze';
    const qGoal = userTier === 'Platinum' ? 35 : 20;
    if (!user.taskLoginClaimed) claimable++;
    if ((user.dailyQuestionsAnswered || 0) >= qGoal && !user.taskQuestionsClaimed) claimable++;
    if ((user.dailyTestsFinished || 0) >= 1 && !user.taskMockClaimed) claimable++;
    if ((user.mistakesReviewed || 0) >= 10 && !user.taskMistakesClaimed) claimable++;

    return {
      availableTasksCount: (adAvailable ? 1 : 0) + (qfAvailable ? 1 : 0),
      claimableTasksCount: claimable
    };
  }, [user, currentTime]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) setIsVisible(false);
      else setIsVisible(true);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleNavClick = (item: any) => {
    if (item.id === 'practice') { 
      setIsPracticeOpen(true); 
      return; 
    }
    if (item.id === 'notifications') { 
      setIsAlertsOpen(true); 
      return; 
    }
    router.push(item.href);
  };

  const handleWatchAd = async () => {
    if (!user || !firestore) return;
    if ((user.dailyAdCount || 0) >= DAILY_AD_LIMIT) {
      toast({ title: "Allowance Reached", description: "Daily professional limit reached.", variant: "destructive" });
      return;
    }
    setWatchingAd(true);
    setVerifyingAd(false);
    setTimeout(async () => {
      setVerifyingAd(true);
      setTimeout(async () => {
        try {
          if (!user.uid.startsWith('bypass')) {
            const userDocRef = doc(firestore, 'users', user.uid);
            await updateDoc(userDocRef, { credits: increment(5), xp: increment(XP_REWARDS.AD_WATCH_XP), lastAdXpTimestamp: Date.now(), dailyAdCount: increment(1) });
          }
          await refreshUser();
          toast({ title: "Growth Boost!", description: `+${XP_REWARDS.AD_WATCH_XP} XP and +5 Credits added.` });
          setIsAlertsOpen(false);
        } catch (e) { toast({ variant: "destructive", title: "Sync Failed", description: "Could not grant reward." }); } 
        finally { setWatchingAd(false); setVerifyingAd(false); }
      }, 1500);
    }, 3500);
  };

  const navItems = useMemo(() => [
    { id: 'home', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, href: '/dashboard' },
    { 
      id: 'tasks', 
      label: 'Tasks', 
      icon: (
        <div className="relative">
          <ListTodo className="w-5 h-5" />
          {claimableTasksCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-black rounded-full flex items-center justify-center border-2 border-card shadow-sm animate-bounce">{claimableTasksCount}</span>
          )}
        </div>
      ), 
      href: '/tasks' 
    },
    { id: 'practice', label: 'Practice', icon: <Target className="w-6 h-6" />, href: '#' },
    { id: 'events', label: 'Arena', icon: <Trophy className="w-5 h-5" />, href: '/events' },
    { 
      id: 'notifications', 
      label: 'Alerts', 
      icon: (
        <div className="relative">
          <Bell className="w-5 h-5" />
          {availableTasksCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-black rounded-full flex items-center justify-center border-2 border-card shadow-sm animate-bounce">{availableTasksCount}</span>
          )}
        </div>
      ), 
      href: '#' 
    }
  ], [claimableTasksCount, availableTasksCount]);

  return (
    <>
      <div className={cn("md:hidden fixed bottom-0 left-0 right-0 z-[60] px-4 pb-safe pt-2 transition-all duration-500 ease-in-out transform", isVisible ? "translate-y-0 opacity-100" : "translate-y-32 opacity-0")}>
        <div className="mx-auto max-w-lg bg-card/95 backdrop-blur-2xl border border-border/40 rounded-[2.25rem] shadow-[0_12px_40px_rgba(0,0,0,0.15)] flex items-center justify-between px-2 h-16 mb-6 transition-colors ring-1 ring-inset ring-white/10">
          {user ? navItems.map((item) => {
            const active = pathname === item.href || (item.id === 'notifications' && isAlertsOpen);
            const isCenter = item.id === 'practice';
            if (isCenter) return (
              <button key={item.id} onClick={() => handleNavClick(item)} className="relative -top-7 active:scale-90 transition-transform duration-200">
                <div className="absolute inset-0 bg-primary blur-2xl opacity-30 animate-pulse" />
                <div className="relative w-16 h-16 bg-primary text-primary-foreground rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-primary/40 ring-4 ring-background"><Zap className="w-8 h-8 fill-current" /></div>
              </button>
            );
            return (
              <button key={item.id} onClick={() => handleNavClick(item)} className={cn("flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all duration-300 relative", active ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                <div className={cn("w-12 h-8 rounded-full flex items-center justify-center transition-all duration-300", active ? "bg-primary/15" : "bg-transparent")}>{item.icon}</div>
                <span className={cn("text-[10px] font-bold uppercase tracking-tighter transition-opacity duration-300", active ? "opacity-100 scale-105" : "opacity-60")}>{item.label}</span>
              </button>
            );
          }) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-40">
              <ShieldCheck className="w-4 h-4 mr-2" /> Educator Trace Required
            </div>
          )}
        </div>
      </div>
      {user && (
        <>
          <PracticeModal isOpen={isPracticeOpen} onClose={() => setIsPracticeOpen(false)} onStartExam={(cat) => router.push(`/?start=${cat}`)} limits={limits} />
          <NotificationsModal isOpen={isAlertsOpen} onClose={() => !watchingAd && setIsAlertsOpen(false)} onStartQuickFire={() => router.push('/?start=quickfire')} onWatchAd={handleWatchAd} isWatchingAd={watchingAd} isVerifyingAd={verifyingAd} />
        </>
      )}
    </>
  );
}

export function MobileBottomNav() {
  return <Suspense fallback={null}><NavContent /></Suspense>;
}