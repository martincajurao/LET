
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Bell, 
  Timer, 
  Play, 
  CheckCircle2, 
  Loader2,
  ChevronRight,
  Flame,
  ShieldAlert,
  Sparkles,
  Info
} from 'lucide-react';
import { COOLDOWNS, XP_REWARDS, DAILY_AD_LIMIT } from '@/lib/xp-system';
import { cn } from '@/lib/utils';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartQuickFire: () => void;
  onWatchAd: () => void;
  isWatchingAd?: boolean;
  isVerifyingAd?: boolean;
}

export function NotificationsModal({ 
  isOpen, 
  onClose, 
  onStartQuickFire, 
  onWatchAd,
  isWatchingAd = false,
  isVerifyingAd = false
}: NotificationsModalProps) {
  const { user, refreshUser } = useUser();
  const [adTimeLeft, setAdTimeLeft] = useState(0);
  const [qfTimeLeft, setQfTimeLeft] = useState(0);
  
  // Ref tracking for reactive timer calculation
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const updateTimers = useCallback(() => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    
    const now = Date.now();
    const lastAd = Number(currentUser.lastAdXpTimestamp) || 0;
    const lastQf = Number(currentUser.lastQuickFireTimestamp) || 0;
    
    setAdTimeLeft(Math.max(0, lastAd + COOLDOWNS.AD_XP - now));
    setQfTimeLeft(Math.max(0, lastQf + COOLDOWNS.QUICK_FIRE - now));
  }, []);

  // Sync data and start timers on open
  useEffect(() => {
    if (isOpen) {
      refreshUser();
      updateTimers();
      const interval = setInterval(updateTimers, 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen, refreshUser, updateTimers]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    if (totalSeconds >= 3600) {
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const adReachedLimit = (user?.dailyAdCount || 0) >= DAILY_AD_LIMIT;
  const adAvailable = adTimeLeft <= 0 && !adReachedLimit;
  const qfAvailable = qfTimeLeft <= 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isWatchingAd && onClose()}>
      <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-0 max-w-sm sm:max-w-md overflow-hidden outline-none" hideCloseButton={isWatchingAd}>
        {/* Verification Overlay Header */}
        <AnimatePresence mode="wait">
          {isVerifyingAd ? (
            <motion.div 
              key="verifying"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-primary p-6 flex flex-col items-center justify-center text-primary-foreground text-center"
            >
              <ShieldAlert className="w-10 h-10 mb-2 animate-pulse" />
              <h3 className="text-xl font-black tracking-tight">Verifying Session</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Synchronizing professional vault...</p>
            </motion.div>
          ) : (
            <div className="p-8 pb-4">
              <DialogHeader className="text-left space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Bell className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black tracking-tight text-foreground">Academic Alerts</DialogTitle>
                    <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Professional Rewards Hub</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>
          )}
        </AnimatePresence>

        <div className="p-8 pt-4 space-y-4">
          {/* Quick Fire Card */}
          <div className={cn(
            "p-5 rounded-[2rem] border-2 transition-all active:scale-[0.98] group",
            qfAvailable && !isWatchingAd ? "bg-card border-primary/20 shadow-md" : "bg-muted/30 border-transparent opacity-80"
          )}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-colors",
                  qfAvailable ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                )}>
                  <Zap className={cn("w-5 h-5", qfAvailable && "fill-current")} />
                </div>
                <div>
                  <p className="font-black text-sm text-foreground">Mixed Brain Teaser</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">+{XP_REWARDS.QUICK_FIRE_COMPLETE} XP Potential</p>
                </div>
              </div>
              {qfAvailable && !isWatchingAd && (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[9px] uppercase animate-pulse">Ready</Badge>
              )}
            </div>
            <Button 
              disabled={!qfAvailable || isWatchingAd}
              onClick={(e) => { 
                e.stopPropagation();
                onStartQuickFire(); 
                onClose(); 
              }}
              className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg active:scale-95 transition-all"
            >
              {qfAvailable ? "Begin Challenge" : `Locked: ${formatTime(qfTimeLeft)}`}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Ad Reward Card */}
          <div className={cn(
            "p-5 rounded-[2rem] border-2 transition-all relative overflow-hidden group",
            adAvailable && !isWatchingAd ? "bg-card border-yellow-500/20 shadow-md" : "bg-muted/30 border-transparent opacity-80"
          )}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-colors",
                  adAvailable ? "bg-yellow-500 text-white" : "bg-background text-muted-foreground"
                )}>
                  <Sparkles className={cn("w-5 h-5", adAvailable && "fill-current animate-sparkle")} />
                </div>
                <div>
                  <p className="font-black text-sm text-foreground">Growth Boost</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">+{XP_REWARDS.AD_WATCH_XP} XP & +5 Credits</p>
                </div>
              </div>
              {adAvailable && !isWatchingAd && (
                <Badge className="bg-yellow-500/10 text-yellow-600 border-none font-black text-[9px] uppercase animate-pulse">Ready</Badge>
              )}
            </div>
            <Button 
              variant={adAvailable ? "default" : "outline"}
              disabled={!adAvailable || isWatchingAd}
              onClick={(e) => {
                e.stopPropagation();
                onWatchAd();
              }}
              className={cn(
                "w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg active:scale-95 transition-all",
                adAvailable ? "bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-500/20" : ""
              )}
            >
              {isWatchingAd ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isVerifyingAd ? "Verifying..." : "Watching Clip..."}
                </div>
              ) : adReachedLimit ? (
                <><CheckCircle2 className="w-4 h-4" /> Daily Limit Reached</>
              ) : adAvailable ? (
                "Unlock Rewards"
              ) : (
                <span className="font-mono">{formatTime(adTimeLeft)} remaining</span>
              )}
            </Button>
          </div>

          {/* Status Context */}
          <div className="p-4 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/10 flex items-start gap-3">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">
              <span className="text-primary font-black uppercase tracking-widest">Vault Status:</span> {user?.dailyAdCount || 0}/{DAILY_AD_LIMIT} clips viewed. Refresh rewards every 30 minutes to maximize professional growth.
            </p>
          </div>
        </div>

        <div className="bg-muted/30 p-6 text-center border-t border-border/50">
          <div className="flex items-center justify-center gap-2 text-muted-foreground/40">
            <Flame className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-[0.25em]">Career Persistence Engine</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
