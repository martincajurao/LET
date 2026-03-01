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
  Star, 
  Gift, 
  Key, 
  ShieldCheck,
  Zap,
  RotateCcw,
  Info,
  CheckCircle2,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from '@/firebase';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { getRankData, STREAK_RECOVERY_COST } from '@/lib/xp-system';

interface Task {
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

export function DailyTaskDashboard() {
  const { user, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [claiming, setClaiming] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [claimedReward, setLastClaimedReward] = useState(0);

  const rankData = useMemo(() => user ? getRankData(user.xp || 0) : null, [user?.xp]);
  const tierMultiplier = rankData?.multiplier || 1.0;

  const tasks: Task[] = useMemo(() => {
    const qGoal = user?.userTier === 'Platinum' ? 35 : 20;
    return [
      { id: 'login', title: 'Daily Entrance', description: 'Access simulation vault', reward: Math.round(5 * tierMultiplier), goal: 1, current: user ? 1 : 0, isClaimed: !!user?.taskLoginClaimed, icon: <Key className="w-5 h-5" />, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
      { id: 'questions', title: 'Item Mastery', description: 'Complete board items', reward: Math.round(10 * tierMultiplier), goal: qGoal, current: user?.dailyQuestionsAnswered || 0, isClaimed: !!user?.taskQuestionsClaimed, icon: <Target className="w-5 h-5" />, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
      { id: 'mock', title: 'Full Simulation', description: 'Finish a timed mock test', reward: Math.round(15 * tierMultiplier), goal: 1, current: user?.dailyTestsFinished || 0, isClaimed: !!user?.taskMockClaimed, icon: <Trophy className="w-5 h-5" />, color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
      { id: 'mistakes', title: 'Review Insights', description: 'Analyze pedagogical mistakes', reward: Math.round(10 * tierMultiplier), goal: 10, current: user?.mistakesReviewed || 0, isClaimed: !!user?.taskMistakesClaimed, icon: <BookOpen className="w-5 h-5" />, color: 'text-rose-600', bgColor: 'bg-rose-500/10' }
    ];
  }, [user, tierMultiplier]);

  const totalProgress = tasks.reduce((acc, task) => acc + Math.min((task.current / task.goal) * 100, 100), 0) / tasks.length;
  const canClaimAny = tasks.some(t => t.current >= t.goal && !t.isClaimed);
  
  const estimatedReward = useMemo(() => {
    const readyTasks = tasks.filter(t => t.current >= t.goal && !t.isClaimed);
    return readyTasks.reduce((acc, task) => acc + task.reward, 0);
  }, [tasks]);

  const handleClaimReward = async (isRecovery = false) => {
    if (!user || !firestore || (claiming && !isRecovery)) return;
    if (isRecovery) setRecovering(true); else setClaiming(true);

    try {
      const readyTasks = tasks.filter(t => t.current >= t.goal && !t.isClaimed);
      const reward = readyTasks.reduce((acc, task) => acc + task.reward, 0);

      if (reward > 0 || isRecovery) {
        const userRef = doc(firestore, 'users', user.uid);
        const updateData: any = {
          credits: increment(reward - (isRecovery ? STREAK_RECOVERY_COST : 0)),
          dailyCreditEarned: increment(reward),
          taskLoginClaimed: readyTasks.some(t => t.id === 'login') || !!user.taskLoginClaimed,
          taskQuestionsClaimed: readyTasks.some(t => t.id === 'questions') || !!user.taskQuestionsClaimed,
          taskMockClaimed: readyTasks.some(t => t.id === 'mock') || !!user.taskMockClaimed,
          taskMistakesClaimed: readyTasks.some(t => t.id === 'mistakes') || !!user.taskMistakesClaimed,
          lastActiveDate: serverTimestamp(),
          lastClaimTime: serverTimestamp()
        };
        if (isRecovery) updateData.streakCount = (user.streakCount || 0) + 1;
        await updateDoc(userRef, updateData);

        if (reward > 0) {
          setLastClaimedReward(reward - (isRecovery ? STREAK_RECOVERY_COST : 0));
          setShowSuccess(true);
        } else {
          toast({ variant: "reward", title: "Streak Recovered!", description: "Your academic progress has been preserved." });
        }
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Error", description: "Failed to calibrate mission rewards." });
    } finally {
      setClaiming(false);
      setRecovering(false);
      refreshUser();
    }
  };

  return (
    <>
      <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden">
        <CardHeader className="bg-muted/30 p-8 border-b space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20"><Target className="w-7 h-7 text-primary-foreground" /></div>
              <div>
                <CardTitle className="text-2xl font-black tracking-tight">Mission Hub</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[9px] uppercase">{rankData?.title}</Badge>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Rate: {tierMultiplier}x</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">Career Streak</span>
              <div className="flex items-center gap-2 bg-orange-500/10 px-4 py-1.5 rounded-2xl border border-orange-500/20">
                <Flame className="w-5 h-5 text-orange-500 fill-current animate-pulse" />
                <span className="text-2xl font-black text-orange-600">{user?.streakCount || 0}</span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-60">
              <span>Path Progress</span>
              <span>{Math.round(totalProgress)}% Complete</span>
            </div>
            <Progress value={totalProgress} className="h-2 rounded-full bg-muted shadow-inner" />
          </div>
        </CardHeader>
        
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {tasks.map((task) => {
              const isComplete = task.current >= task.goal;
              return (
                <div key={task.id} className={cn("p-5 rounded-[2rem] border-2 transition-all flex items-center justify-between group active:scale-[0.98]", task.isClaimed ? "opacity-40 bg-muted/20 border-transparent grayscale" : isComplete ? "bg-accent/5 border-primary/20 shadow-lg" : "bg-card border-border/50 hover:border-primary/20")}>
                  <div className="flex items-center gap-5">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", task.bgColor, task.color)}>{task.icon}</div>
                    <div><p className="text-base font-black text-foreground leading-none mb-1">{task.title}</p><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{task.description}</p></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-all", isComplete && !task.isClaimed ? "animate-breathing-gold border-yellow-500/30 bg-yellow-500/10" : "bg-muted/30 border-transparent")}>
                      <Sparkles className="w-4 h-4 text-yellow-600 fill-current animate-sparkle" />
                      <span className="text-sm font-black text-yellow-700">+{task.reward}</span>
                    </div>
                    {task.isClaimed ? <Badge variant="outline" className="text-[9px] font-black uppercase bg-emerald-500/5 text-emerald-600 border-emerald-500/20">Verified</Badge> : isComplete ? <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg animate-victory"><CheckCircle2 className="w-5 h-5" /></div> : <span className="text-[10px] font-black text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">{task.current}/{task.goal}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <Button onClick={() => handleClaimReward()} disabled={!user || claiming || !canClaimAny} className="h-16 rounded-[1.5rem] font-black text-lg gap-3 shadow-2xl shadow-primary/30 group active:scale-95 transition-all">
              {claiming ? <Loader2 className="w-6 h-6 animate-spin" /> : canClaimAny ? <Gift className="w-6 h-6" /> : <Star className="w-6 h-6" />}
              {claiming ? 'Synchronizing...' : canClaimAny ? `Claim ${estimatedReward} Credits` : 'Build Readiness'}
            </Button>
            <Button variant="outline" onClick={() => handleClaimReward(true)} disabled={recovering || (user?.credits || 0) < STREAK_RECOVERY_COST} className="h-16 rounded-[1.5rem] font-black text-xs uppercase tracking-widest gap-2 border-2 border-orange-500/20 text-orange-600 hover:bg-orange-50 active:scale-95 transition-all">
              {recovering ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
              Streak Saver ({STREAK_RECOVERY_COST}c)
            </Button>
          </div>

          <div className="p-5 bg-primary/5 rounded-[1.75rem] border-2 border-dashed border-primary/10 flex items-start gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 shadow-inner"><Info className="w-5 h-5 text-primary" /></div>
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-muted-foreground leading-relaxed">
                <span className="text-primary font-black uppercase tracking-widest">Growth Economics:</span> 
                Tiered multipliers scale based on your professional rank. Reach higher career milestones to increase your mission yield by up to 200%.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="rounded-[3rem] border-none shadow-2xl p-0 max-w-[340px] overflow-hidden outline-none">
          <div className="bg-primary/10 p-12 flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }} className="w-24 h-24 bg-primary text-primary-foreground rounded-[2.5rem] flex items-center justify-center shadow-2xl relative z-10"><CheckCircle2 className="w-12 h-12" /></motion.div>
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent z-0" />
            <div className="absolute inset-0 z-5 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0], y: -100, x: (i - 2.5) * 40 }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }} className="absolute bottom-0 left-1/2"><Sparkles className="w-4 h-4 text-primary fill-current animate-sparkle" /></motion.div>
              ))}
            </div>
          </div>
          <div className="p-10 pt-4 text-center space-y-8">
            <div className="space-y-2">
              <DialogHeader><DialogTitle className="text-3xl font-black tracking-tighter text-foreground">Mission Success!</DialogTitle><DialogDescription className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.3em]">Credits Added to Vault</DialogDescription></DialogHeader>
            </div>
            <div className="bg-muted/30 rounded-[2rem] p-6 border-2 border-border/50 flex flex-col items-center gap-2 relative overflow-hidden">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">Reward Calibrated</span>
              <div className="flex items-center gap-3"><div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl animate-breathing-gold border-2 border-yellow-500/20 bg-background/50"><Sparkles className="w-8 h-8 text-yellow-600 fill-current animate-sparkle" /><span className="text-5xl font-black text-yellow-700">+{claimedReward}</span></div></div>
            </div>
            <Button onClick={() => setShowSuccess(false)} className="w-full h-16 rounded-[1.75rem] font-black text-lg gap-3 shadow-2xl shadow-primary/30 active:scale-95 transition-all">Continue Mission <ChevronRight className="w-5 h-5" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
