'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { motion } from 'framer-motion';
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
  Sparkles
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
  
  // Use ref to always have latest user data in interval callback
  const userRef = useRef(user);
  userRef.current = user;

  // Refresh user data when modal opens to get latest timestamps
  useEffect(() => {
    if (isOpen && user) {
      refreshUser();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const calculateTime = () => {
      const currentUser = userRef.current;
      if (!currentUser) return;
      
      const now = Date.now();
      const lastAd = typeof currentUser.lastAdXpTimestamp === 'number' ? currentUser.lastAdXpTimestamp : 0;
      const lastQf = typeof currentUser.lastQuickFireTimestamp === 'number' ? currentUser.lastQuickFireTimestamp : 0;
      
      setAdTimeLeft(Math.max(0, lastAd + COOLDOWNS.AD_XP - now));
      setQfTimeLeft(Math.max(0, lastQf + COOLDOWNS.QUICK_FIRE - now));
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

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
      <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-8 max-w-sm sm:max-w-md overflow-hidden outline-none" hideCloseButton={isWatchingAd}>
        <DialogHeader className="text-left space-y-2 mb-6">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-500",
              isVerifyingAd ? "bg-primary/20" : "bg-primary/10"
            )}>
              {isVerifyingAd ? <ShieldAlert className="w-6 h-6 text-primary animate-pulse" /> : <Bell className="w-6 h-6 text-primary" />}
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight">
                {isVerifyingAd ? "Verifying Access" : "Academic Alerts"}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                {isVerifyingAd ? "Syncing professional record..." : "Professional Rewards Hub"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Fire Teaser */}
          <div className={cn(
            "p-5 rounded-3xl border-2 transition-all active:scale-[0.98]",
            qfAvailable && !isWatchingAd ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-muted/30 border-transparent opacity-80"
          )}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                  qfAvailable ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                )}>
                  <Zap className={cn("w-5 h-5", qfAvailable && "fill-current")} />
                </div>
                <div>
                  <p className="font-black text-sm">Mixed Brain Teaser</p>
                  <p className="text-[10px] font-medium text-muted-foreground">+{XP_REWARDS.QUICK_FIRE_COMPLETE} XP Potential</p>
                </div>
              </div>
              {qfAvailable ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[9px] uppercase">Ready</Badge>
              ) : (
                <div className={cn(
                  "flex items-center gap-1.5 text-[10px] font-black font-mono px-2 py-1 rounded-lg transition-colors",
                  qfTimeLeft < 60000 ? "text-amber-600 bg-amber-50 animate-pulse" : "text-muted-foreground bg-background"
                )}>
                  <Timer className="w-3 h-3" />
                  {formatTime(qfTimeLeft)}
                </div>
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
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Ad Teaser */}
          <div className={cn(
            "p-5 rounded-3xl border-2 transition-all relative overflow-hidden",
            adAvailable && !isWatchingAd ? "bg-yellow-500/5 border-yellow-500/20 shadow-sm" : "bg-muted/30 border-transparent opacity-80"
          )}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                  adAvailable ? "bg-yellow-500 text-white" : "bg-background text-muted-foreground"
                )}>
                  {isVerifyingAd ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <Sparkles className="w-5 h-5 fill-current animate-sparkle" />}
                </div>
                <div>
                  <p className="font-black text-sm">Professional Insight</p>
                  <p className="text-[10px] font-medium text-muted-foreground">+{XP_REWARDS.AD_WATCH_XP} XP & +5 Credits</p>
                </div>
              </div>
              {adReachedLimit ? (
                <Badge variant="outline" className="text-rose-500 border-rose-500/30 font-black text-[9px] uppercase">Limit Reached</Badge>
              ) : adAvailable ? (
                <Badge className="bg-yellow-500/10 text-yellow-600 border-none font-black text-[9px] uppercase">Available</Badge>
              ) : (
                <div className={cn(
                  "flex items-center gap-1.5 text-[10px] font-black font-mono px-2 py-1 rounded-lg transition-colors",
                  adTimeLeft < 60000 ? "text-amber-600 bg-amber-50 animate-pulse" : "text-muted-foreground bg-background"
                )}>
                  <Timer className="w-3 h-3" />
                  {formatTime(adTimeLeft)}
                </div>
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
                  {isVerifyingAd ? "Finalizing..." : "Watching Clip..."}
                </div>
              ) : adReachedLimit ? (
                <><CheckCircle2 className="w-4 h-4" /> Daily Allowance Met</>
              ) : adAvailable ? (
                "Refill Growth Boost"
              ) : (
                `Available in ${formatTime(adTimeLeft)}`
              )}
            </Button>
            {isWatchingAd && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[9px] font-black text-center text-primary uppercase mt-3 tracking-widest animate-pulse"
              >
                Finish the clip to receive your reward
              </motion.p>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/50 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground opacity-40">
            <Flame className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Consistency Drives Readiness</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
