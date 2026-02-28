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
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DAILY_AD_LIMIT } from '@/lib/xp-system';

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
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [unlockMethod, setUnlockMethod] = useState<'ad' | 'credits' | null>(null);
  const [adProgress, setAdProgress] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const accuracy = Math.round((correctAnswers / (questionsCount || 1)) * 100);
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
    if (!user || !firestore || credits < 10) {
      toast({ 
        variant: "destructive", 
        title: "Insufficient Credits", 
        description: "You need 10 AI Credits to unlock results. Complete daily tasks or watch ads to earn more!" 
      });
      return;
    }
    
    setUnlockMethod('credits');
    setUnlocking(true);
    
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        credits: increment(-10)
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

  const handleUnlockComplete = () => {
    setShowSuccess(true);
    setTimeout(() => {
      onUnlock();
      onClose();
    }, 2000);
  };

  if (isPro) {
    return null; // Pro users don't see unlock screen
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-[2.5rem] bg-gradient-to-b from-foreground to-foreground/95 text-background border-none shadow-2xl p-0 max-w-[400px] overflow-hidden outline-none z-[1100]">
        {/* Header Section */}
        <div className="relative p-8 pb-6 text-center">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            {verifying ? (
              <ShieldAlert className="w-24 h-24 text-primary animate-pulse" />
            ) : (
              <Lock className="w-24 h-24" />
            )}
          </div>
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="mb-6"
          >
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-primary/30">
              <BrainCircuit className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-3xl font-black tracking-tight mb-2">
              {showSuccess ? "Access Granted!" : "Unlock Your Results"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium text-base max-w-sm mx-auto">
              {showSuccess 
                ? "Your detailed performance analysis is ready for review."
                : "Get instant access to AI-powered insights and personalized recommendations."
              }
            </DialogDescription>
          </motion.div>

          {/* Performance Summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-3 gap-3 mb-6"
          >
            <div className="bg-background/20 backdrop-blur-sm rounded-xl p-3 border border-background/30">
              <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">Score</p>
              <p className="text-xl font-black">{accuracy}%</p>
            </div>
            <div className="bg-background/20 backdrop-blur-sm rounded-xl p-3 border border-background/30">
              <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">Correct</p>
              <p className="text-xl font-black">{correctAnswers}/{questionsCount}</p>
            </div>
            <div className="bg-background/20 backdrop-blur-sm rounded-xl p-3 border border-background/30">
              <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">Time</p>
              <p className="text-xl font-black">{Math.floor(timeSpent / 60)}m</p>
            </div>
          </motion.div>
        </div>

        {/* Unlock Options */}
        <AnimatePresence mode="wait">
          {!showSuccess && (
            <motion.div
              key="unlock-options"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-8 pb-8 space-y-4"
            >
              {/* Ad Option */}
              <Button
                onClick={handleUnlockWithAd}
                disabled={unlocking || !canWatchAd}
                className={cn(
                  "w-full h-16 rounded-2xl font-bold text-base gap-3 transition-all relative overflow-hidden group",
                  canWatchAd 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20" 
                    : "bg-muted/50 text-muted-foreground cursor-not-allowed"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    {unlocking && unlockMethod === 'ad' ? (
                      verifying ? (
                        <ShieldAlert className="w-6 h-6 animate-pulse" />
                      ) : (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      )
                    ) : (
                      <Play className="w-6 h-6 fill-current" />
                    )}
                    <div className="text-left">
                      <p className="font-black">
                        {unlocking && unlockMethod === 'ad' 
                          ? verifying ? "Verifying..." : "Playing..." 
                          : "Watch Ad"
                        }
                      </p>
                      <p className="text-[10px] opacity-80 font-medium">
                        {unlocking && unlockMethod === 'ad' 
                          ? verifying ? "Confirming completion" : "Professional clip in progress"
                          : canWatchAd 
                            ? `${DAILY_AD_LIMIT - (user?.dailyAdCount || 0)} remaining today`
                            : "Daily limit reached"
                        }
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-background/20 border-background/30 text-background font-black text-xs">
                    FREE
                  </Badge>
                </div>
                
                {/* Progress bar for ad */}
                {unlocking && unlockMethod === 'ad' && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.3 }}
                    className="absolute bottom-0 left-0 h-1 bg-background/40"
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${adProgress}%` }}
                      transition={{ duration: 0.3 }}
                      className="h-full bg-background"
                    />
                  </motion.div>
                )}
              </Button>

              {/* Credits Option */}
              <Button
                onClick={handleUnlockWithCredits}
                disabled={unlocking || credits < 10}
                variant="outline"
                className={cn(
                  "w-full h-16 rounded-2xl font-bold text-base gap-3 border-2 transition-all relative overflow-hidden group",
                  credits >= 10 
                    ? "border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary" 
                    : "border-muted/30 bg-muted/10 text-muted-foreground cursor-not-allowed"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    {unlocking && unlockMethod === 'credits' ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Sparkles className="w-6 h-6 fill-current" />
                    )}
                    <div className="text-left">
                      <p className="font-black">
                        {unlocking && unlockMethod === 'credits' ? "Processing..." : "Use AI Credits"}
                      </p>
                      <p className="text-[10px] opacity-80 font-medium">
                        {credits >= 10 
                          ? `${credits} AI Credits available`
                          : `Need ${10 - credits} more credits`
                        }
                      </p>
                    </div>
                  </div>
                  <Badge className={cn(
                    "font-black text-xs",
                    credits >= 10 
                      ? "bg-primary/20 border-primary/30 text-primary" 
                      : "bg-muted/20 border-muted/30 text-muted-foreground"
                  )}>
                    <Sparkles className="w-3 h-3 mr-1" />
                    10
                  </Badge>
                </div>
                
                {/* Progress bar for credits */}
                {unlocking && unlockMethod === 'credits' && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5 }}
                    className="absolute bottom-0 left-0 h-1 bg-primary/20"
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.5 }}
                      className="h-full bg-primary"
                    />
                  </motion.div>
                )}
              </Button>

              {/* Info Text */}
              <div className="text-center">
                <p className="text-[10px] font-medium text-muted-foreground">
                  Premium members get unlimited access to all features
                </p>
              </div>
            </motion.div>
          )}

          {/* Success State */}
          {showSuccess && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="px-8 pb-8 text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
                className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-4"
              >
                <CheckCircle2 className="w-8 h-8" />
              </motion.div>
              
              <div className="space-y-2">
                <p className="text-lg font-black">Analysis Unlocked!</p>
                <p className="text-sm text-muted-foreground font-medium">
                  Redirecting to your detailed results...
                </p>
              </div>
              
              <div className="mt-4 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <Zap className="w-4 h-4 text-blue-400" />
                <Star className="w-4 h-4 text-purple-400" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
