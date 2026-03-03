
'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard,
  Trophy, 
  Zap,
  Target,
  Users,
  Loader2,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { PracticeModal } from './practice-modal';
import { useFirestore, useUser } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { COOLDOWNS, DAILY_AD_LIMIT } from '@/lib/xp-system';

function NavContent() {
  const pathname = usePathname();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [limits, setLimits] = useState({ limitGenEd: 10, limitProfEd: 10, limitSpec: 10 });
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isImmersive, setIsImmersive] = useState(false);

  useEffect(() => {
    const checkImmersive = () => {
      setIsImmersive(document.body.classList.contains('immersive-mode'));
    };
    checkImmersive();
    const observer = new MutationObserver(checkImmersive);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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

  const { claimableTasksCount } = useMemo(() => {
    if (!user) return { claimableTasksCount: 0 };
    
    let claimable = 0;
    const userTier = user.userTier || 'Bronze';
    const qGoal = userTier === 'Platinum' ? 35 : 20;
    
    if ((user.dailyAiUsage || 0) >= 1 && !user.taskLoginClaimed) claimable++;
    if ((user.dailyQuestionsAnswered || 0) >= qGoal && !user.taskQuestionsClaimed) claimable++;
    if ((user.dailyTestsFinished || 0) >= 1 && !user.taskMockClaimed) claimable++;
    if ((user.mistakesReviewed || 0) >= 10 && !user.taskMistakesClaimed) claimable++;

    return { claimableTasksCount: claimable };
  }, [user]);

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
    router.push(item.href);
  };

  const navItems = useMemo(() => [
    { id: 'home', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, href: '/dashboard' },
    { 
      id: 'tasks', 
      label: 'Quests', 
      icon: (
        <div className="relative">
          <Compass className="w-5 h-5" />
          {claimableTasksCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-black rounded-full flex items-center justify-center border-2 border-card shadow-sm animate-bounce">{claimableTasksCount}</span>
          )}
        </div>
      ), 
      href: '/tasks' 
    },
    { id: 'practice', label: 'Practice', icon: <Target className="w-6 h-6" />, href: '#' },
    { id: 'events', label: 'Arena', icon: <Trophy className="w-5 h-5" />, href: '/events' },
    { id: 'community', label: 'Network', icon: <Users className="w-5 h-5" />, href: '/community' }
  ], [claimableTasksCount]);

  if (isImmersive) return null;

  return (
    <>
      <div className={cn("md:hidden fixed bottom-0 left-0 right-0 z-[60] pb-safe bg-card/95 backdrop-blur-2xl border-t border-border/40 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-all duration-500 ease-in-out transform", isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0")}>
        <div className="flex items-center justify-between px-2 h-16 w-full">
          {user ? navItems.map((item) => {
            const active = pathname === item.href;
            const isCenter = item.id === 'practice';
            if (isCenter) return (
              <button key={item.id} onClick={() => handleNavClick(item)} className="relative -top-4 active:scale-90 transition-transform duration-200 px-2">
                <div className="absolute inset-0 bg-primary blur-2xl opacity-20 animate-pulse" />
                <div className="relative w-14 h-14 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-xl shadow-primary/40 border-4 border-background"><Zap className="w-7 h-7 fill-current" /></div>
              </button>
            );
            return (
              <button key={item.id} onClick={() => handleNavClick(item)} className={cn("flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all duration-300 relative", active ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                <div className={cn("w-12 h-8 rounded-full flex items-center justify-center transition-all duration-300", active ? "bg-primary/15" : "bg-transparent")}>{item.icon}</div>
                <span className={cn("text-[10px] font-black uppercase tracking-tighter transition-opacity duration-300", active ? "opacity-100 scale-105" : "opacity-60")}>{item.label}</span>
              </button>
            );
          }) : (<div className="flex-1 flex items-center justify-center text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-40"><ShieldCheck className="w-4 h-4 mr-2" /> Teacher Trace Required</div>)}
        </div>
      </div>
      {user && (
        <PracticeModal isOpen={isPracticeOpen} onClose={() => setIsPracticeOpen(false)} onStartExam={(cat) => router.push(`/?start=${cat}`)} limits={limits} />
      )}
    </>
  );
}

export function MobileBottomNav() {
  return <Suspense fallback={null}><NavContent /></Suspense>;
}
