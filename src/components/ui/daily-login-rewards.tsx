
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Gift, 
  Star, 
  Lock,
  CheckCircle2,
  Zap,
  Trophy,
  Loader2,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const DAILY_REWARDS = [
  { day: 1, xp: 25, credits: 5, type: 'normal' },
  { day: 2, xp: 50, credits: 10, type: 'normal' },
  { day: 3, xp: 75, credits: 15, type: 'normal' },
  { day: 4, xp: 100, credits: 20, type: 'normal' },
  { day: 5, xp: 150, credits: 25, type: 'special' },
  { day: 6, xp: 125, credits: 30, type: 'normal' },
  { day: 7, xp: 250, credits: 50, type: 'legendary' },
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
  const [showReward, setShowReward] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [selectedReward, setSelectedReward] = useState<typeof DAILY_REWARDS[0] | null>(null);

  const claimedToday = React.useMemo(() => {
    if (!lastClaimDate) return false;
    const now = new Date();
    const lastClaim = new Date(lastClaimDate);
    return now.toDateString() === lastClaim.toDateString();
  }, [lastClaimDate]);

  const handleClaim = async () => {
    if (isClaiming || claimedToday) return;
    
    const reward = DAILY_REWARDS[currentDay - 1];
    if (!reward) return;

    setIsClaiming(true);
    try {
      setSelectedReward(reward);
      if (onClaim) {
        await onClaim(currentDay, reward.xp, reward.credits);
      }
      setShowReward(true);
    } catch (e) {
      console.error('Failed to claim reward:', e);
    } finally {
      setIsClaiming(false);
    }
  };

  const getRewardTypeColor = (type: string) => {
    switch (type) {
      case 'special': return 'from-purple-400 to-purple-600 border-purple-400';
      case 'legendary': return 'from-yellow-400 to-orange-500 border-yellow-400';
      default: return 'from-emerald-400 to-emerald-600 border-emerald-400';
    }
  };

  const getRewardBgColor = (type: string) => {
    switch (type) {
      case 'special': return 'bg-purple-500/10';
      case 'legendary': return 'bg-yellow-500/10';
      default: return 'bg-emerald-500/10';
    }
  };

  const canClaim = currentDay > 0 && !claimedToday && !isClaiming;

  return (
    <>
      <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
        <CardHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-black">Daily Rewards</CardTitle>
                <p className="text-xs text-muted-foreground font-medium">Day {currentDay} of 7</p>
              </div>
            </div>
            {claimedToday ? (
              <Badge className="bg-green-500/20 text-green-500 font-bold border-none">
                <CheckCircle2 className="w-3 h-3 mr-1" />Claimed
              </Badge>
            ) : (
              <Badge className="bg-primary/20 text-primary font-bold animate-pulse border-none">
                <Zap className="w-3 h-3 mr-1" />Available
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Progress value={(currentDay / 7) * 100} className="h-2 rounded-full" />
          <div className="grid grid-cols-7 gap-2">
            {DAILY_REWARDS.map((reward, index) => {
              const dayNum = index + 1;
              const isPast = dayNum < currentDay;
              const isCurrent = dayNum === currentDay;
              const isFuture = dayNum > currentDay;
              
              const isVisuallyClaimed = isPast || (isCurrent && claimedToday);
              
              return (
                <div key={dayNum} className={cn(
                  "relative p-2 rounded-xl text-center transition-all", 
                  isFuture && "opacity-40", 
                  isCurrent && !claimedToday && "ring-2 ring-primary ring-offset-2", 
                  isVisuallyClaimed && "bg-green-500/10", 
                  !isFuture && !isVisuallyClaimed && getRewardBgColor(reward.type)
                )}>
                  <div className={cn(
                    "w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-1", 
                    isFuture && "bg-muted", 
                    isVisuallyClaimed && "bg-green-500/20", 
                    isCurrent && !claimedToday && "bg-gradient-to-br from-primary to-primary/80"
                  )}>
                    {isFuture ? (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    ) : isVisuallyClaimed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <span className={cn("font-black text-sm", isCurrent ? "text-white" : "text-foreground")}>{dayNum}</span>
                    )}
                  </div>
                  <p className="text-[8px] font-bold text-muted-foreground">Day {dayNum}</p>
                  {!isFuture && !isVisuallyClaimed && (
                    <div className={cn("absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center", reward.type === 'legendary' ? "bg-yellow-500" : reward.type === 'special' ? "bg-purple-500" : "bg-emerald-500")}>
                      <span className="text-[8px] font-bold text-white">+</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Button 
            onClick={handleClaim} 
            disabled={!canClaim} 
            className={cn(
              "w-full h-12 rounded-xl font-black text-base gap-2 active:scale-95 transition-all", 
              canClaim ? "bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30" : "bg-muted text-muted-foreground"
            )}
          >
            {isClaiming ? (
              <><Loader2 className="w-5 h-5 animate-spin" />Syncing Trace...</>
            ) : claimedToday ? (
              <><CheckCircle2 className="w-5 h-5" />Come Back Tomorrow</>
            ) : (
              <><Gift className="w-5 h-5" />Claim Today's Reward</>
            )}
          </Button>
          {canClaim && (
            <div className={cn("p-4 rounded-xl border-2 border-dashed", getRewardTypeColor(DAILY_REWARDS[currentDay - 1]?.type || 'normal'), getRewardBgColor(DAILY_REWARDS[currentDay - 1]?.type || 'normal'))}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-emerald-500 animate-sparkle" />
                  <div>
                    <p className="font-bold">Today's Reward</p>
                    <p className="text-xs text-muted-foreground">{DAILY_REWARDS[currentDay - 1]?.xp} XP + {DAILY_REWARDS[currentDay - 1]?.credits} AI Credits</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {showReward && selectedReward && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4" onClick={() => setShowReward(false)}>
            <motion.div initial={{ scale: 0.5, y: 50, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.5, y: 50, opacity: 0 }} className={cn("relative p-10 rounded-[2.5rem] bg-card border-4 w-full max-w-sm shadow-2xl", getRewardTypeColor(selectedReward.type))} onClick={(e) => e.stopPropagation()}>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-yellow-500 rounded-2xl flex items-center justify-center shadow-xl animate-bounce">
                <Star className="w-8 h-8 text-white fill-current" />
              </div>
              <div className="text-center space-y-6">
                <div className={cn("w-24 h-24 mx-auto rounded-3xl flex items-center justify-center bg-gradient-to-br", getRewardTypeColor(selectedReward.type), "bg-white shadow-inner")}>
                  <Trophy className="w-12 h-12 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-3xl font-black tracking-tight">Vault Rewarded!</h3>
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mt-1 opacity-60">Day {currentDay} Simulation Complete</p>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <div className="px-5 py-3 rounded-2xl bg-primary/10 border border-primary/20">
                    <p className="text-3xl font-black text-primary leading-none">+{selectedReward.xp}</p>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">XP</p>
                  </div>
                  <div className="px-5 py-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-3xl font-black text-yellow-600 leading-none">+{selectedReward.credits}</p>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Credits</p>
                  </div>
                </div>
                <Button onClick={() => setShowReward(false)} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">Launch Learning Path</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default DailyLoginRewards;
