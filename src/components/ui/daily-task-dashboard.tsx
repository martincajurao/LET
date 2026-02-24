'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Coins, 
  Trophy, 
  Flame, 
  Loader2, 
  BookOpen, 
  Target, 
  Star, 
  Gift, 
  TrendingUp, 
  Key, 
  ShieldAlert, 
  ShieldCheck,
  Zap,
  RotateCcw,
  Info
} from "lucide-react";
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from '@/firebase';
import { doc, updateDoc, increment, serverTimestamp, getDoc } from 'firebase/firestore';

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
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [sessionStartTime] = useState(Date.now());
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);
  const [pacingFeedback, setPacingFeedback] = useState<{label: string, color: string}>({label: 'Calibrating...', color: 'text-muted-foreground'});

  useEffect(() => {
    // Generate simple device fingerprint for anti-abuse
    if (typeof window !== 'undefined') {
      const fingerprint = [
        navigator.userAgent,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset()
      ].join('|');
      setDeviceFingerprint(btoa(fingerprint).substring(0, 16));
    }
  }, []);

  useEffect(() => {
    const handleQuestionAnswered = () => {
      const now = Date.now();
      // Estimate question time (simplified for demo)
      const time = Math.floor(Math.random() * 20) + 5; 
      setQuestionTimes(prev => [...prev, time]);
    };
    window.addEventListener('questionAnswered', handleQuestionAnswered);
    return () => window.removeEventListener('questionAnswered', handleQuestionAnswered);
  }, []);

  useEffect(() => {
    if (questionTimes.length === 0) return;
    const avg = questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length;
    if (avg < 5) setPacingFeedback({label: 'High Speed Risk', color: 'text-rose-500'});
    else if (avg < 15) setPacingFeedback({label: 'Good Pacing', color: 'text-amber-500'});
    else setPacingFeedback({label: 'Deep Focus', color: 'text-emerald-500'});
  }, [questionTimes]);

  const tasks: Task[] = [
    {
      id: 'login',
      title: 'Daily Entrance',
      description: 'Access simulation vault',
      reward: 5, goal: 1, current: user ? 1 : 0,
      isClaimed: !!user?.taskLoginClaimed,
      icon: <Key className="w-5 h-5" />, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10'
    },
    { 
      id: 'questions', 
      title: 'Item Mastery', 
      description: 'Complete board items',
      reward: 10, goal: user?.userTier === 'Platinum' ? 35 : 20, 
      current: user?.dailyQuestionsAnswered || 0,
      isClaimed: !!user?.taskQuestionsClaimed,
      icon: <Target className="w-5 h-5" />, color: 'text-blue-600', bgColor: 'bg-blue-500/10'
    },
    { 
      id: 'mock', 
      title: 'Full Simulation', 
      description: 'Finish a timed mock test',
      reward: 15, goal: 1, current: user?.dailyTestsFinished || 0,
      isClaimed: !!user?.taskMockClaimed,
      icon: <Trophy className="w-5 h-5" />, color: 'text-amber-600', bgColor: 'bg-amber-500/10'
    },
    { 
      id: 'mistakes', 
      title: 'Review Insights', 
      description: 'Analyze pedagogical mistakes',
      reward: 10, goal: 10, current: user?.mistakesReviewed || 0,
      isClaimed: !!user?.taskMistakesClaimed,
      icon: <BookOpen className="w-5 h-5" />, color: 'text-rose-600', bgColor: 'bg-rose-500/10'
    }
  ];

  const totalProgress = tasks.reduce((acc, task) => acc + Math.min((task.current / task.goal) * 100, 100), 0) / tasks.length;
  const canClaimAny = tasks.some(t => t.current >= t.goal && !t.isClaimed);
  const totalEarnedToday = tasks.filter(t => t.current >= t.goal && !t.isClaimed).reduce((acc, task) => acc + task.reward, 0);

  const handleClaimReward = async (isRecovery = false) => {
    if (!user || !firestore || (claiming && !isRecovery)) return;
    if (isRecovery) setRecovering(true);
    else setClaiming(true);
    
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
          totalSessionTime: (Date.now() - sessionStartTime) / 1000,
          averageQuestionTime: avgTime,
          isPro: !!user.isPro,
          userTier: user.userTier || 'Bronze',
          deviceFingerprint,
          isStreakRecoveryRequested: isRecovery
        }),
      });
      
      const result = await response.json();
      
      if (result.reward > 0 || result.streakAction === 'recovered') {
        const userRef = doc(firestore, 'users', user.uid);
        const updateData: any = {
          credits: increment(result.reward - (isRecovery ? 50 : 0)),
          dailyCreditEarned: increment(result.reward),
          taskLoginClaimed: result.tasksCompleted.includes('login') || !!user.taskLoginClaimed,
          taskQuestionsClaimed: result.tasksCompleted.includes('questions') || !!user.taskQuestionsClaimed,
          taskMockClaimed: result.tasksCompleted.includes('mock') || !!user.taskMockClaimed,
          taskMistakesClaimed: result.tasksCompleted.includes('mistakes') || !!user.taskMistakesClaimed,
          lastActiveDate: serverTimestamp()
        };
        
        if (result.streakAction === 'recovered') {
          updateData.streakCount = (user.streakCount || 0) + 1;
        }
        
        await updateDoc(userRef, updateData);
        toast({ title: isRecovery ? "🔥 Streak Recovered!" : "🎉 Mission Updated!", description: `Calibrated with ${result.trustMultiplier}x Trust Multiplier.` });
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
    <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden">
      <CardHeader className="bg-muted/30 p-6 md:p-8 border-b space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
              <Target className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">Daily Missions</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[9px] uppercase">Tier: {user?.userTier || 'Bronze'}</Badge>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                  <Zap className="w-3 h-3 text-primary" />
                  <span>{pacingFeedback.label}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active Streak</span>
              <div className="flex items-center gap-2">
                <Flame className="w-6 h-6 text-orange-500 fill-current" />
                <span className="text-3xl font-black text-foreground">{user?.streakCount || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> Learning Quality</span>
            <span className="text-primary">{Math.round(totalProgress)}%</span>
          </div>
          <Progress value={totalProgress} className="h-4 rounded-full bg-muted shadow-inner" />
        </div>
      </CardHeader>
      
      <CardContent className="p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {tasks.map((task) => {
            const isComplete = task.current >= task.goal;
            const progress = Math.min((task.current / task.goal) * 100, 100);
            return (
              <div key={task.id} className={cn(
                "p-5 rounded-[1.75rem] border-2 transition-all relative overflow-hidden group",
                task.isClaimed ? "opacity-40 bg-muted/20 border-transparent grayscale" : isComplete ? "bg-accent/5 border-accent/30 shadow-md" : "bg-card border-border hover:border-primary/30"
              )}>
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110", task.bgColor, task.color)}>{task.icon}</div>
                    <div>
                      <p className="text-sm font-black text-foreground">{task.title}</p>
                      <p className="text-[10px] font-medium text-muted-foreground line-clamp-1">{task.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1.5 bg-yellow-500/10 px-2.5 py-1 rounded-lg border border-yellow-500/20">
                      <Coins className="w-3.5 h-3.5 text-yellow-600 fill-current" />
                      <span className="text-[11px] font-black text-yellow-700">+{task.reward}</span>
                    </div>
                    {task.isClaimed ? (
                      <Badge variant="outline" className="text-[8px] font-black uppercase text-emerald-600 border-emerald-500/30">Claimed</Badge>
                    ) : isComplete ? (
                      <Star className="w-5 h-5 text-amber-500 fill-current animate-bounce" />
                    ) : (
                      <span className="text-[10px] font-black text-muted-foreground">{task.current} / {task.goal}</span>
                    )}
                  </div>
                </div>
                {!task.isClaimed && <div className="mt-4"><Progress value={progress} className="h-1.5 rounded-full" /></div>}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button 
            onClick={() => handleClaimReward()} 
            disabled={!user || claiming || !canClaimAny} 
            className="h-16 rounded-2xl font-black text-lg gap-3 shadow-xl shadow-primary/30 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            {claiming ? <Loader2 className="w-6 h-6 animate-spin" /> : canClaimAny ? <Gift className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
            {claiming ? 'Syncing...' : canClaimAny ? `Claim ${totalEarnedToday} Credits` : 'Build Readiness'}
          </Button>

          <Button 
            variant="outline"
            onClick={() => handleClaimReward(true)} 
            disabled={recovering || (user?.credits || 0) < 50 || !!user?.taskLoginClaimed} 
            className="h-16 rounded-2xl font-black text-base gap-3 border-2 border-orange-500/20 text-orange-600 hover:bg-orange-50"
          >
            {recovering ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
            Streak Saver (50c)
          </Button>
        </div>

        <div className="p-4 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/20 flex items-start gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">
            <span className="text-primary font-black uppercase">Academic Tip:</span> Simulations are most effective when items are analyzed for at least 15 seconds. Rapid guessing reduces AI credit rewards.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
