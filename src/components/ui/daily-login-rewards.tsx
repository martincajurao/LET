'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Gift, 
  CheckCircle2, 
  Zap,
  Trophy,
  Loader2,
  ChevronRight,
  Sparkles,
  Crown,
  ShieldCheck,
  TrendingUp,
  Star,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from '@/firebase/auth/use-user';
import { getRankData } from '@/lib/xp-system';

const BASE_REWARDS = [
  { day: 1, xp: 25, credits: 5, type: 'normal' },
  { day: 2, xp: 50, credits: 5, type: 'normal' },
  { day: 3, xp: 75, credits: 10, type: 'normal' },
  { day: 4, xp: 100, credits: 10, type: 'normal' },
  { day: 5, xp: 200, credits: 25, type: 'epic' },
  { day: 6, xp: 150, credits: 15, type: 'normal' },
  { day: 7, xp: 500, credits: 50, type: 'legendary' },
];

interface DailyLoginRewardsProps {
  currentDay: number;
  lastClaimDate?: number;
  onClaim?: (day: number, xp: number, credits: number) => Promise<void>;
}

export function DailyLoginRewards({ 
  currentDay, 
  lastClaimDate,
  onClaim 
}: DailyLoginRewardsProps) {
  const { user } = useUser();
  const [showReward, setShowReward] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [lastClaimedData, setLastClaimedData] = useState({ xp: 0, credits: 0 });

  const rankData = useMemo(() => user ? getRankData(user.xp || 0) : null, [user?.xp]);
  const multiplier = rankData?.multiplier || 1.0;

  const claimedToday = useMemo(() => {
    if (!lastClaimDate) return false;
    const now = new Date();
    const lastClaim = new Date(lastClaimDate);
    return now.toDateString() === lastClaim.toDateString();
  }, [lastClaimDate]);

  const handleClaim = async () => {
    if (isClaiming || claimedToday) return;
    const base = BASE_REWARDS[currentDay - 1];
    if (!base) return;
    const scaledXp = Math.round(base.xp * multiplier);
    const scaledCredits = Math.round(base.credits * multiplier);
    setIsClaiming(true);
    try {
      if (onClaim) await onClaim(currentDay, scaledXp, scaledCredits);
      setLastClaimedData({ xp: scaledXp, credits: scaledCredits });
      setShowReward(true);
    } catch (e) { console.error('Daily reward claim failed:', e); } 
    finally { setIsClaiming(false); }
  };

  const canClaim = currentDay > 0 && !claimedToday && !isClaiming;

  return (
    <>
      <Card className="android-surface border-none shadow-md3-2 rounded-[2.5rem] bg-card overflow-hidden">
        <CardHeader className="p-6 md:p-8 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg relative shrink-0">
                <Gift className="w-6 h-6 text-primary-foreground" />
                {!claimedToday && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-400 rounded-full animate-pulse border-2 border-card" />}
              </div>
              <div>
                <CardTitle className="text-xl md:text-2xl font-black tracking-tight">Entrance Rewards</CardTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="h-5 px-2 font-black text-[8px] uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border-none">Day {currentDay} Streak</Badge>
                  <p className="text-[9px] font-black text-muted-foreground opacity-60 uppercase tracking-widest">7-Day Cycle</p>
                </div>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Rank Boost</p>
              <div className="flex items-center justify-end gap-1 text-primary"><TrendingUp className="w-3.5 h-3.5" /><span className="text-lg font-black">{multiplier}x</span></div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-8 pt-2 space-y-4">
          <div className="grid grid-cols-1 gap-2.5">
            {BASE_REWARDS.map((reward, index) => {
              const dayNum = index + 1;
              const isPast = dayNum < currentDay;
              const isCurrent = dayNum === currentDay;
              const isVisuallyClaimed = isPast || (isCurrent && claimedToday);
              const scaledXp = Math.round(reward.xp * multiplier);
              const scaledCredits = Math.round(reward.credits * multiplier);
              return (
                <motion.div key={dayNum} className={cn("android-surface p-4 rounded-2xl flex flex-row items-center justify-between border-2", isVisuallyClaimed ? "opacity-50 grayscale-[0.3] border-transparent bg-muted/20" : isCurrent ? "border-primary bg-primary/5 ring-4 ring-primary/5 z-10" : "border-border/50", reward.type === 'legendary' && !isVisuallyClaimed && "border-yellow-400 bg-yellow-50/20")}>
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border-2 transition-all shrink-0", isVisuallyClaimed ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : isCurrent ? "bg-primary text-primary-foreground border-primary shadow-lg" : "bg-muted border-border text-muted-foreground")}>{isVisuallyClaimed ? <CheckCircle2 className="w-5 h-5" /> : dayNum}</div>
                    <div className="flex flex-col min-w-0">
                      <span className={cn("text-[9px] font-black uppercase tracking-widest truncate", isVisuallyClaimed ? "text-emerald-600" : isCurrent ? "text-primary" : "text-muted-foreground")}>{reward.type === 'legendary' ? "Grand Finale" : `Day ${dayNum}`}</span>
                      <p className="text-sm font-black text-foreground truncate">{reward.type === 'legendary' ? "Vault Overflow" : "Daily Loot"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shadow-inner", isVisuallyClaimed ? "bg-emerald-100" : isCurrent ? "bg-primary/10" : "bg-muted")}><Zap className={cn("w-3.5 h-3.5", isVisuallyClaimed ? "text-emerald-600" : isCurrent ? "text-primary" : "text-muted-foreground")} /></div>
                      <span className={cn("text-base font-black tracking-tighter", isVisuallyClaimed ? "text-emerald-700" : "text-foreground")}>{scaledXp}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shadow-inner", isVisuallyClaimed ? "bg-emerald-100" : isCurrent ? "bg-yellow-500/10" : "bg-muted")}><Sparkles className={cn("w-3.5 h-3.5", isVisuallyClaimed ? "text-emerald-600" : "text-yellow-600 animate-sparkle")} /></div>
                      <span className={cn("text-base font-black tracking-tighter", isVisuallyClaimed ? "text-emerald-700" : "text-foreground")}>{scaledCredits}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="pt-2">
            <Button onClick={handleClaim} disabled={!canClaim} className={cn("w-full h-16 rounded-2xl font-black text-lg tracking-widest gap-3 shadow-xl active:scale-95 transition-all group", canClaim ? "bg-primary text-primary-foreground shadow-primary/30 animate-focus-glow" : "bg-muted text-muted-foreground")}>
              {isClaiming ? <><Loader2 className="w-6 h-6 animate-spin" /> SYNCING...</> : claimedToday ? <><ShieldCheck className="w-6 h-6" /> CLAIMED TODAY</> : <>CLAIM DAY {currentDay} LOOT <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
            </Button>
          </div>
        </CardContent>
      </Card>
      <AnimatePresence>
        {showReward && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-xl px-4" onClick={() => setShowReward(false)}>
            <motion.div initial={{ scale: 0.8, y: 50, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.8, y: 50, opacity: 0 }} className="relative p-10 rounded-[3rem] bg-card border-none w-full max-w-sm shadow-md3-3 text-center space-y-8" onClick={(e) => e.stopPropagation()}>
              <div className="absolute -top-12 left-1/2 -translate-x-1/2"><div className="w-24 h-24 bg-primary text-primary-foreground rounded-[2rem] flex items-center justify-center shadow-2xl animate-victory ring-8 ring-background"><Trophy className="w-12 h-12" /></div></div>
              <div className="pt-8 space-y-1"><h3 className="text-3xl font-black tracking-tighter">Loot Secured!</h3><p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">Trace Recorded Successfully</p></div>
              <div className="grid grid-cols-1 gap-3">
                <div className="p-5 rounded-[1.75rem] bg-primary/10 border-2 border-primary/20 flex items-center justify-between px-8"><div className="flex items-center gap-3"><Zap className="w-6 h-6 text-primary fill-current" /><span className="text-[9px] font-black uppercase tracking-widest text-primary">Growth</span></div><p className="text-3xl font-black text-primary tracking-tighter">+{lastClaimedData.xp}</p></div>
                <div className="p-5 rounded-[1.75rem] bg-yellow-500/10 border-2 border-yellow-500/20 flex items-center justify-between px-8"><div className="flex items-center gap-3"><Sparkles className="w-6 h-6 text-yellow-600 fill-current animate-sparkle" /><span className="text-[9px] font-black uppercase tracking-widest text-yellow-600">Credits</span></div><p className="text-3xl font-black text-yellow-600 tracking-tighter">+{lastClaimedData.credits}</p></div>
              </div>
              <Button onClick={() => setShowReward(false)} className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl active:scale-95 transition-all">Back to Ground</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
