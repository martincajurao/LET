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
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Bell, 
  Timer, 
  Play, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  ChevronRight,
  Flame,
  ShieldAlert,
  Coins,
  Gift
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
  onRewardClaimed?: (amount: number) => void;
}

export function NotificationsModal({ 
  isOpen, 
  onClose, 
  onStartQuickFire, 
  onWatchAd,
  isWatchingAd = false,
  isVerifyingAd = false,
  onRewardClaimed
}: NotificationsModalProps) {
  const { user, refreshUser } = useUser();
  const [adTimeLeft, setAdTimeLeft] = useState(0);
  const [qfTimeLeft, setQfTimeLeft] = useState(0);
  const [showRewardDialog, setShowRewardDialog] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  
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
    if (!userRef.current || !isOpen) return;

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
    const mins = Math.ceil(ms / (1000 * 60));
    if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `${mins}m`;
  };

  const adReachedLimit = (user?.dailyAdCount || 0) >= DAILY_AD_LIMIT;
  const adAvailable = adTimeLeft === 0 && !adReachedLimit;
  const qfAvailable = qfTimeLeft === 0;

  const handleClose = () => {
    onClose();
  };

  const handleRewardClaim = () => {
    setShowRewardDialog(true);
    setRewardAmount(5);
    refreshUser();
    onRewardClaimed?.(5);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-8 max-w-sm sm:max-w-md overflow-hidden outline-none" hideCloseButton={isWatchingAd}>
          <DialogHeader className="text-left space-y-2 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                {isVerifyingAd ? <ShieldAlert className="w-6 h-6 text-primary animate-pulse" /> : <Bell className="w-6 h-6 text-primary" />}
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">{isVerifyingAd ? "Verifying Access" : "Academic Alerts"}</DialogTitle>
                <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{isVerifyingAd ? "Syncing professional record..." : "Professional Rewards Hub"}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Quick Fire Teaser */}
            <div className={cn(
              "p-5 rounded-3xl border-2 transition-all",
              qfAvailable ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-transparent opacity-80"
            )}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
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
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground">
                    <Timer className="w-3.5 h-3.5" />
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
                className="w-full h-12 rounded-xl font-black text-xs gap-2 shadow-lg"
              >
                {qfAvailable ? "Begin Challenge" : `Locked: ${formatTime(qfTimeLeft)}`}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Ad Teaser */}
            <div className={cn(
              "p-5 rounded-3xl border-2 transition-all",
              adAvailable ? "bg-yellow-500/5 border-yellow-500/20" : "bg-muted/30 border-transparent opacity-80"
            )}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                    adAvailable ? "bg-yellow-500 text-white" : "bg-background text-muted-foreground"
                  )}>
                    {isVerifyingAd ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <Sparkles className="w-5 h-5" />}
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
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground">
                    <Timer className="w-3.5 h-3.5" />
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
                  "w-full h-12 rounded-xl font-black text-xs gap-2 shadow-lg",
                  adAvailable ? "bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-500/20" : ""
                )}
              >
                {isWatchingAd ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isVerifyingAd ? "Finalizing..." : "Watching Clip..."}
                  </div>
                ) : adReachedLimit ? (
                  <><CheckCircle2 className="w-4 h-4" /> Limit Reached</>
                ) : adAvailable ? (
                  "Refill Growth Boost"
                ) : (
                  `Next: ${formatTime(adTimeLeft)}`
                )}
              </Button>
              {isWatchingAd && (
                <p className="text-[9px] font-black text-center text-primary uppercase mt-3 tracking-widest animate-pulse">
                  Finish the clip to receive your reward
                </p>
              )}
              {adReachedLimit && (
                <p className="text-[8px] font-bold text-center text-muted-foreground uppercase mt-2 tracking-widest">Allowance: {DAILY_AD_LIMIT}/{DAILY_AD_LIMIT} clips</p>
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

      {/* Reward Success Dialog */}
      <Dialog open={showRewardDialog} onOpenChange={setShowRewardDialog}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 max-w-[320px] overflow-hidden outline-none">
          <div className="bg-primary/10 p-10 flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
              className="w-20 h-20 bg-primary text-primary-foreground rounded-[2rem] flex items-center justify-center shadow-2xl relative z-10"
            >
              <CheckCircle2 className="w-10 h-10" />
            </motion.div>
            
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent z-0" 
            />
            
            <div className="absolute inset-0 z-5 pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 0], y: -80, x: (i - 2) * 30 }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                  className="absolute bottom-0 left-1/2"
                >
                  <Sparkles className="w-3 h-3 text-primary fill-current" />
                </motion.div>
              ))}
            </div>
          </div>
          
          <div className="p-8 pt-2 text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">Mission Accomplished!</DialogTitle>
                <DialogDescription className="text-muted-foreground font-semibold text-[10px] uppercase tracking-[0.2em]">
                  Credits Added to Vault
                </DialogDescription>
              </DialogHeader>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-muted/30 rounded-2xl p-4 border border-border/50 flex flex-col items-center gap-1"
            >
              <span className="text-[9px] font-black uppercase text-muted-foreground">Reward Total</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border-2 border-yellow-500/20">
                  <Coins className="w-7 h-7 text-yellow-600 fill-current" />
                  <span className="text-4xl font-black text-yellow-700">+5</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <Button 
                onClick={() => {
                  setShowRewardDialog(false);
                  setRewardAmount(0);
                  refreshUser();
                }}
                className="w-full h-14 rounded-2xl font-black text-base gap-2 shadow-lg shadow-primary/25 group"
              >
                Continue Mission
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
