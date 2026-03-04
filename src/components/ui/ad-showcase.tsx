'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Play,
  Sparkles,
  Zap,
  Trophy,
  Gift,
  Star,
  Flame,
  Loader2,
  ShieldCheck,
  Coins,
  Target,
  TrendingUp,
  Video,
  Lock,
  Unlock,
  Timer,
  Award,
  Rocket,
  Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from 'framer-motion';
import { AD_SHOWCASE, AD_SHOWCASE as SHOWCASE } from '@/lib/xp-system';

interface AdShowcaseProps {
  // Props if needed
}

export function AdShowcase({}: AdShowcaseProps) {
  const { user, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isWatching, setIsWatching] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [earnedRewards, setEarnedRewards] = useState({ credits: 0, xp: 0 });
  const [consecutiveAds, setConsecutiveAds] = useState(0);
  const [sessionAdCount, setSessionAdCount] = useState(0);
  const [showBonusDialog, setShowBonusDialog] = useState(false);
  const [bonusType, setBonusType] = useState<string>('');

  // Calculate remaining ads
  const adsRemaining = useMemo(() => {
    if (!user) return 0;
    const watched = user.dailyAdCount || 0;
    return Math.max(0, SHOWCASE.MAX_SHOWCASE_ADS_PER_DAY - watched);
  }, [user?.dailyAdCount]);

  // Calculate bonus multiplier based on consecutive ads
  const bonusMultiplier = useMemo(() => {
    if (consecutiveAds >= 10) return SHOWCASE.BONUS_STREAK_10;
    if (consecutiveAds >= 5) return SHOWCASE.BONUS_STREAK_5;
    if (consecutiveAds >= 3) return SHOWCASE.BONUS_STREAK_3;
    return 1.0;
  }, [consecutiveAds]);

  // Check for session bonuses
  const sessionBonus = useMemo(() => {
    if (sessionAdCount >= 30) return { type: 'JACKPOT', amount: SHOWCASE.SESSION_BONUS_ADS_30 };
    if (sessionAdCount >= 20) return { type: 'MEGA', amount: SHOWCASE.SESSION_BONUS_ADS_20 };
    if (sessionAdCount >= 10) return { type: 'SUPER', amount: SHOWCASE.SESSION_BONUS_ADS_10 };
    return null;
  }, [sessionAdCount]);

  const handleWatchAd = async () => {
    if (!user || !firestore || isWatching || adsRemaining <= 0) return;

    setIsWatching(true);
    setWatchProgress(0);

    // Simulate ad watching (in production, this would be real AdMob)
    const totalSteps = 10;
    const stepDuration = 350; // 3.5 seconds total
    
    for (let i = 1; i <= totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, stepDuration));
      setWatchProgress((i / totalSteps) * 100);
    }

    setIsWatching(false);
    setIsVerifying(true);

    // Simulate verification
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      // Calculate rewards with bonus
      const baseCredits = SHOWCASE.AD_REWARD_CREDITS;
      const baseXp = SHOWCASE.AD_REWARD_XP;
      
      const bonusCredits = Math.round(baseCredits * bonusMultiplier);
      const bonusXp = Math.round(baseXp * bonusMultiplier);

      // Update user profile
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        credits: increment(bonusCredits),
        xp: increment(bonusXp),
        dailyAdCount: increment(1),
        lastAdXpTimestamp: Date.now(),
      });

      // Update session stats
      const newConsecutive = consecutiveAds + 1;
      const newSessionCount = sessionAdCount + 1;
      setConsecutiveAds(newConsecutive);
      setSessionAdCount(newSessionCount);

      setEarnedRewards({ credits: bonusCredits, xp: bonusXp });
      setShowSuccess(true);

      // Check for session bonuses
      if (newSessionCount === 10 || newSessionCount === 20 || newSessionCount === 30) {
        const bonus = sessionBonus;
        if (bonus) {
          await updateDoc(userRef, {
            credits: increment(bonus.amount),
          });
          setBonusType(bonus.type);
          setShowBonusDialog(true);
        }
      }

      await refreshUser();
    } catch (e) {
      toast({ variant: "destructive", title: "Reward Failed", description: "Could not add rewards." });
    } finally {
      setIsVerifying(false);
    }
  };

  // Bonus tier display
  const bonusTiers = [
    { count: 3, multiplier: SHOWCASE.BONUS_STREAK_3, label: '3 Streak', icon: <Star className="w-4 h-4" />, color: 'bg-blue-500' },
    { count: 5, multiplier: SHOWCASE.BONUS_STREAK_5, label: '5 Streak', icon: <Trophy className="w-4 h-4" />, color: 'bg-purple-500' },
    { count: 10, multiplier: SHOWCASE.BONUS_STREAK_10, label: '10 Streak', icon: <Crown className="w-4 h-4" />, color: 'bg-yellow-500' },
  ];

  return (
    <>
      <Card className="android-surface border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden">
        <CardHeader className="p-6 md:p-8 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                  Ad Showcase
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 font-black text-[8px]">
                    VOLUNTARY
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                  Watch ads to boost your progress
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20">
                <Sparkles className="w-4 h-4 text-yellow-600 fill-current animate-sparkle" />
                <span className="text-lg font-black text-yellow-700">{adsRemaining}</span>
                <span className="text-[8px] font-black text-yellow-600 uppercase">left</span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 md:p-8 pt-0 space-y-6">
          {/* Current Session Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-[9px] font-black text-muted-foreground uppercase">Streak</span>
              </div>
              <div className="text-2xl font-black text-foreground">{consecutiveAds}</div>
              <div className="text-[8px] text-muted-foreground">consecutive ads</div>
            </div>
            <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-4 h-4 text-primary" />
                <span className="text-[9px] font-black text-muted-foreground uppercase">Session</span>
              </div>
              <div className="text-2xl font-black text-foreground">{sessionAdCount}</div>
              <div className="text-[8px] text-muted-foreground">ads watched</div>
            </div>
          </div>

          {/* Bonus Multiplier Display */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Bonus Multiplier</span>
              <span className="text-lg font-black text-primary">{bonusMultiplier}x</span>
            </div>
            <div className="flex gap-2">
              {bonusTiers.map((tier) => (
                <div 
                  key={tier.count}
                  className={cn(
                    "flex-1 rounded-xl p-3 text-center border-2 transition-all",
                    consecutiveAds >= tier.count 
                      ? `${tier.color}/20 border-${tier.color.split('-')[1]}/30` 
                      : "bg-muted/30 border-transparent opacity-50"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center", tier.color, consecutiveAds >= tier.count ? "text-white" : "bg-muted text-muted-foreground")}>
                    {tier.icon}
                  </div>
                  <div className="text-[8px] font-black text-muted-foreground uppercase">{tier.label}</div>
                  <div className="text-xs font-black text-foreground">{tier.multiplier}x</div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress to next bonus */}
          {consecutiveAds < 10 && (
            <div className="space-y-2">
              <div className="flex justify-between text-[8px] font-black text-muted-foreground uppercase">
                <span>Next bonus at {consecutiveAds >= 5 ? 10 : consecutiveAds >= 3 ? 5 : 3}</span>
                <span>{consecutiveAds} / {consecutiveAds >= 5 ? 10 : 5}</span>
              </div>
              <Progress 
                value={(consecutiveAds / (consecutiveAds >= 5 ? 10 : 5)) * 100} 
                className="h-2 rounded-full"
              />
            </div>
          )}

          {/* Watch Ad Button */}
          <Button
            onClick={handleWatchAd}
            disabled={isWatching || isVerifying || adsRemaining <= 0}
            className={cn(
              "w-full h-16 rounded-2xl font-black text-base gap-3 shadow-xl group relative overflow-hidden",
              adsRemaining > 0 
                ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-yellow-500/30" 
                : "bg-muted text-muted-foreground"
            )}
          >
            {isWatching && (
              <div 
                className="absolute inset-0 bg-white/20 transition-all"
                style={{ width: `${watchProgress}%` }}
              />
            )}
            {isWatching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Watching... {Math.round(watchProgress)}%</span>
              </>
            ) : isVerifying ? (
              <>
                <ShieldCheck className="w-5 h-5 animate-pulse" />
                <span>Verifying...</span>
              </>
            ) : adsRemaining <= 0 ? (
              <>
                <Lock className="w-5 h-5" />
                <span>Daily Limit Reached</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Watch Ad</span>
                <div className="ml-auto flex items-center gap-1 bg-white/20 px-3 py-1 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                  <span>+{SHOWCASE.AD_REWARD_CREDITS}</span>
                </div>
              </>
            )}
          </Button>

          {/* Reward Preview */}
          <div className="bg-muted/20 rounded-xl p-4 border border-dashed border-border/50">
            <div className="flex items-center justify-between text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3">
              <span>Your Reward</span>
              <span>With {bonusMultiplier}x Bonus</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-lg font-black text-foreground">+{Math.round(SHOWCASE.AD_REWARD_CREDITS * bonusMultiplier)}</div>
                  <div className="text-[7px] font-bold text-muted-foreground uppercase">Credits</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-black text-foreground">+{Math.round(SHOWCASE.AD_REWARD_XP * bonusMultiplier)}</div>
                  <div className="text-[7px] font-bold text-muted-foreground uppercase">XP</div>
                </div>
              </div>
            </div>
          </div>

          {/* Session Bonuses */}
          <div className="space-y-2">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Session Bonuses</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { count: 10, reward: SHOWCASE.SESSION_BONUS_ADS_10, icon: <Target className="w-4 h-4" /> },
                { count: 20, reward: SHOWCASE.SESSION_BONUS_ADS_20, icon: <Rocket className="w-4 h-4" /> },
                { count: 30, reward: SHOWCASE.SESSION_BONUS_ADS_30, icon: <Crown className="w-4 h-4" /> },
              ].map((tier) => (
                <div 
                  key={tier.count}
                  className={cn(
                    "rounded-xl p-2 text-center border-2",
                    sessionAdCount >= tier.count
                      ? "bg-yellow-500/20 border-yellow-500/30"
                      : "bg-muted/30 border-transparent"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center",
                    sessionAdCount >= tier.count ? "bg-yellow-500 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {sessionAdCount >= tier.count ? <Unlock className="w-4 h-4" /> : tier.icon}
                  </div>
                  <div className="text-[8px] font-black text-muted-foreground">{tier.count} ads</div>
                  <div className="text-xs font-black text-yellow-700">+{tier.reward}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="rounded-[3rem] border-none shadow-2xl p-0 max-w-[340px] overflow-hidden outline-none">
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 p-10 flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div 
              initial={{ scale: 0, rotate: -45 }} 
              animate={{ scale: 1, rotate: 0 }} 
              transition={{ type: "spring", damping: 12, stiffness: 200 }} 
              className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl relative z-10"
            >
              <Gift className="w-10 h-10" />
            </motion.div>
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 z-0" />
          </div>
          <div className="p-8 pt-4 text-center space-y-6">
            <div className="space-y-1">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                  {bonusMultiplier > 1 ? `${bonusMultiplier}x BONUS!` : 'Rewards Earned!'}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-black text-[9px] uppercase tracking-widest">
                  Ad Watch Complete
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-yellow-500/10 rounded-2xl p-4 border-2 border-yellow-500/20">
                <Sparkles className="w-6 h-6 text-yellow-600 mx-auto mb-2 animate-sparkle" />
                <div className="text-3xl font-black text-yellow-700">+{earnedRewards.credits}</div>
                <div className="text-[8px] font-black text-yellow-600 uppercase">Credits</div>
              </div>
              <div className="bg-primary/10 rounded-2xl p-4 border-2 border-primary/20">
                <Zap className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-3xl font-black text-primary">+{earnedRewards.xp}</div>
                <div className="text-[8px] font-black text-primary uppercase">XP</div>
              </div>
            </div>
            <Button onClick={() => setShowSuccess(false)} className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest gap-2 shadow-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600">
              Continue Watching <Play className="w-4 h-4 fill-current" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bonus Dialog */}
      <Dialog open={showBonusDialog} onOpenChange={setShowBonusDialog}>
        <DialogContent className="rounded-[3rem] border-none shadow-2xl p-0 max-w-[340px] overflow-hidden outline-none">
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-10 flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div 
              initial={{ scale: 0, rotate: -180 }} 
              animate={{ scale: 1, rotate: 0 }} 
              transition={{ type: "spring", damping: 10, stiffness: 150 }} 
              className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-[2rem] flex items-center justify-center shadow-2xl relative z-10"
            >
              <Trophy className="w-12 h-12" />
            </motion.div>
            <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-gradient-to-br from-purple-500/40 to-pink-500/40 z-0" />
          </div>
          <div className="p-8 pt-4 text-center space-y-6">
            <div className="space-y-1">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black tracking-tight text-foreground">
                  🎉 {bonusType} BONUS!
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-black text-[9px] uppercase tracking-widest">
                  Session Milestone Reached!
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border-2 border-purple-500/30">
              <div className="flex items-center justify-center gap-3">
                <Sparkles className="w-8 h-8 text-purple-600 animate-sparkle" />
                <div className="text-5xl font-black text-purple-700">
                  +{sessionBonus?.amount}
                </div>
                <Sparkles className="w-8 h-8 text-pink-600 animate-sparkle" />
              </div>
              <div className="text-[10px] font-black text-purple-600 uppercase mt-2">Bonus Credits</div>
            </div>
            <Button onClick={() => setShowBonusDialog(false)} className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest gap-2 shadow-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600">
              Awesome! <Award className="w-5 h-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Standalone button for Navbar or other locations
export function AdShowcaseButton({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className={cn("gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-700 border-yellow-500/30", className)}
      >
        <Video className="w-4 h-4" />
        <span className="text-xs font-black uppercase">Watch Ads</span>
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg p-0 rounded-[2rem]">
          <AdShowcase />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AdShowcase;

