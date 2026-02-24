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

  // Always show navbar
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
      {/* Navigation container - increased height to accommodate FAB */}
      <div 
        className={cn(
          "relative mx-2 mb-2 rounded-2xl",
          isDark ? "bg-slate-900" : "bg-white"
        )}
        style={{ 
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
          height: '80px'
        }}
      >
        {/* Navigation items */}
        <div 
          className="relative grid grid-cols-5 items-center h-full"
        >
          {/* Left side nav items */}
          {leftNavItems.map((item) => {
            const active = isActive(item);
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 relative h-full transition-colors',
                  active 
                    ? 'text-primary' 
                    : isDark
                      ? 'text-slate-400'
                      : 'text-slate-400'
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

          {/* FAB - Center Button - Refactored Design with full visibility */}
          <div className="flex items-start justify-center" style={{ paddingTop: '8px' }}>
            <button
              onClick={handleStartExam}
              className="relative group"
              style={{ 
                width: '56px',
                height: '56px',
              }}
            >
              {/* Outer glow ring */}
              <div 
                className="absolute inset-0 rounded-full opacity-50 group-hover:opacity-70 transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                  filter: 'blur(10px)',
                }}
              />
              
              {/* Main FAB circle */}
              <div 
                className="w-full h-full rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
                style={{ 
                  background: 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)',
                  boxShadow: '0 6px 20px rgba(34, 197, 94, 0.5), inset 0 2px 0 rgba(255,255,255,0.3)',
                }}
              >
                {/* Play icon - properly centered */}
                <svg 
                  className="w-6 h-6 text-white" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              
              {/* Highlight reflection */}
              <div 
                className="absolute top-1 left-3 right-6 h-2.5 rounded-full opacity-40"
                style={{
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.9), transparent)',
                }}
              />
              
              {/* Label */}
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-black text-white whitespace-nowrap drop-shadow-md">
                PRACTICE
              </span>
            </button>
          </div>

          {/* Right side nav items */}
          {rightNavItems.map((item) => {
            const active = isActive(item);
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 relative h-full transition-colors',
                  active 
                    ? 'text-primary' 
                    : isDark
                      ? 'text-slate-400'
                      : 'text-slate-400'
                )}
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                )}
                {item.id === 'community' && (
                  <div className="absolute top-2 right-1/3 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Dark mode toggle component - now uses global ThemeContext
export function DarkModeToggle() {
  const { isDark, toggleDarkMode } = useTheme();
  
  return (
    <button
      onClick={toggleDarkMode}
      className={cn(
        "absolute top-4 right-4 z-50 p-2 rounded-full transition-all duration-200",
        isDark 
          ? "bg-slate-700 hover:bg-slate-600 text-yellow-300" 
          : "bg-slate-200 hover:bg-slate-300 text-slate-600"
      )}
    >
      {isDark ? (
        <Moon className="w-4 h-4" />
      ) : (
        <Sun className="w-4 h-4" />
      )}
    </button>
  );
}
