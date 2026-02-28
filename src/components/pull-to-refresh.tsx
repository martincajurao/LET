'use client';

import React, { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

export function PullToRefresh({ onRefresh, children, disabled = false }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || typeof window === 'undefined') return;
    // Only allow pull down when at top of page
    if (window.scrollY === 0) {
      pullStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || pullStartY.current === null || disabled) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - pullStartY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, 100));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !disabled) {
      setIsRefreshing(true);
      try {
        await onRefresh();
        
        // Force page reload for Android WebView to ensure full state refresh
       
          window.location.reload();
        
      } catch (error) {
        console.error('Pull to refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setIsPulling(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
    pullStartY.current = null;
  };

  return (
    <div
      className={cn("min-h-screen", disabled ? "" : "touch-pan-y")}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={!disabled && pullDistance > 0 ? { transform: `translateY(${pullDistance}px)` } : undefined}
    >
      {/* Pull to refresh indicator */}
      {!disabled && isPulling && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-3 bg-primary/10 backdrop-blur-sm border-b border-primary/10">
          <Loader2 className={cn("w-5 h-5 text-primary animate-spin mr-2", isRefreshing ? "block" : "block")} />
          <span className="text-xs font-bold text-primary">
            {isRefreshing ? "xRefreshing..." : pullDistance > 60 ? "Release to refreshhx" : "Pull down to refresh"}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

export default PullToRefresh;
