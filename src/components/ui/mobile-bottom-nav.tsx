'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';
import { 
  Home, 
  BarChart3, 
  Trophy, 
  Settings,
  Moon,
  Sun
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

// Left side nav items
const leftNavItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Home',
    icon: <Home className="w-6 h-6" />,
    href: '/'
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: <BarChart3 className="w-6 h-6" />,
    href: '/profile'
  }
];

// Right side nav items
const rightNavItems: NavItem[] = [
  {
    id: 'community',
    label: 'Community',
    icon: <Trophy className="w-6 h-6" />,
    href: '/#community'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings className="w-6 h-6" />,
    href: '/#settings'
  }
];

interface MobileBottomNavProps {
  currentView?: string;
  onViewChange?: (view: string) => void;
  onStartExam?: () => void;
  isSignedIn?: boolean;
}

export function MobileBottomNav({ currentView, onViewChange, onStartExam, isSignedIn }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { isDark, toggleDarkMode } = useTheme();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Auto-hide navbar on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show navbar when at top of page
      if (currentScrollY <= 0) {
        setIsVisible(true);
        return;
      }
      
      // Determine scroll direction
      if (currentScrollY > lastScrollY.current) {
        // Scrolling down - hide navbar
        setIsVisible(false);
      } else {
        // Scrolling up - show navbar
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (item: NavItem) => {
    if (onViewChange) {
      onViewChange(item.id);
    }
    
    if (item.id === 'settings') {
      window.dispatchEvent(new CustomEvent('openSettingsModal'));
    } else if (item.href !== '/#community' && item.href !== '/#settings') {
      window.location.href = item.href;
    } else {
      const element = document.getElementById(item.id === 'community' ? 'community' : 'settings');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleStartExam = () => {
    if (onStartExam) {
      onStartExam();
    } else {
      window.dispatchEvent(new CustomEvent('openPracticeModal'));
    }
  };

  const isActive = (item: NavItem) => {
    if (currentView) {
      return currentView === item.id;
    }
    
    if (item.href === '/' && pathname === '/') return true;
    if (item.href === '/profile' && pathname === '/profile') return true;
    
    return pathname.includes(item.id);
  };

  return (
    <div 
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-[60] transition-transform duration-300 ease-in-out",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom, 20px)',
      }}
    >
      {/* Navigation container */}
      <div 
        className="relative mx-2 mb-2 rounded-2xl bg-card shadow-2xl transition-colors duration-300"
        style={{ height: '80px' }}
      >
        <div className="relative grid grid-cols-5 items-center h-full">
          {leftNavItems.map((item) => {
            const active = isActive(item);
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 relative h-full transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}

          <div className="flex items-start justify-center" style={{ paddingTop: '8px' }}>
            <button
              onClick={handleStartExam}
              className="relative group"
              style={{ width: '56px', height: '56px' }}
            >
              <div 
                className="absolute inset-0 rounded-full opacity-50 group-hover:opacity-70 transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
                  filter: 'blur(10px)',
                }}
              />
              <div 
                className="w-full h-full rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
                style={{ 
                  background: 'linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
                }}
              >
                <svg className="w-6 h-6 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-black text-foreground whitespace-nowrap uppercase">
                Practice
              </span>
            </button>
          </div>

          {rightNavItems.map((item) => {
            const active = isActive(item);
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 relative h-full transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function DarkModeToggle() {
  const { isDark, toggleDarkMode } = useTheme();
  return (
    <button
      onClick={toggleDarkMode}
      className="absolute top-4 right-4 z-50 p-2 rounded-full bg-muted hover:bg-accent transition-colors"
    >
      {isDark ? <Moon className="w-4 h-4 text-yellow-300" /> : <Sun className="w-4 h-4 text-slate-600" />}
    </button>
  );
}