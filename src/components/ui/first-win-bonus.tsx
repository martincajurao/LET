'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Zap, 
  Sparkles, 
  Trophy, 
  Flame,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Star,
  Award,
  Gift,
  Target,
  Timer,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '@/hooks/use-sound';
import { CelebrationEffect, useCelebration, FloatingXP } from './celebration-effects';

interface FirstWinBonusProps {
  isEligible: boolean; // User hasn't had their first win today
  onClaim?: (bonusXp: number) => Promise<void>;
  baseXp: number;
  multiplier?: number;
  lastClaimTime?: number;
}

export function FirstWinBonus({
  isEligible,
  onClaim,
  baseXp = 100,
  multiplier = 2,
  lastClaimTime
}: FirstWinBonusProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [claimedXp, setClaimedXp] = useState(0);
  const { playLevelUp, playAchievement } = useSound();
  const { celebration, triggerConfetti, clearCelebration } = useCelebration();

  const bonusXp = baseXp * multiplier;
  const bonus = bonusXp - baseXp;

  // Show dialog when eligible
  useEffect(() => {
    if (isEligible && !showDialog && !showSuccess) {
      setShowDialog(true);
    }
  }, [isEligible, showDialog, showSuccess]);

  const handleClaim = async () => {
    if (!onClaim || isClaiming) return;
    
    setIsClaiming(true);
    playAchievement();
    
    try {
      await onClaim(bonusXp);
      setClaimedXp(bonusXp);
      setShowSuccess(true);
      triggerConfetti();
      
      // Auto close after 3 seconds
      setTimeout(() => {
        setShowDialog(false);
        setShowSuccess(false);
      }, 3000);
    } catch (e) {
      console.error('Failed to claim first win bonus:', e);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
  };

  if (!isEligible && !showSuccess) return null;

  return (
    <>
      <Dialog open={showDialog} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent 
          className="rounded-[2.5rem] bg-card border-none shadow-2xl p-0 max-w-[380px] overflow-hidden outline-none"
          hideCloseButton={isClaiming || showSuccess}
        >
          {/* Header with celebration theme */}
          <div className={cn(
            "p-8 flex flex-col items-center justify-center relative overflow-hidden",
            showSuccess 
              ? "bg-gradient-to-br from-emerald-500/20 to-green-500/20" 
              : "bg-gradient-to-br from-primary/10 to-yellow-500/10"
          )}>
            {/* Animated background elements */}
            {!showSuccess && (
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: [0, 0.5, 0], 
                      scale: [0, 1.5, 1.5],
                      y: [0, -100]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      delay: i * 0.3 
                    }}
                    className="absolute"
                    style={{ left: `${20 + i * 12}%`, top: '60%' }}
                  >
                    <Sparkles className="w-4 h-4 text-yellow-500 fill-current" />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Main icon */}
            <motion.div
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 200 }}
              className={cn(
                "w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl relative z-10",
                showSuccess 
                  ? "bg-emerald-500 text-white" 
                  : "bg-gradient-to-br from-yellow-400 to-orange-500 text-white"
              )}
            >
              {showSuccess ? (
                <CheckCircle2 className="w-10 h-10" />
              ) : (
                <Star className="w-10 h-10 fill-current" />
              )}
              
              {/* Glow effect */}
              {!showSuccess && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-yellow-400 to-orange-500 blur-xl -z-10"
                />
              )}
            </motion.div>
          </div>

          {/* Content */}
          <div className="p-8 text-center space-y-6">
            {showSuccess ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight">
                    First Win Secured! 🎉
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground font-medium">
                    Your daily bonus has been applied
                  </DialogDescription>
                </DialogHeader>

                {/* XP Gained */}
                <div className="bg-emerald-500/10 rounded-2xl p-6 border-2 border-emerald-500/20">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Zap className="w-6 h-6 text-emerald-500 fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                      XP Earned
                    </span>
                  </div>
                  <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-5xl font-black text-emerald-600"
                  >
                    +{claimedXp}
                  </motion.div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Keep the momentum going! More rewards await.
                </p>
              </motion.div>
            ) : (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 font-black text-[8px] uppercase tracking-widest">
                      2X Bonus Active
                    </Badge>
                  </div>
                  <DialogTitle className="text-2xl font-black tracking-tight">
                    First Win of the Day!
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground font-medium">
                    Complete your first exam today for double XP rewards!
                  </DialogDescription>
                </DialogHeader>

                {/* Bonus breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Zap className="w-4 h-4 text-muted-foreground" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                        Base XP
                      </span>
                    </div>
                    <p className="text-2xl font-black text-foreground">{baseXp}</p>
                  </div>
                  <div className="bg-yellow-500/10 rounded-2xl p-4 border-2 border-yellow-500/20">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Sparkles className="w-4 h-4 text-yellow-500 animate-sparkle" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-yellow-600">
                        Bonus
                      </span>
                    </div>
                    <p className="text-2xl font-black text-yellow-600">+{bonus}</p>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-primary/10 rounded-2xl p-4 border-2 border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black uppercase tracking-widest text-primary">
                      Total XP
                    </span>
                    <span className="text-3xl font-black text-primary">{bonusXp}</span>
                  </div>
                </div>

                {/* Action */}
                <Button 
                  onClick={handleClaim}
                  disabled={isClaiming}
                  className="w-full h-14 rounded-2xl font-black text-base gap-3 shadow-xl shadow-primary/30 active:scale-95 transition-all"
                >
                  {isClaiming ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5" />
                      Claim {bonusXp} XP
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </Button>

                <p className="text-[9px] text-muted-foreground uppercase tracking-widest">
                  Only available once per day
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Celebration effects */}
      {showSuccess && (
        <CelebrationEffect
          show={showSuccess}
          type="confetti"
          intensity={60}
        />
      )}
    </>
  );
}

// Mini version for dashboard display
interface FirstWinMiniProps {
  isEligible: boolean;
  onClick?: () => void;
}

export function FirstWinMini({ isEligible, onClick }: FirstWinMiniProps) {
  if (!isEligible) return null;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30 rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg relative">
            <Star className="w-6 h-6 text-white fill-current" />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-xl bg-yellow-400 blur-md -z-10"
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-foreground">First Win Bonus!</p>
            <p className="text-[10px] text-muted-foreground font-medium">Tap to claim 2X XP</p>
          </div>
          <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1.5 rounded-full">
            <Zap className="w-4 h-4 text-yellow-600 fill-current" />
            <span className="text-sm font-black text-yellow-700">2X</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default FirstWinBonus;

