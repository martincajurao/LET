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
  Gem,
  Crown,
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
  onClaim?: (day: number, xp: number, credits: number) => void;
}

export function DailyLoginRewards({ 
  currentDay, 
  lastClaimDate,
  onClaim 
}: DailyLoginRewardsProps) {
  const [showReward, setShowReward] = useState(false);
  const [claimedToday, setClaimedToday] = useState(false);
  const [selectedReward, setSelectedReward] = useState<typeof DAILY_REWARDS[0] | null>(null);

  useEffect(() => {
    if (lastClaimDate) {
      const now = new Date();
      const lastClaim = new Date(lastClaimDate);
      const isSameDay = now.toDateString() === lastClaim.toDateString();
      setClaimedToday(isSameDay);
    }
  }, [lastClaimDate]);

  const handleClaim = () => {
    const reward = DAILY_REWARDS[currentDay - 1];
    if (reward && !claimedToday) {
      setSelectedReward(reward);
      setShowReward(true);
      if (onClaim) {
        onClaim(currentDay, reward.xp, reward.credits);
      }
      setClaimedToday(true);
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

  const canClaim = currentDay > 0 && !claimedToday;

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
              <Badge className="bg-green-500/20 text-green-500 font-bold">
                <CheckCircle2 className="w-3 h-3 mr-1" />Claimed
              </Badge>
            ) : (
              <Badge className="bg-primary/20 text-primary font-bold animate-pulse">
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
              const isClaimed = dayNum < currentDay;
              const isCurrent = dayNum === currentDay;
              const isLocked = dayNum > currentDay;
              return (
                <div key={dayNum} className={cn("relative p-2 rounded-xl text-center transition-all", isLocked && "opacity-40", isCurrent && !isClaimed && "ring-2 ring-primary ring-offset-2", isClaimed && "bg-green-500/10", !isLocked && !isClaimed && getRewardBgColor(reward.type))}>
                  <div className={cn("w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-1", isLocked && "bg-muted", isClaimed && "bg-green-500/20", isCurrent && !isClaimed && "bg-gradient-to-br from-primary to-primary/80")}>
                    {isLocked ? <Lock className="w-4 h-4 text-muted-foreground" /> : isClaimed ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <span className={cn("font-black text-sm", isCurrent ? "text-white" : "text-foreground")}>{dayNum}</span>}
                  </div>
                  <p className="text-[8px] font-bold text-muted-foreground">Day {dayNum}</p>
                  {!isLocked && <div className={cn("absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center", reward.type === 'legendary' ? "bg-yellow-500" : reward.type === 'special' ? "bg-purple-500" : "bg-emerald-500")}><span className="text-[8px] font-bold text-white">+</span></div>}
                </div>
              );
            })}
          </div>
          <Button onClick={handleClaim} disabled={!canClaim} className={cn("w-full h-12 rounded-xl font-black text-base gap-2", canClaim ? "bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30 hover:scale-[1.02]" : "bg-muted text-muted-foreground")}>
            {claimedToday ? <><CheckCircle2 className="w-5 h-5" />Come Back Tomorrow</> : <><Gift className="w-5 h-5" />Claim Today's Reward</>}
          </Button>
          {canClaim && (
            <div className={cn("p-4 rounded-xl border", getRewardTypeColor(DAILY_REWARDS[currentDay - 1]?.type || 'normal'), getRewardBgColor(DAILY_REWARDS[currentDay - 1]?.type || 'normal'))}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-emerald-500 animate-sparkle" />
                  <div><p className="font-bold">Today's Reward</p><p className="text-xs text-muted-foreground">{DAILY_REWARDS[currentDay - 1]?.xp} XP + {DAILY_REWARDS[currentDay - 1]?.credits} AI Credits</p></div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {showReward && selectedReward && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowReward(false)}>
            <motion.div initial={{ scale: 0.5, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.5, y: 50 }} className={cn("relative p-8 rounded-[2rem] bg-card border-4", getRewardTypeColor(selectedReward.type))} onClick={(e) => e.stopPropagation()}>
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center animate-bounce"><Star className="w-6 h-6 text-white fill-current" /></div>
              <div className="text-center space-y-4">
                <div className={cn("w-20 h-20 mx-auto rounded-2xl flex items-center justify-center bg-gradient-to-br", getRewardTypeColor(selectedReward.type), "bg-white")}><Trophy className="w-10 h-10 text-amber-500" /></div>
                <div><h3 className="text-2xl font-black">Reward Claimed!</h3><p className="text-muted-foreground">Day {currentDay} Complete</p></div>
                <div className="flex items-center justify-center gap-4">
                  <div className="px-4 py-2 rounded-xl bg-primary/10"><p className="text-2xl font-black text-primary">+{selectedReward.xp}</p><p className="text-xs text-muted-foreground font-bold">XP</p></div>
                  <div className="px-4 py-2 rounded-xl bg-yellow-500/10"><p className="text-2xl font-black text-yellow-500">+{selectedReward.credits}</p><p className="text-xs text-muted-foreground font-bold">AI Credits</p></div>
                </div>
                <Button onClick={() => setShowReward(false)} className="w-full h-12 rounded-xl font-black">Awesome!</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default DailyLoginRewards;
