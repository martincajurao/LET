'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Home, 
  BarChart3, 
  Trophy, 
  Settings,
  Zap,
  Target
} from 'lucide-react';
import { PracticeModal } from './practice-modal';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" />, href: '/' },
  { id: 'progress', label: 'Progress', icon: <BarChart3 className="w-5 h-5" />, href: '/profile' },
  { id: 'practice', label: 'Practice', icon: <Target className="w-6 h-6" />, href: '#' },
  { id: 'events', label: 'Events', icon: <Trophy className="w-5 h-5" />, href: '/#events' },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, href: '/profile?tab=account' }
];

function NavContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams ? searchParams.get('tab') : null;
  
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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

  const handleNavClick = (item: NavItem) => {
    if (item.id === 'practice') {
      setIsPracticeOpen(true);
      return;
    }
    
    if (item.id === 'events') {
      if (pathname === '/') {
        const element = document.getElementById('events');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
    }
    
    router.push(item.href);
  };

  const isActive = (item: NavItem) => {
    if (item.id === 'home' && pathname === '/') return true;
    if (item.id === 'progress' && pathname === '/profile' && tab !== 'account') return true;
    if (item.id === 'settings' && tab === 'account') return true;
    return false;
  };

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
