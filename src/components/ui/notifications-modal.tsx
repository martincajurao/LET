'use client';

import React, { useState, useEffect } from 'react';
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
import { 
  Zap, 
  Bell, 
  Timer, 
  Play, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  ChevronRight,
  Flame
} from 'lucide-react';
import { COOLDOWNS, XP_REWARDS } from '@/lib/xp-system';
import { cn } from '@/lib/utils';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartQuickFire: () => void;
  onWatchAd: () => void;
  isWatchingAd?: boolean;
}

export function NotificationsModal({ 
  isOpen, 
  onClose, 
  onStartQuickFire, 
  onWatchAd,
  isWatchingAd = false
}: NotificationsModalProps) {
  const { user } = useUser();
  const [adTimeLeft, setAdTimeLeft] = useState(0);
  const [qfTimeLeft, setQfTimeLeft] = useState(0);

  useEffect(() => {
    if (!user || !isOpen) return;

    const calculateTime = () => {
      const now = Date.now();
      setAdTimeLeft(Math.max(0, (user.lastAdXpTimestamp || 0) + COOLDOWNS.AD_XP - now));
      setQfTimeLeft(Math.max(0, (user.lastQuickFireTimestamp || 0) + COOLDOWNS.QUICK_FIRE - now));
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [user, isOpen]);

  const formatTime = (ms: number) => {
    const mins = Math.ceil(ms / (1000 * 60));
    if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `${mins}m`;
  };

  const adAvailable = adTimeLeft === 0;
  const qfAvailable = qfTimeLeft === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-8 max-w-sm sm:max-w-md overflow-hidden outline-none">
        <DialogHeader className="text-left space-y-2 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight">Academic Alerts</DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Professional Rewards Hub</DialogDescription>
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
              disabled={!qfAvailable}
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
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-black text-sm">Professional Insight</p>
                  <p className="text-[10px] font-medium text-muted-foreground">+{XP_REWARDS.AD_WATCH_XP} XP & +5 Credits</p>
                </div>
              </div>
              {adAvailable ? (
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
              {isWatchingAd ? <Loader2 className="w-4 h-4 animate-spin" /> : adAvailable ? <Play className="w-4 h-4 fill-current" /> : <CheckCircle2 className="w-4 h-4" />}
              {isWatchingAd ? "Loading Clip..." : adAvailable ? "Refill Growth Boost" : `Next: ${formatTime(adTimeLeft)}`}
            </Button>
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
