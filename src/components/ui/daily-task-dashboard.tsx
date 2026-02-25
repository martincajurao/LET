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
  Coins, 
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
  Sparkles,
  AlertTriangle
} from "lucide-react";
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from '@/firebase';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

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
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [claiming, setClaiming] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [claimedReward, setLastClaimedReward] = useState(0);
  const [serverWarning, setServerWarning] = useState<string | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [sessionStartTime] = useState(Date.now());
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fingerprint = [navigator.userAgent, screen.width + 'x' + screen.height, new Date().getTimezoneOffset()].join('|');
      setDeviceFingerprint(btoa(fingerprint).substring(0, 16));
    }
  }, []);

  useEffect(() => {
    const handleQuestionAnswered = () => {
      // In a real scenario, this would track actual time between events
      // For this prototype, we simulate a tracked interval
      setQuestionTimes(prev => [...prev, Math.floor(Math.random() * 20) + 5]);
    };
    window.addEventListener('questionAnswered', handleQuestionAnswered);
    return () => window.removeEventListener('questionAnswered', handleQuestionAnswered);
  }, []);

  // Multiplier Logic (Synced with server)
  const calibration = useMemo(() => {
    const tierMultipliers: Record<string, number> = {
      'Bronze': 1.0,
      'Silver': 1.1,
      'Gold': 1.2,
      'Platinum': 1.3
    };
    
    const tierMult = tierMultipliers[user?.userTier || 'Bronze'] || 1.0;
    const avgTime = questionTimes.length > 0 
      ? questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length 
      : (user?.averageQuestionTime || 0);
    
    let trustMultiplier = 1.0;
    let feedback = { label: 'Standard Pacing', color: 'text-muted-foreground', icon: <Zap className="w-3 h-3" /> };

    if ((user?.dailyQuestionsAnswered || 0) > 5) {
      if (avgTime < 4) {
        trustMultiplier = 0.3;
        feedback = { label: 'Speed Penalty (0.3x)', color: 'text-rose-500', icon: <AlertTriangle className="w-3 h-3" /> };
      } else if (avgTime >= 15 && avgTime <= 90) {
        trustMultiplier = 1.2;
        feedback = { label: 'Focus Bonus (1.2x)', color: 'text-emerald-500', icon: <Sparkles className="w-3 h-3" /> };
      }
    }

    return { tierMult, trustMultiplier, feedback, totalMult: tierMult * trustMultiplier };
  }, [user, questionTimes]);

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
    const baseTotal = readyTasks.reduce((acc, task) => acc + task.reward, 0);
    // Apply multipliers exactly like server
    return Math.floor(baseTotal * calibration.totalMult);
  }, [tasks, calibration]);

  const handleClaimReward = async (isRecovery = false) => {
    if (!user || !firestore || (claiming && !isRecovery)) return;
    if (isRecovery) setRecovering(true); else setClaiming(true);
    setServerWarning(null);
    
    try {
      const avgTime = questionTimes.length > 0 ? questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length : 0;
      const response = await fetch('/api/daily-task', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          userId: user.uid, 
          dailyQuestionsAnswered: user.dailyQuestionsAnswered || 0, 
          dailyTestsFinished: user.dailyTestsFinished || 0, 
          mistakesReviewed: user.mistakesReviewed || 0, 
          streakCount: user.streakCount || 0, 
          dailyCreditEarned: user.dailyCreditEarned || 0, 
          taskLoginClaimed: !!user.taskLoginClaimed, 
          taskQuestionsClaimed: !!user.taskQuestionsClaimed, 
          taskMockClaimed: !!user.taskMockClaimed, 
          taskMistakesClaimed: !!user.taskMistakesClaimed, 
          lastActiveDate: user.lastActiveDate, 
          lastTaskReset: user.lastTaskReset,
          totalSessionTime: (Date.now() - sessionStartTime) / 1000, 
          averageQuestionTime: avgTime, 
          isPro: !!user.isPro, 
          userTier: user.userTier || 'Bronze', 
          deviceFingerprint, 
          isStreakRecoveryRequested: isRecovery 
        }) 
      });
      const result = await response.json();
      
      const userRef = doc(firestore, 'users', user.uid);

      if (result.shouldResetDaily) {
        await updateDoc(userRef, {
          dailyQuestionsAnswered: 0,
          dailyTestsFinished: 0,
          dailyAiUsage: 0,
          dailyCreditEarned: 0,
          dailyAdCount: 0,
          taskLoginClaimed: false,
          taskQuestionsClaimed: false,
          taskMockClaimed: false,
          taskMistakesClaimed: false,
          lastTaskReset: serverTimestamp()
        });
        toast({ title: "New Academic Day!", description: "Daily tasks have been reset." });
        return;
      }

      if (result.reward > 0 || result.streakAction === 'recovered') {
        const updateData: any = { 
          credits: increment(result.reward - (isRecovery ? 50 : 0)), 
          dailyCreditEarned: increment(result.reward), 
          taskLoginClaimed: result.tasksCompleted.includes('login') || !!user.taskLoginClaimed, 
          taskQuestionsClaimed: result.tasksCompleted.includes('questions') || !!user.taskQuestionsClaimed, 
          taskMockClaimed: result.tasksCompleted.includes('mock') || !!user.taskMockClaimed, 
          taskMistakesClaimed: result.tasksCompleted.includes('mistakes') || !!user.taskMistakesClaimed, 
          lastActiveDate: serverTimestamp() 
        };
        if (result.streakAction === 'recovered') updateData.streakCount = (user.streakCount || 0) + 1;
        await updateDoc(userRef, updateData);
        
        if (result.reward > 0) {
          setLastClaimedReward(result.reward);
          if (result.warning) setServerWarning(result.warning);
          setShowSuccess(true);
        } else {
          toast({ 
            variant: "reward",
            title: isRecovery ? "Streak Recovered!" : "Mission Refilled!", 
            description: isRecovery ? "Your progress has been preserved." : "Keep up the analytical pace."
          });
        }
      } else if (result.error) {
        toast({ variant: "destructive", title: "Sync Failed", description: result.error });
      }
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Error", description: "Cloud sync failed." }); 
    } finally { 
      setClaiming(false); 
      setRecovering(false); 
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
                  <div className={cn("flex items-center gap-1 text-[9px] font-bold", calibration.feedback.color)}>
                    {calibration.feedback.icon}
                    <span>{calibration.feedback.label}</span>
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
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-primary" /> Reward Calibration</span>
              <span>{Math.round(totalProgress)}% Complete</span>
            </div>
            <Progress value={totalProgress} className="h-2 rounded-full bg-muted shadow-inner" />
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-3">
            {tasks.map((task) => {
              const isComplete = task.current >= task.goal;
              const adjustedReward = Math.floor(task.reward * calibration.totalMult);
              
              return (
                <div key={task.id} className={cn("p-4 rounded-[1.5rem] border transition-all flex items-center justify-between group", task.isClaimed ? "opacity-40 bg-muted/20 grayscale" : isComplete ? "bg-accent/5 border-accent/30 shadow-sm" : "bg-card border-border hover:border-primary/30")}>
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", task.bgColor, task.color)}>{task.icon}</div>
                    <div><p className="text-sm font-bold text-foreground">{task.title}</p><p className="text-[10px] font-medium text-muted-foreground leading-none">{task.description}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-yellow-500/5 px-2 py-1 rounded-lg border border-yellow-500/10">
                      <Coins className="w-3 h-3 text-yellow-600 fill-current" />
                      <span className="text-[10px] font-black text-yellow-700">
                        {task.isClaimed ? `+${task.reward}` : `+${adjustedReward}`}
                      </span>
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
              {claiming ? 'Syncing...' : canClaimAny ? `Claim ${estimatedReward} Credits` : 'Build Readiness'}
            </Button>
            <Button variant="outline" onClick={() => handleClaimReward(true)} disabled={recovering || (typeof user?.credits === 'number' ? user.credits : 0) < 50 || !!user?.taskLoginClaimed} className="h-14 rounded-2xl font-bold text-sm gap-2 border-2 border-orange-500/20 text-orange-600 hover:bg-orange-50">
              {recovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Streak Saver (50c)
            </Button>
          </div>

          <div className="p-4 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/10 flex items-start gap-3">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                <span className="text-primary font-bold uppercase">Pedagogical Note:</span> 
                Deeper focus (15s+ per item) maximizes reward calibration. Items completed under 4s trigger quality penalties.
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
                  Academic Calibration Successful
                </DialogDescription>
              </DialogHeader>
            </motion.div>

            {serverWarning && (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-start gap-2 text-left">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <p className="text-[9px] font-bold text-rose-700 leading-tight">{serverWarning}</p>
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-muted/30 rounded-2xl p-4 border border-border/50 flex flex-col items-center gap-1"
            >
              <span className="text-[9px] font-black uppercase text-muted-foreground">Reward Added</span>
              <div className="flex items-center gap-2">
                <Coins className="w-6 h-6 text-yellow-600 fill-current" />
                <span className="text-3xl font-black text-foreground">+{claimedReward}</span>
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
