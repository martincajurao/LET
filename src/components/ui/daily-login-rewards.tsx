'use client';

import React, { useState, useMemo } from 'react';
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
  Sparkles,
  Crown,
  ShieldCheck,
  TrendingUp,
  Coins
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

  const getRewardColor = (type: string) => {
    switch (type) {
      case 'epic': return 'text-purple-500 border-purple-200 bg-purple-500/10';
      case 'legendary': return 'text-amber-600 border-amber-200 bg-amber-500/10';
      default: return 'text-emerald-600 border-emerald-200 bg-emerald-500/10';
    }
  };

  const canClaim = currentDay > 0 && !claimedToday && !isClaiming;

  return (
    <>
      <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden transition-all duration-500">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-xl shadow-rose-500/20">
                <Gift className="w-7 h-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black tracking-tight">Daily Entrance</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="h-5 px-2 font-black text-[9px] uppercase tracking-widest border-primary/20 text-primary bg-primary/5">
                    Day {currentDay} of 7
                  </Badge>
                  <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground">
                    <TrendingUp className="w-3 h-3" />
                    <span>Rate: {multiplier}x</span>
                  </div>
                </div>
              </div>
            </div>
            {claimedToday ? (
              <div className="flex flex-col items-end">
                <Badge className="bg-emerald-500 text-white font-black text-[10px] uppercase px-4 py-1 rounded-full shadow-lg shadow-emerald-500/20 border-none">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Verified
                </Badge>
              </div>
            ) : (
              <Badge className="bg-primary/20 text-primary font-black text-[10px] uppercase px-4 py-1 rounded-full animate-pulse border-none">
                <Zap className="w-3.5 h-3.5 mr-1.5 fill-current" /> Ready
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-8 pt-4 space-y-8">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-60">
              <span>Weekly Persistence</span>
              <span>{Math.round((currentDay / 7) * 100)}%</span>
            </div>
            <Progress value={(currentDay / 7) * 100} className="h-2 rounded-full bg-muted shadow-inner" />
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
            {BASE_REWARDS.map((reward, index) => {
              const dayNum = index + 1;
              const isPast = dayNum < currentDay;
              const isCurrent = dayNum === currentDay;
              const isFuture = dayNum > currentDay;
              const isVisuallyClaimed = isPast || (isCurrent && claimedToday);
              
              const scaledXp = Math.round(reward.xp * multiplier);
              const scaledCredits = Math.round(reward.credits * multiplier);

              return (
                <motion.div 
                  key={dayNum}
                  initial={false}
                  animate={isCurrent && !claimedToday ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={cn(
                    "relative p-2 rounded-2xl text-center border-2 transition-all flex flex-col items-center justify-between min-h-[130px] overflow-hidden",
                    isVisuallyClaimed ? "bg-emerald-500/5 border-emerald-500/20" : 
                    isCurrent ? "bg-primary/5 border-primary shadow-lg ring-4 ring-primary/5" :
                    "bg-card border-border/50 opacity-60",
                    reward.type === 'legendary' && !isVisuallyClaimed && "border-amber-400 bg-amber-500/5",
                    reward.type === 'epic' && !isVisuallyClaimed && "border-purple-400 bg-purple-500/5"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center mb-1 shadow-inner transition-colors",
                    isVisuallyClaimed ? "bg-emerald-500/20" :
                    isCurrent ? "bg-primary text-primary-foreground" :
                    reward.type === 'legendary' ? "bg-amber-500 text-white" : 
                    reward.type === 'epic' ? "bg-purple-500 text-white" : "bg-muted"
                  )}>
                    {isVisuallyClaimed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : reward.type === 'legendary' ? (
                      <Crown className="w-4 h-4 fill-current" />
                    ) : reward.type === 'epic' ? (
                      <Trophy className="w-4 h-4" />
                    ) : (
                      <span className="font-black text-xs">{dayNum}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 flex flex-col items-center justify-center gap-1">
                    <div className="flex flex-col items-center">
                      <p className={cn(
                        "text-sm font-black font-mono leading-none tracking-tighter",
                        isVisuallyClaimed ? "text-emerald-600" : isCurrent ? "text-primary" : "text-foreground"
                      )}>+{scaledXp}</p>
                      <p className="text-[7px] font-black uppercase text-muted-foreground tracking-widest">XP</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className={cn(
                        "text-[10px] font-black font-mono leading-none tracking-tighter",
                        isVisuallyClaimed ? "text-emerald-600" : isCurrent ? "text-primary" : "text-foreground"
                      )}>+{scaledCredits}</p>
                      <p className="text-[7px] font-black uppercase text-muted-foreground tracking-widest">Credits</p>
                    </div>
                  </div>

                  <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest leading-none mt-1">Day {dayNum}</p>
                  
                  {isCurrent && !claimedToday && (
                    <motion.div 
                      layoutId="check-indicator"
                      className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-lg"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-primary-foreground fill-current animate-sparkle" />
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="space-y-4">
            <Button 
              onClick={handleClaim} 
              disabled={!canClaim} 
              className={cn(
                "w-full h-16 rounded-[1.5rem] font-black text-lg gap-3 active:scale-95 transition-all shadow-2xl group",
                canClaim ? "bg-primary text-primary-foreground shadow-primary/30" : "bg-muted text-muted-foreground"
              )}
            >
              {isClaiming ? (
                <><Loader2 className="w-6 h-6 animate-spin" /> Synchronizing Trace...</>
              ) : claimedToday ? (
                <><ShieldCheck className="w-6 h-6" /> Resume Simulation</>
              ) : (
                <><Sparkles className="w-6 h-6 fill-current group-hover:animate-pulse" /> Claim Day {currentDay} Reward</>
              )}
            </Button>

            {canClaim && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-6 rounded-[2rem] border-2 border-dashed flex items-center justify-between shadow-inner bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-white/20"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <Star className="w-6 h-6 fill-current text-yellow-300 animate-sparkle" />
                  </div>
                  <div>
                    <p className="font-black text-lg uppercase tracking-tight">Today's Loot</p>
                    <p className="text-[10px] font-black opacity-80 uppercase tracking-widest flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Career Bonus Applied ({multiplier}x)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black font-mono tracking-tighter">+{Math.round(BASE_REWARDS[currentDay - 1].xp * multiplier)} XP</p>
                  <p className="text-xs font-black font-mono opacity-90">+{Math.round(BASE_REWARDS[currentDay - 1].credits * multiplier)} Credits</p>
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {showReward && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
            onClick={() => setShowReward(false)}
          >
            <motion.div 
              initial={{ scale: 0.5, y: 100, opacity: 0 }} 
              animate={{ scale: 1, y: 0, opacity: 1 }} 
              exit={{ scale: 0.5, y: 100, opacity: 0 }} 
              className="relative p-10 rounded-[3rem] bg-card border-none w-full max-w-sm shadow-[0_40px_100px_rgba(0,0,0,0.5)] text-center space-y-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                <div className="w-24 h-24 bg-primary text-primary-foreground rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-primary/40 animate-victory">
                  <Trophy className="w-12 h-12" />
                </div>
              </div>

              <div className="pt-8 space-y-2">
                <h3 className="text-3xl font-black tracking-tighter">Vault Recharged!</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">Day {currentDay} Check-in Complete</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-[2rem] bg-primary/10 border-2 border-primary/20 space-y-1">
                  <p className="text-4xl font-black text-primary font-mono tracking-tighter">+{lastClaimedData.xp}</p>
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest">XP Yield</p>
                </div>
                <div className="p-6 rounded-[2rem] bg-yellow-500/10 border-2 border-yellow-500/20 space-y-1">
                  <p className="text-4xl font-black text-yellow-600 font-mono tracking-tighter">+{lastClaimedData.credits}</p>
                  <p className="text-[10px] font-black uppercase text-yellow-700 tracking-widest">Credits</p>
                </div>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={() => setShowReward(false)} 
                  className="w-full h-16 rounded-[1.75rem] font-black text-lg uppercase tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all"
                >
                  Continue Journey
                </Button>
                <div className="flex items-center justify-center gap-2 text-muted-foreground opacity-40">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">Verified Professional Trace</span>
                </div>
              </div>

              {/* Sparkle Particles */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[3rem]">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: [0, 1, 0], y: -150, x: (i - 3.5) * 40 }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                    className="absolute bottom-0 left-1/2"
                  >
                    <Sparkles className="w-4 h-4 text-primary/40 fill-current" />
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