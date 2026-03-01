'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Star
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
      if (onClaim) {
        await onClaim(currentDay, scaledXp, scaledCredits);
      }
      setLastClaimedData({ xp: scaledXp, credits: scaledCredits });
      setShowReward(true);
    } catch (e) {
      console.error('Daily reward claim failed:', e);
    } finally {
      setIsClaiming(false);
    }
  };

  const canClaim = currentDay > 0 && !claimedToday && !isClaiming;

  return (
    <>
      <Card className="border-none shadow-2xl rounded-[3rem] bg-card overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-primary/20 relative">
                <Gift className="w-8 h-8 text-primary-foreground" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-pulse shadow-sm" />
              </div>
              <div>
                <CardTitle className="text-3xl font-black tracking-tight">Entrance Rewards</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="h-5 px-3 font-black text-[10px] uppercase tracking-widest border-primary/30 text-primary bg-primary/5">
                    Day {currentDay} Streak
                  </Badge>
                  <p className="text-[10px] font-black text-muted-foreground opacity-60 uppercase tracking-[0.2em]">7-Day Cycle</p>
                </div>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Rank Multiplier</p>
              <div className="flex items-center justify-end gap-1.5 text-primary">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xl font-black">{multiplier}x</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8 pt-4 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            {/* Split for mobile vs desktop or just single column flex-col if preferred, but user requested horizontal content IN card. 
                Applying horizontal layout internal to cards while maintaining grid structure. */}
            <div className="grid grid-cols-1 gap-3">
              {BASE_REWARDS.map((reward, index) => {
                const dayNum = index + 1;
                const isPast = dayNum < currentDay;
                const isCurrent = dayNum === currentDay;
                const isVisuallyClaimed = isPast || (isCurrent && claimedToday);
                const isLegendary = reward.type === 'legendary';
                const isEpic = reward.type === 'epic';
                
                const scaledXp = Math.round(reward.xp * multiplier);
                const scaledCredits = Math.round(reward.credits * multiplier);

                return (
                  <motion.div 
                    key={dayNum}
                    initial={false}
                    animate={isCurrent && !claimedToday ? { scale: [1, 1.01, 1] } : {}}
                    transition={{ duration: 3, repeat: Infinity }}
                    className={cn(
                      "relative p-5 rounded-[2rem] border-2 transition-all flex flex-row items-center justify-between min-h-[80px]",
                      isVisuallyClaimed ? "bg-emerald-500/5 border-emerald-500/10 opacity-60" : 
                      isCurrent ? "bg-card border-primary shadow-2xl ring-8 ring-primary/5 z-10" :
                      "bg-muted/20 border-border/50",
                      isLegendary && "border-yellow-400 bg-yellow-50/30",
                      isEpic && !isVisuallyClaimed && "border-purple-200 bg-purple-50/30"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border-2 transition-all",
                        isVisuallyClaimed ? "bg-emerald-100 border-emerald-200 text-emerald-600" :
                        isCurrent ? "bg-primary text-primary-foreground border-primary" :
                        "bg-muted border-border text-muted-foreground"
                      )}>
                        {isVisuallyClaimed ? <CheckCircle2 className="w-5 h-5" /> : dayNum}
                      </div>
                      <div className="flex flex-col">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          isVisuallyClaimed ? "text-emerald-600" : isCurrent ? "text-primary" : "text-muted-foreground"
                        )}>
                          {isLegendary ? "Grand Prize" : `Day ${dayNum}`}
                        </span>
                        {isLegendary && <p className="text-[8px] font-bold text-yellow-600 uppercase">Weekly Milestone</p>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shadow-inner",
                          isVisuallyClaimed ? "bg-emerald-100" : isCurrent ? "bg-primary/10" : "bg-muted"
                        )}>
                          <Zap className={cn("w-4 h-4", isVisuallyClaimed ? "text-emerald-600" : isCurrent ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <p className={cn("text-lg font-black tracking-tighter", isVisuallyClaimed ? "text-emerald-700" : "text-foreground")}>+{scaledXp}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shadow-inner",
                          isVisuallyClaimed ? "bg-emerald-100" : isCurrent ? "bg-yellow-500/10" : "bg-muted",
                          isLegendary && "bg-yellow-500/20"
                        )}>
                          {isLegendary ? (
                            <Crown className="w-4 h-4 text-yellow-600 fill-current animate-victory" />
                          ) : (
                            <Sparkles className={cn("w-4 h-4", isVisuallyClaimed ? "text-emerald-600" : "text-yellow-600 animate-sparkle")} />
                          )}
                        </div>
                        <p className={cn("text-lg font-black tracking-tighter", isVisuallyClaimed ? "text-emerald-700" : "text-foreground")}>+{scaledCredits}</p>
                      </div>
                    </div>

                    {isCurrent && !claimedToday && (
                      <motion.div 
                        layoutId="active-ring"
                        className="absolute inset-0 border-2 border-primary rounded-[2rem] pointer-events-none"
                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 pt-4">
            {!claimedToday && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-[2.5rem] bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-2 border-dashed border-primary/20 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-card rounded-[1.25rem] flex items-center justify-center shadow-xl border border-primary/10">
                    <Star className="w-7 h-7 text-primary fill-current animate-victory" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Ready to Claim</p>
                    <p className="text-xl font-black text-foreground">Day {currentDay} Loot</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 text-primary">
                      <span className="font-black text-lg">+{Math.round(BASE_REWARDS[currentDay - 1].xp * multiplier)}</span>
                      <Zap className="w-4 h-4 fill-current" />
                    </div>
                    <div className="flex items-center gap-1 text-yellow-600">
                      <span className="font-black text-lg">+{Math.round(BASE_REWARDS[currentDay - 1].credits * multiplier)}</span>
                      <Sparkles className="w-4 h-4 fill-current" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <Button 
              onClick={handleClaim} 
              disabled={!canClaim} 
              className={cn(
                "w-full h-20 rounded-[2rem] font-black text-xl tracking-widest gap-4 active:scale-95 transition-all shadow-2xl group",
                canClaim ? "bg-primary text-primary-foreground shadow-primary/30 animate-focus-glow" : "bg-muted text-muted-foreground"
              )}
            >
              {isClaiming ? (
                <><Loader2 className="w-7 h-7 animate-spin" /> SYNCHRONIZING...</>
              ) : claimedToday ? (
                <><ShieldCheck className="w-7 h-7" /> VAULT SECURED</>
              ) : (
                <><Sparkles className="w-7 h-7 fill-current group-hover:animate-pulse" /> CLAIM REWARDS</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {showReward && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/90 backdrop-blur-xl px-4"
            onClick={() => setShowReward(false)}
          >
            <motion.div 
              initial={{ scale: 0.5, y: 100, opacity: 0 }} 
              animate={{ scale: 1, y: 0, opacity: 1 }} 
              exit={{ scale: 0.5, y: 100, opacity: 0 }} 
              className="relative p-12 rounded-[4rem] bg-card border-none w-full max-w-sm shadow-[0_40px_120px_rgba(0,0,0,0.6)] text-center space-y-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute -top-16 left-1/2 -translate-x-1/2">
                <div className="w-32 h-32 bg-primary text-primary-foreground rounded-[3rem] flex items-center justify-center shadow-2xl shadow-primary/40 animate-victory ring-[12px] ring-background">
                  <Trophy className="w-16 h-16" />
                </div>
              </div>

              <div className="pt-12 space-y-2">
                <h3 className="text-4xl font-black tracking-tighter">Day {currentDay} Secured!</h3>
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-60">Professional Trace Recorded</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="p-6 rounded-[2.5rem] bg-primary/10 border-2 border-primary/20 flex items-center justify-between px-10">
                  <div className="flex items-center gap-4">
                    <Zap className="w-8 h-8 text-primary fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Growth</span>
                  </div>
                  <p className="text-4xl font-black text-primary font-mono tracking-tighter">+{lastClaimedData.xp}</p>
                </div>
                <div className="p-6 rounded-[2.5rem] bg-yellow-500/10 border-2 border-yellow-500/20 flex items-center justify-between px-10">
                  <div className="flex items-center gap-4">
                    <Sparkles className="w-8 h-8 text-yellow-600 fill-current animate-sparkle" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600">Credits</span>
                  </div>
                  <p className="text-4xl font-black text-yellow-600 font-mono tracking-tighter">+{lastClaimedData.credits}</p>
                </div>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={() => setShowReward(false)} 
                  className="w-full h-16 rounded-[2rem] font-black text-lg uppercase tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all"
                >
                  Enter learning ground
                </Button>
                <div className="flex items-center justify-center gap-2 text-muted-foreground opacity-40">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">Verified Secure Reward</span>
                </div>
              </div>

              {/* Sparkle Particles */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[4rem]">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: [0, 1, 0], y: -250, x: (i - 5.5) * 50 }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.15 }}
                    className="absolute bottom-0 left-1/2"
                  >
                    <Sparkles className="w-5 h-5 text-primary/30 fill-current" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default DailyLoginRewards;
