'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Home, 
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
import { XP_REWARDS, COOLDOWNS } from '@/lib/xp-system';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

function NavContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [limits, setLimits] = useState({ limitGenEd: 10, limitProfEd: 10, limitSpec: 10 });
  const [watchingAd, setWatchingAd] = useState(false);
  const [availableTasksCount, setAvailableTasksCount] = useState(0);

  useEffect(() => {
    if (!firestore) return;
    const unsub = onSnapshot(doc(firestore, "system_configs", "global"), (snap) => {
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

  useEffect(() => {
    if (!user) {
      setAvailableTasksCount(0);
      return;
    }

    const calculateAvailable = () => {
      const now = Date.now();
      const adAvailable = (user.lastAdXpTimestamp || 0) + COOLDOWNS.AD_XP <= now;
      const qfAvailable = (user.lastQuickFireTimestamp || 0) + COOLDOWNS.QUICK_FIRE <= now;
      setAvailableTasksCount((adAvailable ? 1 : 0) + (qfAvailable ? 1 : 0));
    };

    calculateAvailable();
    const interval = setInterval(calculateAvailable, 10000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const navItems: NavItem[] = useMemo(() => [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" />, href: '/' },
    { id: 'tasks', label: 'Tasks', icon: <ListTodo className="w-5 h-5" />, href: '/tasks' },
    { id: 'practice', label: 'Practice', icon: <Target className="w-6 h-6" />, href: '#' },
    { id: 'events', label: 'Arena', icon: <Trophy className="w-5 h-5" />, href: '/events' },
    { 
      id: 'notifications', 
      label: 'Alerts', 
      icon: (
        <div className="relative">
          <Bell className="w-5 h-5" />
          {availableTasksCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-black rounded-full flex items-center justify-center border-2 border-card shadow-sm animate-bounce">
              {availableTasksCount}
            </span>
          )}
        </div>
      ), 
      href: '#' 
    }
  ], [availableTasksCount]);

  const handleNavClick = (item: NavItem) => {
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
    setWatchingAd(true);
    setTimeout(async () => {
      try {
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, {
          credits: increment(2),
          xp: increment(XP_REWARDS.AD_WATCH_XP),
          lastAdXpTimestamp: Date.now()
        });
        toast({ title: "Growth Boost!", description: `+${XP_REWARDS.AD_WATCH_XP} XP and +2 Credits added.` });
        setIsAlertsOpen(false);
      } catch (e) {
        toast({ variant: "destructive", title: "Sync Failed", description: "Could not grant reward." });
      } finally {
        setWatchingAd(false);
      }
    }, 3000);
  };

  const isActive = (item: NavItem) => {
    if (item.id === 'home' && pathname === '/') return true;
    if (item.id === 'tasks' && pathname === '/tasks') return true;
    if (item.id === 'events' && pathname === '/events') return true;
    if (item.id === 'notifications' && isAlertsOpen) return true;
    return false;
  };

  // Only show bottom navbar if user is signed in
  if (authLoading || !user) return null;

  return (
    <>
      <div 
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-[60] px-4 pb-6 transition-all duration-500 ease-in-out transform",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-32 opacity-0"
        )}
      >
        <div className="mx-auto max-w-lg bg-card/95 backdrop-blur-2xl border border-border/40 rounded-[2.25rem] shadow-[0_12px_40px_rgba(0,0,0,0.15)] flex items-center justify-between px-2 h-16 transition-colors ring-1 ring-inset ring-white/10">
          {navItems.map((item) => {
            const active = isActive(item);
            const isCenter = item.id === 'practice';

            if (isCenter) {
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className="relative -top-7 active:scale-90 transition-transform duration-200"
                >
                  <div className="absolute inset-0 bg-primary blur-2xl opacity-30 animate-pulse" />
                  <div className="relative w-16 h-16 bg-primary text-primary-foreground rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-primary/40 ring-4 ring-background">
                    <Zap className="w-8 h-8 fill-current" />
                  </div>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all duration-300 relative",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "w-12 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                  active ? "bg-primary/15" : "bg-transparent"
                )}>
                  {item.icon}
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-tighter transition-opacity duration-300",
                  active ? "opacity-100 scale-105" : "opacity-60"
                )}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <PracticeModal 
        isOpen={isPracticeOpen} 
        onClose={() => setIsPracticeOpen(false)} 
        onStartExam={(cat) => router.push(`/?start=${cat}`)}
        limits={limits}
      />

      <NotificationsModal 
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        onStartQuickFire={() => router.push('/?start=quickfire')}
        onWatchAd={handleWatchAd}
        isWatchingAd={watchingAd}
      />
    </>
  );
}

export function MobileBottomNav() {
  return (
    <Suspense fallback={null}>
      <NavContent />
    </Suspense>
  );
}
