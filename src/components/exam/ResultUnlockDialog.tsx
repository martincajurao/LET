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
  Sparkles, 
  ShieldCheck, 
  ShieldAlert,
  Loader2,
  CheckCircle2,
  BrainCircuit,
  Star,
  Zap,
  Timer,
  AlertTriangle,
  ChevronRight
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
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);

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
      setShowAbortConfirm(false);
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
        description: "Could not process credit deduction." 
      });
      setUnlocking(false);
      setUnlockMethod(null);
    }
  };

  const handleRefillFromDialog = async () => {
    if (!user || !firestore) return;
    if (!canWatchAd) {
      toast({ title: "Limit Reached", description: "Daily clips maxed.", variant: "destructive" });
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
          toast({ variant: "reward", title: "Refill Success!", description: "+5 Credits added." });
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

  const handleAbort = () => {
    onClose();
    window.location.reload(); 
  };

  if (isPro) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent 
          className="rounded-[3.5rem] bg-card border-none shadow-md3-3 p-0 max-w-[440px] overflow-hidden outline-none z-[1100]" 
          persistent={true}
          hideCloseButton={true}
        >
          <div className="relative p-12 pb-6 text-center overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
              <Lock className="w-40 h-40" />
            </div>
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-10 space-y-6"
            >
              <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border-2 border-primary/20 shadow-2xl relative">
                {verifying ? (
                  <ShieldCheck className="w-12 h-12 text-primary animate-victory" />
                ) : (
                  <BrainCircuit className="w-12 h-12 text-primary" />
                )}
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-card border-2 border-primary rounded-full flex items-center justify-center shadow-lg">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
              </div>
              
              <div className="space-y-2">
                <DialogTitle className="text-4xl font-black tracking-tighter text-foreground">
                  {showSuccess ? "Vault Decrypted" : "Analysis Gated"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium text-base max-w-[320px] mx-auto leading-relaxed">
                  {showSuccess 
                    ? "Calibration secure. Synchronizing professional results..."
                    : "Simulation complete. Unlock the analytical roadmap to access your board rating and item review."
                  }
                </DialogDescription>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-4 mt-10 mb-6 relative z-10"
            >
              <div className="bg-muted/30 rounded-[1.75rem] p-5 px-8 border border-border/50 flex flex-col items-center">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">Items</span>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary fill-current" />
                  <span className="text-xl font-black">{questionsCount}</span>
                </div>
              </div>
              <div className="bg-muted/30 rounded-[1.75rem] p-5 px-8 border border-border/50 flex flex-col items-center">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">Pacing</span>
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-primary" />
                  <span className="text-xl font-black">{Math.floor(timeSpent / 60)}m</span>
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
                className="px-10 pb-12 space-y-4 relative z-10"
              >
                <div className="h-[1px] w-full bg-border/50 mb-8" />
                
                <Button
                  onClick={handleUnlockWithAd}
                  disabled={unlocking || !canWatchAd}
                  className={cn(
                    "w-full h-18 py-8 rounded-[2rem] font-black text-sm uppercase tracking-widest gap-4 transition-all relative overflow-hidden group shadow-2xl active:scale-95",
                    canWatchAd 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30" 
                      : "bg-muted text-muted-foreground cursor-not-allowed border-none shadow-none"
                  )}
                >
                  <div className="flex items-center justify-between w-full px-4">
                    <div className="flex items-center gap-4">
                      {unlocking && unlockMethod === 'ad' ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Play className="w-6 h-6 fill-current" />
                      )}
                      <div className="text-left">
                        <p className="leading-none text-lg">Watch Clip</p>
                        {!unlocking && <p className="text-[9px] font-bold opacity-70 mt-1.5 uppercase tracking-wider">SECURE FREE ACCESS</p>}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-white/10 border-white/20 text-white text-[9px] font-black tracking-widest px-3 py-1">
                      {unlocking && unlockMethod === 'ad' ? "BUSY" : `${DAILY_AD_LIMIT - (user?.dailyAdCount || 0)} LEFT`}
                    </Badge>
                  </div>
                  
                  {unlocking && unlockMethod === 'ad' && (
                    <div className="absolute bottom-0 left-0 h-1.5 bg-white/20 w-full">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${adProgress}%` }}
                        className="h-full bg-white"
                      />
                    </div>
                  )}
                </Button>

                <Button
                  onClick={handleUnlockWithCredits}
                  disabled={unlocking}
                  variant="outline"
                  className={cn(
                    "w-full h-18 py-8 rounded-[2rem] font-black text-sm uppercase tracking-widest gap-4 border-2 transition-all relative overflow-hidden active:scale-95 shadow-lg",
                    credits >= AI_UNLOCK_COST 
                      ? "border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary" 
                      : "border-muted/50 bg-muted/10 text-muted-foreground"
                  )}
                >
                  <div className="flex items-center justify-between w-full px-4">
                    <div className="flex items-center gap-4">
                      {unlocking && unlockMethod === 'credits' ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Sparkles className="w-6 h-6 fill-current animate-sparkle" />
                      )}
                      <div className="text-left">
                        <p className="leading-none text-lg">Vault Credits</p>
                        <p className="text-[9px] font-bold opacity-70 mt-1.5 uppercase tracking-wider">
                          {credits >= AI_UNLOCK_COST ? `COMMIT ${AI_UNLOCK_COST} UNITS` : `REFILL REQUIRED`}
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all",
                      credits >= AI_UNLOCK_COST ? "bg-primary border-primary/20 text-primary-foreground shadow-md" : "bg-muted border-border text-muted-foreground"
                    )}>
                      <span className="font-black text-base">{credits}</span>
                      <Sparkles className="w-4 h-4 fill-current" />
                    </div>
                  </div>
                </Button>

                <div className="pt-6 flex flex-col items-center gap-4">
                  <button 
                    onClick={() => setShowAbortConfirm(true)}
                    disabled={unlocking}
                    className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground hover:text-destructive transition-colors disabled:opacity-20"
                  >
                    Discard Simulation
                  </button>
                </div>
              </motion.div>
            )}

            {showSuccess && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-12 pb-16 text-center"
              >
                <div className="w-full h-[1px] bg-border/50 mb-12" />
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
                  className="w-24 h-24 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl mx-auto mb-8"
                >
                  <CheckCircle2 className="w-12 h-12" />
                </motion.div>
                
                <div className="space-y-3">
                  <p className="text-2xl font-black tracking-tight text-foreground">Vault Opened</p>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.25em] animate-pulse">
                    Synchronizing academic roadmap...
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Abort Confirmation Dialog */}
      <Dialog open={showAbortConfirm} onOpenChange={(open) => !open && setShowAbortConfirm(false)}>
        <DialogContent className="rounded-[3rem] bg-card border-none shadow-md3-3 p-0 max-w-[340px] overflow-hidden outline-none z-[1300]" persistent={true}>
          <div className="bg-rose-500/10 p-12 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="w-20 h-20 bg-card rounded-[2rem] flex items-center justify-center shadow-xl border-2 border-rose-500/20 relative z-10">
              <AlertTriangle className="w-10 h-10 text-rose-600" />
            </div>
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 bg-rose-500/20" />
          </div>
          <div className="p-10 text-center space-y-8">
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-black text-foreground tracking-tight">Terminate Session?</DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium text-sm leading-relaxed px-2">
                This professional trace will be <span className="text-rose-600 font-bold">permanently purged</span>. You will not be able to recover these analytical results.
              </DialogDescription>
            </div>
            <div className="grid gap-3">
              <Button variant="destructive" onClick={handleAbort} className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                Confirm Purge
              </Button>
              <Button variant="ghost" onClick={() => setShowAbortConfirm(false)} className="h-12 rounded-xl font-bold text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-muted">
                Return to Vault
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credit Refill Dialog */}
      <Dialog open={!!creditError} onOpenChange={() => !watchingAdForRefill && setCreditError(null)}>
        <DialogContent className="rounded-[3rem] bg-card border-none shadow-md3-3 p-0 max-w-[380px] overflow-hidden outline-none z-[1200]" persistent={watchingAdForRefill}>
          <div className="bg-amber-500/10 p-12 flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 bg-card rounded-[2.5rem] flex items-center justify-center shadow-2xl relative z-10 border-2 border-amber-200"
            >
              {verifyingAdForRefill ? <ShieldAlert className="w-12 h-12 text-amber-500 animate-pulse" /> : <Sparkles className="w-12 h-12 text-amber-500 fill-current animate-sparkle" />}
            </motion.div>
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 bg-gradient-to-br from-amber-500/30 to-transparent" />
          </div>
          
          <div className="p-10 text-center space-y-10">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-600 mb-1">Insufficient Units</span>
              <DialogTitle className="text-3xl font-black tracking-tighter text-foreground">Refill Vault</DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium text-base leading-relaxed px-4">
                Decrypting this trace requires <span className="text-foreground font-black">{creditError?.required}c</span>. Your current balance is <span className="text-amber-600 font-black">{creditError?.current}c</span>.
              </DialogDescription>
            </div>

            <div className="grid gap-3">
              <Button 
                onClick={handleRefillFromDialog}
                disabled={watchingAdForRefill || !canWatchAd}
                className="w-full h-18 rounded-[2rem] font-black text-sm uppercase tracking-widest gap-4 shadow-2xl bg-primary text-primary-foreground active:scale-95 transition-all"
              >
                {verifyingAdForRefill ? <Loader2 className="w-6 h-6 animate-spin" /> : watchingAdForRefill ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6 fill-current" />}
                {watchingAdForRefill ? (verifyingAdForRefill ? "VERIFYING..." : "WATCHING...") : `Watch Ad (+5c)`}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setCreditError(null)}
                className="w-full h-12 rounded-xl font-bold text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-muted"
                disabled={watchingAdForRefill}
              >
                Return to Gate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
