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
          className="rounded-[2.5rem] bg-card border-none shadow-2xl p-0 max-w-[380px] overflow-hidden outline-none" 
          persistent={true}
          hideCloseButton={true}
        >
          <div className="relative p-6 text-center overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <Lock className="w-24 h-24" />
            </div>
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-10 space-y-4"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20 shadow-xl relative">
                {verifying ? (
                  <ShieldCheck className="w-8 h-8 text-primary animate-victory" />
                ) : (
                  <BrainCircuit className="w-8 h-8 text-primary" />
                )}
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-card border-2 border-primary rounded-full flex items-center justify-center shadow-md">
                  <Lock className="w-2.5 h-2.5 text-primary" />
                </div>
              </div>
              
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                  {showSuccess ? "Unlock Success" : "Unlock Result"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium text-xs max-w-[280px] mx-auto leading-relaxed">
                  {showSuccess 
                    ? "Calibration secure. Synchronizing professional results..."
                    : "Sim complete. Unlock the pedagogical analysis to view your board rating and review."
                  }
                </DialogDescription>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-3 mt-6 relative z-10"
            >
              <div className="bg-muted/30 rounded-xl p-3 px-6 border border-border/50 flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-0.5">Items</span>
                  <span className="text-sm font-black">{questionsCount}</span>
                </div>
                <div className="w-[1px] h-6 bg-border mx-1" />
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-0.5">Pacing</span>
                  <span className="text-sm font-black">{Math.floor(timeSpent / 60)}m</span>
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
                className="px-6 pb-8 space-y-3 relative z-10"
              >
                <div className="h-[1px] w-full bg-border/50 mb-4" />
                
                <Button
                  onClick={handleUnlockWithAd}
                  disabled={unlocking || !canWatchAd}
                  className={cn(
                    "w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-3 transition-all relative overflow-hidden active:scale-95 shadow-lg",
                    canWatchAd 
                      ? "bg-primary text-primary-foreground shadow-primary/20" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <div className="flex items-center justify-between w-full px-2">
                    <div className="flex items-center gap-3">
                      {unlocking && unlockMethod === 'ad' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                      <span>Watch & Unlock</span>
                    </div>
                    <Badge variant="outline" className="bg-white/10 border-white/20 text-white text-[8px] font-black tracking-widest">
                      {unlocking && unlockMethod === 'ad' ? "BUSY" : "FREE"}
                    </Badge>
                  </div>
                  
                  {unlocking && unlockMethod === 'ad' && (
                    <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full">
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
                    "w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-3 border-2 transition-all active:scale-95",
                    credits >= AI_UNLOCK_COST 
                      ? "border-primary/30 bg-primary/5 text-primary" 
                      : "border-muted text-muted-foreground"
                  )}
                >
                  <div className="flex items-center justify-between w-full px-2">
                    <span>Use Vault Units</span>
                    <div className="flex items-center gap-1.5 bg-background/80 px-2 py-1 rounded-lg border border-primary/20">
                      <span className="font-black text-xs">{AI_UNLOCK_COST}</span>
                      <Sparkles className="w-3 h-3 text-primary fill-current animate-sparkle" />
                    </div>
                  </div>
                </Button>

                <div className="pt-4 flex justify-center">
                  <button 
                    onClick={() => setShowAbortConfirm(true)}
                    disabled={unlocking}
                    className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-destructive transition-colors disabled:opacity-20 active:scale-90"
                  >
                    Discard Results
                  </button>
                </div>
              </motion.div>
            )}

            {showSuccess && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-8 pb-12 text-center"
              >
                <div className="w-full h-[1px] bg-border/50 mb-8" />
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12, stiffness: 200 }}
                  className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-xl mx-auto mb-6"
                >
                  <CheckCircle2 className="w-8 h-8" />
                </motion.div>
                
                <div className="space-y-1">
                  <p className="text-xl font-black text-foreground">Access Granted</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
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
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-0 max-w-[320px] overflow-hidden outline-none" persistent={true}>
          <div className="bg-rose-500/10 p-8 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center shadow-lg border-2 border-rose-500/20 relative z-10">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
            </div>
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 bg-rose-500/10" />
          </div>
          <div className="p-8 text-center space-y-6">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black text-foreground tracking-tight">Purge Results?</DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium text-xs leading-relaxed px-4">
                This professional trace will be <span className="text-rose-600 font-bold">permanently lost</span>. Analysis is currently unrecoverable.
              </DialogDescription>
            </div>
            <div className="grid gap-2">
              <Button variant="destructive" onClick={handleAbort} className="h-12 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                Terminate Sync
              </Button>
              <Button variant="ghost" onClick={() => setShowAbortConfirm(false)} className="h-10 rounded-xl font-bold text-[9px] uppercase tracking-widest text-muted-foreground active:scale-90">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credit Refill Dialog */}
      <Dialog open={!!creditError} onOpenChange={() => !watchingAdForRefill && setCreditError(null)}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-0 max-w-[340px] overflow-hidden outline-none" persistent={watchingAdForRefill}>
          <div className="bg-amber-500/10 p-8 flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center shadow-lg relative z-10 border border-amber-200"
            >
              {verifyingAdForRefill ? <ShieldAlert className="w-8 h-8 text-amber-500 animate-pulse" /> : <Sparkles className="w-8 h-8 text-amber-500 fill-current animate-sparkle" />}
            </motion.div>
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 bg-amber-500/10" />
          </div>
          
          <div className="p-8 text-center space-y-6">
            <div className="space-y-1">
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-amber-600 mb-1">Insufficient Balance</span>
              <DialogTitle className="text-xl font-black tracking-tight text-foreground">Refill Vault</DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium text-xs leading-relaxed">
                Decrypting requires <span className="text-foreground font-black">{creditError?.required}c</span>. You currently have <span className="text-amber-600 font-black">{creditError?.current}c</span>.
              </DialogDescription>
            </div>

            <div className="grid gap-2">
              <Button 
                onClick={handleRefillFromDialog}
                disabled={watchingAdForRefill || !canWatchAd}
                className="w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-3 shadow-lg bg-primary text-primary-foreground active:scale-95 transition-all"
              >
                {verifyingAdForRefill ? <Loader2 className="w-4 h-4 animate-spin" /> : watchingAdForRefill ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                {watchingAdForRefill ? (verifyingAdForRefill ? "VERIFYING..." : "SYNCING...") : `Watch Ad (+5c)`}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setCreditError(null)}
                className="w-full h-10 rounded-xl font-bold text-[9px] uppercase tracking-widest text-muted-foreground active:scale-90"
                disabled={watchingAdForRefill}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
