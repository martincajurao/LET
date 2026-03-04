'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Snowflake, 
  Zap, 
  Coins, 
  CheckCircle2, 
  Loader2,
  Shield,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { STREAK_FREEZE_COST_CREDITS, STREAK_FREEZE_COST_XP } from '@/lib/xp-system';

interface StreakFreezeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StreakFreezeDialog({ isOpen, onClose, onSuccess }: StreakFreezeDialogProps) {
  const { user, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseType, setPurchaseType] = useState<'credits' | 'xp' | null>(null);

  const handlePurchase = async (type: 'credits' | 'xp') => {
    if (!user || !firestore) return;

    setIsPurchasing(true);
    setPurchaseType(type);

    try {
      const userRef = doc(firestore, 'users', user.uid);
      
      if (type === 'credits') {
        // Purchase with credits
        if ((user.credits || 0) < STREAK_FREEZE_COST_CREDITS) {
          toast({
            variant: "destructive",
            title: "Insufficient Credits",
            description: `You need ${STREAK_FREEZE_COST_CREDITS} credits to purchase streak freeze.`
          });
          setIsPurchasing(false);
          setPurchaseType(null);
          return;
        }

        await updateDoc(userRef, {
          credits: increment(-STREAK_FREEZE_COST_CREDITS),
          streakFreezesAvailable: increment(1),
          lastStreakFreezeUsed: Date.now()
        });
      } else {
        // Purchase with XP
        if ((user.xp || 0) < STREAK_FREEZE_COST_XP) {
          toast({
            variant: "destructive",
            title: "Insufficient XP",
            description: `You need ${STREAK_FREEZE_COST_XP} XP to purchase streak freeze.`
          });
          setIsPurchasing(false);
          setPurchaseType(null);
          return;
        }

        await updateDoc(userRef, {
          xp: increment(-STREAK_FREEZE_COST_XP),
          streakFreezesAvailable: increment(1),
          lastStreakFreezeUsed: Date.now()
        });
      }

      await refreshUser();
      
      toast({
        variant: "reward",
        title: "Streak Freeze Acquired!",
        description: "Your streak is now protected for 24 hours."
      });

      onSuccess?.();
      onClose();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Purchase Failed",
        description: "Could not complete purchase. Please try again."
      });
    } finally {
      setIsPurchasing(false);
      setPurchaseType(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-0 max-w-[360px] overflow-hidden outline-none">
        <DialogHeader className="p-6 pb-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-[2rem] flex items-center justify-center shadow-xl shadow-cyan-500/30">
              <Snowflake className="w-10 h-10 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight">Streak Freeze</DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            Protect your streak from resetting! One streak freeze prevents streak loss for 24 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Current Status */}
          <div className="bg-muted/30 rounded-2xl p-4 border-2 border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">Current Streak</p>
                  <p className="text-xs text-muted-foreground">Protection available</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-orange-500">{user?.streakCount || 0}</p>
                <p className="text-[8px] text-muted-foreground uppercase">days</p>
              </div>
            </div>
          </div>

          {/* Purchase Options */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground text-center">
              Choose Payment Method
            </p>
            
            {/* Credits Option */}
            <button
              onClick={() => handlePurchase('credits')}
              disabled={isPurchasing}
              className={cn(
                "w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between",
                "hover:border-yellow-500/50 hover:bg-yellow-500/5",
                user && (user.credits || 0) < STREAK_FREEZE_COST_CREDITS 
                  ? "opacity-50 cursor-not-allowed" 
                  : "cursor-pointer"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                  <Coins className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-foreground">Pay with Credits</p>
                  <p className="text-xs text-muted-foreground">Instant purchase</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-yellow-500 text-yellow-900 font-black">
                  {STREAK_FREEZE_COST_CREDITS}c
                </Badge>
              </div>
            </button>

            {/* XP Option */}
            <button
              onClick={() => handlePurchase('xp')}
              disabled={isPurchasing}
              className={cn(
                "w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between",
                "hover:border-primary/50 hover:bg-primary/5",
                user && (user.xp || 0) < STREAK_FREEZE_COST_XP 
                  ? "opacity-50 cursor-not-allowed" 
                  : "cursor-pointer"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-foreground">Pay with XP</p>
                  <p className="text-xs text-muted-foreground">Earn while you learn</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-primary text-primary-foreground font-black">
                  {STREAK_FREEZE_COST_XP} XP
                </Badge>
              </div>
            </button>
          </div>

          {/* Info */}
          <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
            <p className="text-xs text-blue-700 font-medium text-center">
              💡 Streak freezes last 24 hours. Use them before your streak resets!
            </p>
          </div>
        </div>

        <div className="p-4 border-t bg-muted/20">
          <Button 
            variant="ghost"
            onClick={onClose}
            disabled={isPurchasing}
            className="w-full h-12 rounded-xl font-black text-sm"
          >
            Cancel
          </Button>
        </div>

        {/* Loading Overlay */}
        <AnimatePresence>
          {isPurchasing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-card/80 backdrop-blur-sm flex items-center justify-center rounded-[2.5rem]"
            >
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <p className="text-sm font-black text-muted-foreground">
                  {purchaseType === 'credits' ? 'Deducting Credits...' : 'Deducting XP...'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// Mini button for dashboard
interface StreakFreezeButtonProps {
  onClick: () => void;
  streakCount?: number;
}

export function StreakFreezeButton({ onClick, streakCount = 0 }: StreakFreezeButtonProps) {
  if (streakCount < 3) return null; // Only show for 3+ day streaks

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
    >
      <Snowflake className="w-3.5 h-3.5 text-cyan-500" />
      <span className="text-[10px] font-black text-cyan-600 uppercase">Get Freeze</span>
    </button>
  );
}

export default StreakFreezeDialog;

