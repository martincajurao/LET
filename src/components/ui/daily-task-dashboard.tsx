'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Trophy, 
  Flame, 
  Loader2, 
  BookOpen, 
  Target, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles, 
  Play, 
  ShieldAlert, 
  Package, 
  Compass,
  Timer,
  Info,
  ShieldCheck,
  Gift,
  RotateCcw
} from "lucide-react";
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from '@/firebase';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { getRankData, STREAK_RECOVERY_COST, DAILY_AD_LIMIT, XP_REWARDS } from '@/lib/xp-system';

interface Quest {
  id: string;
  title: string;
  description: string;
  reward: number;
  goal: number;
  current: number;
  isClaimed: boolean;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export function DailyQuestDashboard() {
  const { user, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [claiming, setClaiming] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [claimedReward, setLastClaimedReward] = useState(0);

  const [creditError, setCreditError] = useState<{ required: number; current: number } | null>(null);
  const [watchingAdForRefill, setWatchingAdForRefill] = useState(false);
  const [verifyingAdForRefill, setVerifyingAdForRefill] = useState(false);

  const rankData = useMemo(() => user ? getRankData(user.xp || 0) : null, [user?.xp]);
  const tierMultiplier = rankData?.multiplier || 1.0;

  const quests: Quest[] = useMemo(() => {
    const qGoal = user?.userTier === 'Platinum' ? 35 : 20;
    return [
      { id: 'questions', title: 'Item Mastery', description: 'Complete board items', reward: Math.round(10 * tierMultiplier), goal: qGoal, current: user?.dailyQuestionsAnswered || 0, isClaimed: !!user?.taskQuestionsClaimed, icon: <Target className="w-5 h-5" />, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
      { id: 'mock', title: 'Full Simulation', description: 'Finish a timed mock test', reward: Math.round(15 * tierMultiplier), goal: 1, current: user?.dailyTestsFinished || 0, isClaimed: !!user?.taskMockClaimed, icon: <Trophy className="w-5 h-5" />, color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
      { id: 'mistakes', title: 'Review Insights', description: 'Analyze pedagogical mistakes', reward: Math.round(10 * tierMultiplier), goal: 10, current: user?.mistakesReviewed || 0, isClaimed: !!user?.taskMistakesClaimed, icon: <BookOpen className="w-5 h-5" />, color: 'text-rose-600', bgColor: 'bg-rose-500/10' },
      { id: 'focus', title: 'Deep Focus', description: 'Complete a study session', reward: Math.round(10 * tierMultiplier), goal: 1, current: user?.dailyAiUsage || 0, isClaimed: !!user?.taskLoginClaimed, icon: <Timer className="w-5 h-5" />, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' }
    ];
  }, [user, tierMultiplier]);

  const totalProgress = quests.reduce((acc, quest) => acc + Math.min((quest.current / quest.goal) * 100, 100), 0) / quests.length;
  const canClaimAny = quests.some(t => t.current >= t.goal && !t.isClaimed);
  
  const estimatedReward = useMemo(() => {
    const readyQuests = quests.filter(t => t.current >= t.goal && !t.isClaimed);
    return readyQuests.reduce((acc, quest) => acc + quest.reward, 0);
  }, [quests]);

  const handleClaimReward = async (isRecovery = false) => {
    if (!user || !firestore || (claiming && !isRecovery)) return;
    if (isRecovery) {
      if ((user.credits || 0) < STREAK_RECOVERY_COST) { setCreditError({ required: STREAK_RECOVERY_COST, current: user.credits || 0 }); return; }
      setRecovering(true);
    } else { setClaiming(true); }
    try {
      const readyQuests = quests.filter(t => t.current >= t.goal && !t.isClaimed);
      const reward = readyQuests.reduce((acc, quest) => acc + quest.reward, 0);
      if (reward > 0 || isRecovery) {
        const userRef = doc(firestore, 'users', user.uid);
        const updateData: any = {
          credits: increment(reward - (isRecovery ? STREAK_RECOVERY_COST : 0)),
          dailyCreditEarned: increment(reward),
          taskQuestionsClaimed: readyQuests.some(t => t.id === 'questions') || !!user.taskQuestionsClaimed,
          taskMockClaimed: readyQuests.some(t => t.id === 'mock') || !!user.taskMockClaimed,
          taskMistakesClaimed: readyQuests.some(t => t.id === 'mistakes') || !!user.taskMistakesClaimed,
          taskLoginClaimed: readyQuests.some(t => t.id === 'focus') || !!user.taskLoginClaimed,
          lastActiveDate: serverTimestamp(),
          lastClaimTime: serverTimestamp()
        };
        if (isRecovery) updateData.streakCount = (user.streakCount || 0) + 1;
        await updateDoc(userRef, updateData);
        if (reward > 0) { setLastClaimedReward(reward - (isRecovery ? STREAK_RECOVERY_COST : 0)); setShowSuccess(true); }
        else if (isRecovery) toast({ variant: "reward", title: "Streak Recovered!", description: "Your academic progress has been preserved." });
      }
    } catch (e: any) { toast({ variant: "destructive", title: "Sync Error", description: "Failed to calibrate quest rewards." }); } 
    finally { setClaiming(false); setRecovering(false); refreshUser(); }
  };

  const handleRefillFromDialog = async () => {
    if (!user || !firestore) return;
    if ((user.dailyAdCount || 0) >= DAILY_AD_LIMIT) { toast({ title: "Limit Reached", description: "Daily allowance reached.", variant: "destructive" }); return; }
    setWatchingAdForRefill(true);
    setVerifyingAdForRefill(false);
    setTimeout(async () => {
      setVerifyingAdForRefill(true);
      setTimeout(async () => {
        try {
          const userRef = doc(firestore, 'users', user.uid);
          await updateDoc(userRef, { credits: increment(5), xp: increment(XP_REWARDS.AD_WATCH_XP), lastAdXpTimestamp: Date.now(), dailyAdCount: increment(1) });
          await refreshUser();
          toast({ variant: "reward", title: "Refill Success!", description: "+5 Credits added to vault." });
          setCreditError(null);
        } catch (e) { toast({ variant: "destructive", title: "Sync Failed", description: "Verification failed." }); } 
        finally { setWatchingAdForRefill(false); setVerifyingAdForRefill(false); }
      }, 1500);
    }, 3500);
  };

  return (
    <>
      <Card className="android-surface border-none shadow-md3-2 rounded-[2.5rem] bg-card overflow-hidden">
        <CardHeader className="bg-muted/30 p-6 md:p-8 border-b space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0"><Compass className="w-6 h-6 text-primary-foreground" /></div>
              <div><CardTitle className="text-xl md:text-2xl font-black tracking-tight">Daily Quests</CardTitle><div className="flex items-center gap-2 mt-0.5"><Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[8px] uppercase">{rankData?.title}</Badge><div className="flex items-center gap-1 text-[9px] font-black text-muted-foreground uppercase opacity-60 tracking-widest"><ShieldCheck className="w-3 h-3" /><span>Rate: {tierMultiplier}x</span></div></div></div>
            </div>
            <div className="flex flex-col items-end"><span className="text-[8px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">Career Streak</span><div className="flex items-center gap-2 bg-orange-500/10 px-4 py-1.5 rounded-2xl border-2 border-orange-500/20 shadow-sm relative group cursor-help"><Flame className="w-5 h-5 text-orange-500 fill-current animate-pulse group-hover:scale-125 transition-transform" /><span className="text-2xl font-black text-orange-600">{user?.streakCount || 0}</span>{user?.streakCount && user.streakCount >= 7 && (<motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-2 border-dashed border-orange-500/30 rounded-2xl" />)}</div></div>
          </div>
          <div className="space-y-2"><div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60"><span>Saga Progression</span><span>{Math.round(totalProgress)}%</span></div><Progress value={totalProgress} className="h-1.5 rounded-full bg-muted shadow-inner" /></div>
        </CardHeader>
        <CardContent className="p-4 md:p-8 space-y-4">
          <div className="grid grid-cols-1 gap-2.5">
            {quests.map((quest) => {
              const isComplete = quest.current >= quest.goal;
              return (
                <motion.div key={quest.id} whileHover={!quest.isClaimed ? { x: 4 } : {}} className={cn("android-surface p-4 rounded-2xl flex items-center justify-between border-2", quest.isClaimed ? "opacity-40 border-transparent grayscale bg-muted/20" : isComplete ? "bg-accent/5 border-primary/20 ring-4 ring-primary/5 shadow-lg" : "border-border/50")}>
                  <div className="flex items-center gap-4"><div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-inner shrink-0", quest.bgColor, quest.color)}>{quest.icon}</div><div className="min-w-0"><p className="text-sm font-black text-foreground leading-none mb-0.5 truncate">{quest.title}</p><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest truncate">{quest.description}</p></div></div>
                  <div className="flex items-center gap-3"><div className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-2 transition-all shrink-0", isComplete && !quest.isClaimed ? "animate-breathing-gold border-yellow-500/30 bg-yellow-500/10" : "bg-muted/30 border-transparent")}><Sparkles className="w-3.5 h-3.5 text-yellow-600 fill-current animate-sparkle" /><span className="text-xs font-black text-yellow-700">+{quest.reward}</span></div><div className="min-w-[40px] flex justify-end">{quest.isClaimed ? <Badge variant="outline" className="text-[8px] font-black uppercase bg-emerald-500/5 text-emerald-600 border-emerald-500/20 px-1.5">Claimed</Badge> : isComplete ? <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg animate-victory"><CheckCircle2 className="w-4 h-4" /></div> : <span className="text-[9px] font-black text-muted-foreground opacity-60">{quest.current}/{quest.goal}</span>}</div></div>
                </motion.div>
              );
            })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Button onClick={() => handleClaimReward()} disabled={!user || claiming || !canClaimAny} className={cn("h-16 rounded-2xl font-black text-base gap-3 shadow-xl group active:scale-95 transition-all relative overflow-hidden", canClaimAny ? "bg-primary text-primary-foreground shadow-primary/30 animate-focus-glow" : "bg-muted text-muted-foreground")}>{canClaimAny && <motion.div animate={{ x: [-100, 200] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />}{claiming ? <Loader2 className="w-5 h-5 animate-spin" /> : canClaimAny ? <Gift className="w-5 h-5" /> : <Package className="w-5 h-5 opacity-40" />}{claiming ? 'SYNCING...' : canClaimAny ? `CLAIM ${estimatedReward} CREDITS` : 'QUESTS INCOMPLETE'}</Button>
            <Button variant="outline" onClick={() => handleClaimReward(true)} disabled={recovering} className="h-16 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] gap-2 border-2 border-orange-500/20 text-orange-600 hover:bg-orange-50 active:scale-95 transition-all">{recovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}Streak Saver ({STREAK_RECOVERY_COST}c)</Button>
          </div>
          <div className="p-4 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/10 flex items-start gap-3"><Info className="w-4 h-4 text-primary shrink-0 mt-0.5 opacity-60" /><p className="text-[9px] font-bold text-muted-foreground leading-relaxed uppercase tracking-wider"><span className="text-primary font-black">Success Tip:</span> Completing quests consistently scales your multiplier. Higher ranks yield greater legendary loot.</p></div>
        </CardContent>
      </Card>
      <AnimatePresence>
        {showSuccess && (
          <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
            <DialogContent className="rounded-[3rem] border-none shadow-md3-3 p-0 max-w-[320px] overflow-hidden outline-none">
              <div className="bg-primary/10 p-10 flex flex-col items-center justify-center relative overflow-hidden">
                <motion.div initial={{ scale: 0.8, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 12, stiffness: 200 }} className="w-20 h-20 bg-primary text-primary-foreground rounded-[1.75rem] flex items-center justify-center shadow-2xl relative z-10">
                  <CheckCircle2 className="w-10 h-10" />
                </motion.div>
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent z-0" />
              </div>
              <div className="p-8 pt-4 text-center space-y-6">
                <div className="space-y-1">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight text-foreground">Quest Success!</DialogTitle>
                    <DialogDescription className="text-muted-foreground font-black text-[9px] uppercase tracking-widest">Vault Balance Increased</DialogDescription>
                  </DialogHeader>
                </div>
                <div className="bg-muted/30 rounded-2xl p-5 border-2 border-border/50 flex flex-col items-center gap-1.5">
                  <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Loot Yield</span>
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl animate-breathing-gold border-2 border-yellow-500/20 bg-card shadow-sm">
                    <Sparkles className="w-6 h-6 text-yellow-600 fill-current animate-sparkle" />
                    <span className="text-4xl font-black text-yellow-700">+{claimedReward}</span>
                  </div>
                </div>
                <Button onClick={() => setShowSuccess(false)} className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest gap-2 shadow-xl shadow-primary/30 active:scale-95 transition-all">Proceed <ChevronRight className="w-4 h-4" /></Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
      <Dialog open={!!creditError} onOpenChange={() => setCreditError(null)}>
        <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-md3-3 p-0 max-w-[340px] overflow-hidden outline-none z-[1200]" hideCloseButton={watchingAdForRefill}>
          <div className="bg-amber-500/10 p-10 flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center shadow-xl relative z-10 border border-amber-200">
              {verifyingAdForRefill ? <ShieldAlert className="w-8 h-8 text-amber-500 animate-pulse" /> : <Sparkles className="w-8 h-8 text-amber-500 fill-current animate-sparkle" />}
            </motion.div>
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent z-0" />
          </div>
          <div className="p-8 text-center space-y-6">
            <div className="space-y-1">
              <DialogHeader>
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">Insufficient Credits</span>
                <DialogTitle className="text-xl font-black tracking-tight text-foreground">Refill to Proceed</DialogTitle>
                <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase">Requires <span className="text-foreground">{creditError?.required}</span> credits (Current: {creditError?.current})</DialogDescription>
              </DialogHeader>
            </div>
            <div className="grid gap-3">
              <Button onClick={handleRefillFromDialog} disabled={watchingAdForRefill || (user?.dailyAdCount || 0) >= DAILY_AD_LIMIT} className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 shadow-lg bg-primary text-primary-foreground active:scale-95 transition-all">
                {verifyingAdForRefill ? <Loader2 className="w-4 h-4 animate-spin" /> : watchingAdForRefill ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                {watchingAdForRefill ? (verifyingAdForRefill ? "VERIFYING..." : "WATCHING...") : "WATCH AD FOR +5"}
              </Button>
              <Button variant="ghost" onClick={() => setCreditError(null)} className="w-full h-10 rounded-xl font-black text-[9px] uppercase tracking-widest text-muted-foreground" disabled={watchingAdForRefill}>Maybe Later</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}