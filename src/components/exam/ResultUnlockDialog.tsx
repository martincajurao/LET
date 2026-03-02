
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { 
  Lock, 
  Play, 
  Crown, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert,
  Loader2,
  CheckCircle2,
  BrainCircuit,
  Star,
  Zap,
  Timer,
  Fingerprint
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DAILY_AD_LIMIT, AI_UNLOCK_COST, XP_REWARDS } from '@/lib/xp-system';

interface ResultUnlockDialogProps {
  open: boolean;
  onClose: () => void;
  onUnlock: () => void;
  questionsCount: number;
  correctAnswers: number;
  timeSpent: number;
}

export function ResultUnlockDialog({ 
  open, 
  onClose, 
  onUnlock, 
  questionsCount, 
  correctAnswers, 
  timeSpent 
}: ResultUnlockDialogProps) {
  const { user, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [unlockMethod, setUnlockMethod] = useState<'ad' | 'credits' | null>(null);
  const [adProgress, setAdProgress] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Insufficient Credits Dialog State
  const [creditError, setCreditError] = useState<{ required: number; current: number } | null>(null);
  const [watchingAdForRefill, setWatchingAdForRefill] = useState(false);
  const [verifyingAdForRefill, setVerifyingAdForRefill] = useState(false);

  const isPro = !!user?.isPro;
  const credits = typeof user?.credits === 'number' ? user.credits : 0;
  const canWatchAd = (user?.dailyAdCount || 0) < DAILY_AD_LIMIT;

  useEffect(() => {
    if (open) {
      setUnlockMethod(null);
      setAdProgress(0);
      setVerifying(false);
      setUnlocking(false);
      setShowSuccess(false);
    }
  }, [open]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (unlocking && unlockMethod === 'ad' && !verifying) {
      interval = setInterval(() => {
        setAdProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + Math.random() * 15 + 5;
        });
      }, 300);
    } else if (verifying) {
      interval = setInterval(() => {
        setAdProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            handleUnlockComplete();
            return 100;
          }
          return prev + 8;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [unlocking, unlockMethod, verifying]);

  const handleUnlockWithAd = async () => {
    if (!user || !firestore || !canWatchAd) return;
    
    setUnlockMethod('ad');
    setUnlocking(true);
    
    setTimeout(() => {
      setVerifying(true);
    }, 3500);
  };

  const handleUnlockWithCredits = async () => {
    if (!user || !firestore) return;
    
    if (credits < AI_UNLOCK_COST) {
      setCreditError({ required: AI_UNLOCK_COST, current: credits });
      return;
    }
    
    setUnlockMethod('credits');
    setUnlocking(true);
    
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        credits: increment(-AI_UNLOCK_COST)
      });
      
      setTimeout(() => {
        handleUnlockComplete();
      }, 1500);
    } catch (e) {
      toast({ 
        variant: "destructive", 
        title: "Transaction Failed", 
        description: "Could not process credit deduction. Please try again." 
      });
      setUnlocking(false);
      setUnlockMethod(null);
    }
  };

  const handleRefillFromDialog = async () => {
    if (!user || !firestore) return;
    if (!canWatchAd) {
      toast({ title: "Limit Reached", description: "Daily allowance for clips reached.", variant: "destructive" });
      return;
    }

    setWatchingAdForRefill(true);
    setVerifyingAdForRefill(false);

    setTimeout(async () => {
      setVerifyingAdForRefill(true);
      setTimeout(async () => {
        try {
          const userRef = doc(firestore, 'users', user.uid);
          await updateDoc(userRef, {
            credits: increment(5),
            xp: increment(XP_REWARDS.AD_WATCH_XP),
            lastAdXpTimestamp: Date.now(),
            dailyAdCount: increment(1)
          });
          await refreshUser();
          toast({ variant: "reward", title: "Refill Success!", description: "+5 Credits added to vault." });
          setCreditError(null);
        } catch (e) {
          toast({ variant: "destructive", title: "Sync Failed", description: "Verification failed." });
        } finally {
          setWatchingAdForRefill(false);
          setVerifyingAdForRefill(false);
        }
      }, 1500);
    }, 3500);
  };

  const handleUnlockComplete = () => {
    setShowSuccess(true);
    setTimeout(() => {
      onUnlock();
    }, 2000);
  };

  if (isPro) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !unlocking && onClose()}>
        <DialogContent className="rounded-[3rem] bg-card border-none shadow-md3-3 p-0 max-w-[420px] overflow-hidden outline-none z-[1100]" hideCloseButton={unlocking}>
          <div className="relative p-10 pb-6 text-center overflow-hidden">
            {/* Theme-blended Background Accent */}
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
              <Lock className="w-32 h-32" />
            </div>
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="relative z-10 space-y-4"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border-2 border-primary/20 shadow-xl">
                {verifying ? (
                  <ShieldCheck className="w-10 h-10 text-primary animate-victory" />
                ) : (
                  <BrainCircuit className="w-10 h-10 text-primary" />
                )}
              </div>
              
              <div className="space-y-1">
                <DialogTitle className="text-3xl font-black tracking-tight text-foreground">
                  {showSuccess ? "Vault Calibrated" : "Trace Locked"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium text-sm max-w-[280px] mx-auto leading-relaxed">
                  {showSuccess 
                    ? "Professional analysis is now accessible. Synchronizing results..."
                    : "Simulated battle complete. Unlock the pedagogical report to identify your gaps."
                  }
                </DialogDescription>
              </div>
            </motion.div>

            {/* Truncated Session Info (NO GRADE) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-4 mt-8 mb-4 relative z-10"
            >
              <div className="bg-muted/30 rounded-2xl p-4 px-6 border border-border/50 flex flex-col items-center">
                <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">Session Volume</span>
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-primary fill-current" />
                  <span className="text-lg font-black">{questionsCount} Items</span>
                </div>
              </div>
              <div className="bg-muted/30 rounded-2xl p-4 px-6 border border-border/50 flex flex-col items-center">
                <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">Trace Time</span>
                <div className="flex items-center gap-2">
                  <Timer className="w-3.5 h-3.5 text-primary" />
                  <span className="text-lg font-black">{Math.floor(timeSpent / 60)}m {timeSpent % 60}s</span>
                </div>
              </div>
            </motion.div>
          </div>

          <AnimatePresence mode="wait">
            {!showSuccess && (
              <motion.div
                key="unlock-options"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-8 pb-10 space-y-4 relative z-10"
              >
                <div className="h-[1px] w-full bg-border/50 mb-6" />
                
                <Button
                  onClick={handleUnlockWithAd}
                  disabled={unlocking || !canWatchAd}
                  className={cn(
                    "w-full h-16 rounded-[1.75rem] font-black text-xs uppercase tracking-widest gap-3 transition-all relative overflow-hidden group shadow-xl active:scale-95",
                    canWatchAd 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30" 
                      : "bg-muted text-muted-foreground cursor-not-allowed border-none shadow-none"
                  )}
                >
                  <div className="flex items-center justify-between w-full px-2">
                    <div className="flex items-center gap-3">
                      {unlocking && unlockMethod === 'ad' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Play className="w-5 h-5 fill-current" />
                      )}
                      <div className="text-left">
                        <p className="leading-none">
                          {unlocking && unlockMethod === 'ad' 
                            ? verifying ? "VERIFYING..." : "CALIBRATING..." 
                            : "Unlock via Clip"
                          }
                        </p>
                        {!unlocking && <p className="text-[8px] font-bold opacity-70 mt-1 uppercase tracking-tighter">FREE • {DAILY_AD_LIMIT - (user?.dailyAdCount || 0)} LEFT TODAY</p>}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-white/10 border-white/20 text-white text-[8px] font-black tracking-widest px-2">
                      {unlocking ? "BUSY" : "AVAIL"}
                    </Badge>
                  </div>
                  
                  {unlocking && unlockMethod === 'ad' && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      className="absolute bottom-0 left-0 h-1 bg-white/20"
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${adProgress}%` }}
                        className="h-full bg-white"
                      />
                    </motion.div>
                  )}
                </Button>

                <Button
                  onClick={handleUnlockWithCredits}
                  disabled={unlocking}
                  variant="outline"
                  className={cn(
                    "w-full h-16 rounded-[1.75rem] font-black text-xs uppercase tracking-widest gap-3 border-2 transition-all relative overflow-hidden group active:scale-95 shadow-sm",
                    credits >= AI_UNLOCK_COST 
                      ? "border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary" 
                      : "border-muted/50 bg-muted/10 text-muted-foreground"
                  )}
                >
                  <div className="flex items-center justify-between w-full px-2">
                    <div className="flex items-center gap-3">
                      {unlocking && unlockMethod === 'credits' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5 fill-current animate-sparkle" />
                      )}
                      <div className="text-left">
                        <p className="leading-none">Instant Unlock</p>
                        <p className="text-[8px] font-bold opacity-70 mt-1 uppercase tracking-tighter">
                          {credits >= AI_UNLOCK_COST ? `USE ${AI_UNLOCK_COST} CREDITS` : `NEED ${AI_UNLOCK_COST - credits} MORE`}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn(
                      "font-black text-[10px] border-none shadow-sm",
                      credits >= AI_UNLOCK_COST ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {credits}c
                    </Badge>
                  </div>
                </Button>

                <div className="pt-2 text-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
                    Premium educators get unlimited vault access
                  </p>
                </div>
              </motion.div>
            )}

            {showSuccess && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-10 pb-12 text-center"
              >
                <div className="w-full h-[1px] bg-border/50 mb-10" />
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
                  className="w-20 h-20 bg-emerald-500 text-white rounded-[2.25rem] flex items-center justify-center shadow-2xl mx-auto mb-6"
                >
                  <CheckCircle2 className="w-10 h-10" />
                </motion.div>
                
                <div className="space-y-2">
                  <p className="text-xl font-black tracking-tight text-foreground">Vault Decrypted</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
                    Accessing analytical data...
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Credit Refill Dialog - Theme Blended */}
      <Dialog open={!!creditError} onOpenChange={() => !watchingAdForRefill && setCreditError(null)}>
        <DialogContent className="rounded-[3rem] bg-card border-none shadow-md3-3 p-0 max-w-[360px] overflow-hidden outline-none z-[1200]" hideCloseButton={watchingAdForRefill}>
          <div className="bg-amber-500/10 p-12 flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 bg-card rounded-[2rem] flex items-center justify-center shadow-xl relative z-10 border-2 border-amber-200"
            >
              {verifyingAdForRefill ? <ShieldAlert className="w-10 h-10 text-amber-500 animate-pulse" /> : <Sparkles className="w-10 h-10 text-amber-500 fill-current animate-sparkle" />}
            </motion.div>
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent z-0" 
            />
          </div>
          
          <div className="p-8 text-center space-y-8">
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-600 mb-1">Insufficient Credits</span>
              <DialogTitle className="text-2xl font-black tracking-tight text-foreground">Vault restricted</DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium text-sm leading-relaxed px-4">
                Unlock requires <span className="text-foreground font-black">{creditError?.required}c</span>. You currently have <span className="text-amber-600 font-black">{creditError?.current}c</span> in your vault.
              </DialogDescription>
            </div>

            <div className="grid gap-3">
              <Button 
                onClick={handleRefillFromDialog}
                disabled={watchingAdForRefill || !canWatchAd}
                className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-widest gap-3 shadow-lg bg-primary text-primary-foreground active:scale-95 transition-all"
              >
                {verifyingAdForRefill ? <Loader2 className="w-5 h-5 animate-spin" /> : watchingAdForRefill ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                {watchingAdForRefill ? (verifyingAdForRefill ? "VERIFYING..." : "WATCHING...") : `Watch Ad (+5c)`}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setCreditError(null)}
                className="w-full h-12 rounded-xl font-bold text-[10px] uppercase tracking-widest text-muted-foreground"
                disabled={watchingAdForRefill}
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
