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
import { getDailyTaskUrl } from '@/lib/config';

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
  const [serverWarning, setServerWarning] = useState<string | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [sessionStartTime] = useState(Date.now());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fingerprint = [navigator.userAgent, screen.width + 'x' + screen.height, new Date().getTimezoneOffset()].join('|');
      setDeviceFingerprint(btoa(fingerprint).substring(0, 16));
    }
  }, []);

  const tasks: Task[] = useMemo(() => [
    { id: 'login', title: 'Daily Entrance', description: 'Access simulation vault', reward: 5, goal: 1, current: user ? 1 : 0, isClaimed: !!user?.taskLoginClaimed, icon: <Key className="w-5 h-5" />, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
    { id: 'questions', title: 'Item Mastery', description: 'Complete board items', reward: 10, goal: user?.userTier === 'Platinum' ? 35 : 20, current: user?.dailyQuestionsAnswered || 0, isClaimed: !!user?.taskQuestionsClaimed, icon: <Target className="w-5 h-5" />, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
    { id: 'mock', title: 'Full Simulation', description: 'Finish a timed mock test', reward: 15, goal: 1, current: user?.dailyTestsFinished || 0, isClaimed: !!user?.taskMockClaimed, icon: <Trophy className="w-5 h-5" />, color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
    { id: 'mistakes', title: 'Review Insights', description: 'Analyze pedagogical mistakes', reward: 10, goal: 10, current: user?.mistakesReviewed || 0, isClaimed: !!user?.taskMistakesClaimed, icon: <BookOpen className="w-5 h-5" />, color: 'text-rose-600', bgColor: 'bg-rose-500/10' }
  ], [user]);

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
          credits: increment(reward - (isRecovery ? 50 : 0)),
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
          setLastClaimedReward(reward - (isRecovery ? 50 : 0));
          setShowSuccess(true);
        } else {
          toast({
            variant: "reward",
            title: "Streak Recovered!",
            description: "Your progress has been preserved."
          });
        }
      } else {
        toast({ variant: "default", title: "No Rewards Available", description: "Complete more tasks to earn AI credits." });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to claim rewards." });
    } finally {
      setClaiming(false);
      setRecovering(false);
      // Refresh user data to update UI in Android WebView
      refreshUser();
    }
  };

  return (
    <>
      <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
        <CardHeader className="bg-muted/30 p-6 border-b space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20"><Target className="w-6 h-6 text-primary-foreground" /></div>
              <div>
                <CardTitle className="text-xl font-black tracking-tight">Daily Missions</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[8px] uppercase">{user?.userTier || 'Bronze'}</Badge>
                  <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified Professional Rate</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Active Streak</span>
                <div className="flex items-center gap-2"><Flame className="w-6 h-6 text-orange-500 fill-current" /><span className="text-2xl font-black text-foreground">{typeof user?.streakCount === 'number' ? user.streakCount : 0}</span></div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>Mission Progress</span>
              <span>{Math.round(totalProgress)}% Complete</span>
            </div>
            <Progress value={totalProgress} className="h-2 rounded-full bg-muted shadow-inner" />
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-3">
            {tasks.map((task) => {
              const isComplete = task.current >= task.goal;
              
              return (
                <div key={task.id} className={cn("p-4 rounded-[1.5rem] border transition-all flex items-center justify-between group", task.isClaimed ? "opacity-40 bg-muted/20 grayscale" : isComplete ? "bg-accent/5 border-accent/30 shadow-sm" : "bg-card border-border hover:border-primary/30")}>
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", task.bgColor, task.color)}>{task.icon}</div>
                    <div><p className="text-sm font-bold text-foreground">{task.title}</p><p className="text-[10px] font-medium text-muted-foreground leading-none">{task.description}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all border-2",
                      isComplete && !task.isClaimed ? "animate-breathing-gold border-yellow-500/20 bg-yellow-500/10" : "bg-yellow-500/5 border-yellow-500/10"
                    )}>
                      <Sparkles className="w-3.5 h-3.5 text-yellow-600 fill-current" />
                      <span className="text-xs font-black text-yellow-700">+{task.reward}</span>
                    </div>
                    {task.isClaimed ? <Badge variant="outline" className="text-[8px] font-bold uppercase text-emerald-600">Claimed</Badge> : isComplete ? <Star className="w-4 h-4 text-amber-500 fill-current animate-bounce" /> : <span className="text-[10px] font-bold text-muted-foreground">{task.current}/{task.goal}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={() => handleClaimReward()} disabled={!user || claiming || !canClaimAny} className="h-14 rounded-2xl font-black text-base gap-3 shadow-xl shadow-primary/20 group relative overflow-hidden">
              {claiming ? <Loader2 className="w-5 h-5 animate-spin" /> : canClaimAny ? <Gift className="w-5 h-5" /> : <Star className="w-5 h-5" />}
              {claiming ? 'Syncing...' : canClaimAny ? `Claim ${estimatedReward} AI Credits` : 'Build Readiness'}
            </Button>
            <Button variant="outline" onClick={() => handleClaimReward(true)} disabled={recovering || (typeof user?.credits === 'number' ? user.credits : 0) < 50} className="h-14 rounded-2xl font-bold text-sm gap-2 border-2 border-orange-500/20 text-orange-600 hover:bg-orange-50">
              {recovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Streak Saver (50c)
            </Button>
          </div>

          <div className="p-4 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/10 flex items-start gap-3">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                <span className="text-primary font-bold uppercase">Standard Rate:</span> 
                All tasks are currently rewarded at baseline professional values. Complete your daily missions to maintain your board readiness.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 max-w-[320px] overflow-hidden outline-none">
          <div className="bg-primary/10 p-10 flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
              className="w-20 h-20 bg-primary text-primary-foreground rounded-[2rem] flex items-center justify-center shadow-2xl relative z-10"
            >
              <CheckCircle2 className="w-10 h-10" />
            </motion.div>
            
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.4, 0.2] 
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent z-0" 
            />
            
            <div className="absolute inset-0 z-5 pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 0], y: -80, x: (i - 2) * 30 }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                  className="absolute bottom-0 left-1/2"
                >
                  <Sparkles className="w-3 h-3 text-primary fill-current" />
                </motion.div>
              ))}
            </div>
          </div>
          
          <div className="p-8 pt-2 text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">Mission Accomplished!</DialogTitle>
                <DialogDescription className="text-muted-foreground font-semibold text-[10px] uppercase tracking-[0.2em]">
                  Credits Added to Vault
                </DialogDescription>
              </DialogHeader>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-muted/30 rounded-2xl p-4 border border-border/50 flex flex-col items-center gap-1"
            >
              <span className="text-[9px] font-black uppercase text-muted-foreground">Reward Total</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl animate-breathing-gold border-2 border-yellow-500/20">
                  <Sparkles className="w-7 h-7 text-yellow-600 fill-current" />
                  <span className="text-4xl font-black text-yellow-700">+{claimedReward}</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <Button 
                onClick={() => setShowSuccess(false)}
                className="w-full h-14 rounded-2xl font-black text-base gap-2 shadow-lg shadow-primary/25 group"
              >
                Continue Mission
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
