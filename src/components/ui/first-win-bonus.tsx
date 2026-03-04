'use client';

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Sparkles, 
  Trophy, 
  CheckCircle2,
  Star,
  Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { FIRST_WIN_BONUS_MULTIPLIER } from '@/lib/xp-system';

interface FirstWinBonusProps {
  lastFirstWinDate?: number;
  baseXp: number;
  className?: string;
}

/**
 * First Win Bonus Component
 * Shows a 2x XP bonus indicator for the first exam of the day
 */
export function FirstWinBonus({ lastFirstWinDate, baseXp, className }: FirstWinBonusProps) {
  const isFirstWinAvailable = useMemo(() => {
    if (!lastFirstWinDate) return true;
    const now = new Date();
    const lastWin = new Date(lastFirstWinDate);
    return now.toDateString() !== lastWin.toDateString();
  }, [lastFirstWinDate]);

  const bonusXp = useMemo(() => {
    return baseXp * FIRST_WIN_BONUS_MULTIPLIER;
  }, [baseXp]);

  if (!isFirstWinAvailable) return null;

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn("flex items-center gap-2", className)}
    >
      <div className="relative">
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
          <Star className="w-5 h-5 text-white fill-current" />
        </div>
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -inset-1 bg-yellow-400/30 rounded-full"
        />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <Badge className="bg-yellow-500/20 text-yellow-700 border-none font-black text-[9px] uppercase tracking-wider">
            <Zap className="w-3 h-3 mr-1" />
            FIRST WIN
          </Badge>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Available
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg font-black text-primary">{bonusXp}</span>
          <span className="text-[10px] font-bold text-primary uppercase">XP</span>
          <span className="text-[9px] text-muted-foreground line-through">{baseXp}</span>
          <span className="text-[8px] text-yellow-600 font-black uppercase bg-yellow-500/10 px-1.5 py-0.5 rounded">
            {FIRST_WIN_BONUS_MULTIPLIER}x
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * First Win Active Badge - Shows when First Win is being applied
 */
interface FirstWinActiveProps {
  xp: number;
}

export function FirstWinActiveBadge({ xp }: FirstWinActiveProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: -20 }}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full",
        "bg-gradient-to-r from-yellow-400 to-orange-500",
        "shadow-lg shadow-yellow-500/30"
      )}
    >
      <Star className="w-5 h-5 text-white fill-current animate-spin-slow" />
      <span className="text-white font-black text-sm uppercase tracking-wider">
        First Win +{xp} XP
      </span>
      <motion.div
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="absolute inset-0 rounded-full bg-white/30"
      />
    </motion.div>
  );
}

/**
 * First Win Progress Indicator
 */
interface FirstWinProgressProps {
  isCompleted: boolean;
  className?: string;
}

export function FirstWinProgressIndicator({ isCompleted, className }: FirstWinProgressProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isCompleted ? (
        <>
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-emerald-600">First Win Complete!</p>
            <p className="text-[10px] text-muted-foreground">Come back tomorrow</p>
          </div>
        </>
      ) : (
        <>
          <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center relative">
            <Flame className="w-4 h-4 text-yellow-500" />
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 bg-yellow-500/30 rounded-lg"
            />
          </div>
          <div>
            <p className="text-sm font-black text-primary">First Win Available!</p>
            <p className="text-[10px] text-muted-foreground">Complete an exam for 2x XP</p>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Utility function to calculate XP with First Win bonus
 */
export function calculateFirstWinBonus(
  baseXp: number,
  lastFirstWinDate?: number,
  multiplier: number = FIRST_WIN_BONUS_MULTIPLIER
): { xp: number; isFirstWin: boolean } {
  if (!lastFirstWinDate) {
    return { xp: baseXp * multiplier, isFirstWin: true };
  }
  
  const now = new Date();
  const lastWin = new Date(lastFirstWinDate);
  
  if (now.toDateString() !== lastWin.toDateString()) {
    return { xp: baseXp * multiplier, isFirstWin: true };
  }
  
  return { xp: baseXp, isFirstWin: false };
}

export default FirstWinBonus;

