'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard,
  ListTodo, 
  Trophy, 
  Zap,
  Target,
  Bell,
  Loader2
} from 'lucide-react';
import { PracticeModal } from './practice-modal';
import { NotificationsModal } from './notifications-modal';
import { useFirestore, useUser } from '@/firebase';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { XP_REWARDS, COOLDOWNS, DAILY_AD_LIMIT } from '@/lib/xp-system';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

function NavContent() {
  const pathname = usePathname();
  const router = useRouter();
  const firestore = useFirestore();
  const { user, loading: authLoading, refreshUser } = useUser();
  const { toast } = useToast();
  
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [limits, setLimits] = useState({ limitGenEd: 10, limitProfEd: 10, limitSpec: 10 });
  const [watchingAd, setWatchingAd] = useState(false);
  const [verifyingAd, setVerifyingAd] = useState(false);
  const [availableTasksCount, setAvailableTasksCount] = useState(0);
  const [claimableTasksCount, setClaimableTasksCount] = useState(0);

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const configDocRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, "system_configs", "global");
  }, [firestore]);

  useEffect(() => {
    if (!configDocRef) return;
    const unsub = onSnapshot(configDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLimits({
          limitGenEd: data.limitGenEd || 10,
          limitProfEd: data.limitProfEd || 10,
          limitSpec: data.limitSpec || 10
        });
      }
    }, (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: configDocRef.path, operation: 'get' }));
    });
    return () => unsub();
  }, [configDocRef]);

  const calculateAvailable = useCallback(() => {
    const currentUser = userRef.current;
    if (!currentUser) {
      setAvailableTasksCount(0);
      setClaimableTasksCount(0);
      return;
    }

    const now = Date.now();
    const adAvailable = (currentUser.lastAdXpTimestamp || 0) + COOLDOWNS.AD_XP <= now && (currentUser.dailyAdCount || 0) < DAILY_AD_LIMIT;
    const qfAvailable = (currentUser.lastQuickFireTimestamp || 0) + COOLDOWNS.QUICK_FIRE <= now;
    setAvailableTasksCount((adAvailable ? 1 : 0) + (qfAvailable ? 1 : 0));

    let claimableCount = 0;
    const qGoal = currentUser.userTier === 'Platinum' ? 35 : 20;
    if (!currentUser.taskLoginClaimed) claimableCount++;
    if ((currentUser.dailyQuestionsAnswered || 0) >= qGoal && !currentUser.taskQuestionsClaimed) claimableCount++;
    if ((currentUser.dailyTestsFinished || 0) >= 1 && !currentUser.taskMockClaimed) claimableCount++;
    if ((currentUser.mistakesReviewed || 0) >= 10 && !currentUser.taskMistakesClaimed) claimableCount++;
    setClaimableTasksCount(claimableCount);
  }, []);

  useEffect(() => {
    calculateAvailable();
    const interval = setInterval(calculateAvailable, 10000);
    return () => clearInterval(interval);
  }, [calculateAvailable]);

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
    if (item.id === 'practice') { setIsPracticeOpen(true); return; }
    if (item.id === 'notifications') { setIsAlertsOpen(true); return; }
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
          const userDocRef = doc(firestore, 'users', user.uid);
          await updateDoc(userDocRef, { credits: increment(5), xp: increment(XP_REWARDS.AD_WATCH_XP), lastAdXpTimestamp: Date.now(), dailyAdCount: increment(1) });
          await refreshUser();
          toast({ title: "Growth Boost!", description: `+${XP_REWARDS.AD_WATCH_XP} XP and +5 Credits added.` });
          setIsAlertsOpen(false);
        } catch (e) { toast({ variant: "destructive", title: "Sync Failed", description: "Could not grant reward." }); } 
        finally { setWatchingAd(false); setVerifyingAd(false); }
      }, 1500);
    }, 3500);
  };

  if (!user) return null;

  const navItems = [
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
  ];

  return (
    <>
      <div className={cn("md:hidden fixed bottom-0 left-0 right-0 z-[60] px-4 pb-6 pt-2 transition-all duration-500 ease-in-out transform safe-pb", isVisible ? "translate-y-0 opacity-100" : "translate-y-32 opacity-0")}>
        <div className="mx-auto max-w-lg bg-card/95 backdrop-blur-2xl border border-border/40 rounded-[2.25rem] shadow-[0_12px_40px_rgba(0,0,0,0.15)] flex items-center justify-between px-2 h-16 transition-colors ring-1 ring-inset ring-white/10">
          {navItems.map((item) => {
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
          })}
        </div>
      </div>
      <PracticeModal isOpen={isPracticeOpen} onClose={() => setIsPracticeOpen(false)} onStartExam={(cat) => router.push(`/?start=${cat}`)} limits={limits} />
      <NotificationsModal isOpen={isAlertsOpen} onClose={() => !watchingAd && setIsAlertsOpen(false)} onStartQuickFire={() => router.push('/?start=quickfire')} onWatchAd={handleWatchAd} isWatchingAd={watchingAd} isVerifyingAd={verifyingAd} />
    </>
  );
}

export function MobileBottomNav() {
  return <Suspense fallback={null}><NavContent /></Suspense>;
}
