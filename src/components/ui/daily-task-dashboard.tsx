'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Coins, Trophy, Flame, Loader2, BookOpen, Target, Clock, Star, Gift, TrendingUp, Key, ShieldAlert } from "lucide-react";
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
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);
  const [abuseWarning, setAbuseWarning] = useState<string | null>(null);

  useEffect(() => {
    const generateFingerprint = () => {
      if (typeof window === 'undefined') return;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);
      }
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas ? canvas.toDataURL() : 'no-canvas'
      ].join('|');
      setDeviceFingerprint(btoa(fingerprint).substring(0, 16));
    };
    generateFingerprint();
  }, []);

  useEffect(() => {
    const handleQuestionAnswered = () => {
      const now = Date.now();
      const timeSinceStart = (now - sessionStartTime) / 1000;
      setQuestionTimes(prev => [...prev, timeSinceStart]);
      setSessionStartTime(now);
    };
    window.addEventListener('questionAnswered', handleQuestionAnswered);
    return () => window.removeEventListener('questionAnswered', handleQuestionAnswered);
  }, [sessionStartTime]);

  useEffect(() => {
    const checkAndResetTasks = async () => {
      if (!user || !firestore) return;
      try {
        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) return;
        const userData = userDoc.data();
        const lastReset = userData?.lastTaskReset?.toDate ? userData.lastTaskReset.toDate() : null;
        
        const now = new Date();
        const resetNeeded = !lastReset || (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60) >= 24;

        if (resetNeeded) {
          await updateDoc(userRef, {
            dailyQuestionsAnswered: 0,
            dailyTestsFinished: 0,
            mistakesReviewed: 0,
            taskLoginClaimed: false,
            taskQuestionsClaimed: false,
            taskMockClaimed: false,
            taskMistakesClaimed: false,
            dailyCreditEarned: 0,
            lastTaskReset: serverTimestamp()
          });
          toast({ title: "🔄 Daily Tasks Reset!", description: "Your daily missions have been refreshed." });
        }
      } catch (error) {
        console.error('Error checking daily task reset:', error);
      }
    };
    checkAndResetTasks();
  }, [user, firestore]);

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
      title: 'Answer Questions', 
      description: 'Complete items to build readiness',
      reward: 5, goal: 20, current: user?.dailyQuestionsAnswered || 0,
      isClaimed: !!user?.taskQuestionsClaimed,
      icon: <Target className="w-5 h-5" />, color: 'text-blue-600', bgColor: 'bg-blue-500/10'
    },
    { 
      id: 'mock', 
      title: 'Mock Exam', 
      description: 'Finish a high-fidelity simulation',
      reward: 10, goal: 1, current: user?.dailyTestsFinished || 0,
      isClaimed: !!user?.taskMockClaimed,
      icon: <Trophy className="w-5 h-5" />, color: 'text-amber-600', bgColor: 'bg-amber-500/10'
    },
    { 
      id: 'mistakes', 
      title: 'Review Mistakes', 
      description: 'Learn from analytical feedback',
      reward: 5, goal: 10, current: user?.mistakesReviewed || 0,
      isClaimed: !!user?.taskMistakesClaimed,
      icon: <BookOpen className="w-5 h-5" />, color: 'text-rose-600', bgColor: 'bg-rose-500/10'
    }
  ];

  const totalProgress = tasks.reduce((acc, task) => acc + Math.min((task.current / task.goal) * 100, 100), 0) / tasks.length;
  const canClaimAny = tasks.some(t => t.current >= t.goal && !t.isClaimed);
  const totalEarnedToday = tasks.filter(t => t.current >= t.goal && !t.isClaimed).reduce((acc, task) => acc + task.reward, 0);

  const handleClaimReward = async () => {
    if (!user || !firestore || claiming) return;
    setClaiming(true);
    setAbuseWarning(null);
    
    try {
      const averageQuestionTime = questionTimes.length > 0 ? questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length : 0;
      const totalSessionTime = (Date.now() - sessionStartTime) / 1000;
      
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
          totalSessionTime,
          averageQuestionTime,
          isPro: !!user.isPro,
          userTier: user.userTier || 'Bronze',
          deviceFingerprint
        }),
      });
      
      const result = await response.json();
      
      if (result.reward > 0) {
        const userRef = doc(firestore, 'users', user.uid);
        const updateData: any = {
          credits: increment(result.reward),
          dailyCreditEarned: increment(result.reward),
          taskLoginClaimed: result.tasksCompleted.includes('login') || !!user.taskLoginClaimed,
          taskQuestionsClaimed: result.tasksCompleted.includes('questions') || !!user.taskQuestionsClaimed,
          taskMockClaimed: result.tasksCompleted.includes('mock') || !!user.taskMockClaimed,
          taskMistakesClaimed: result.tasksCompleted.includes('mistakes') || !!user.taskMistakesClaimed,
          lastActiveDate: serverTimestamp()
        };
        
        if (result.abuseFlags) {
          updateData.abuseFlags = result.abuseFlags;
          updateData.lastAbuseWarning = serverTimestamp();
        }
        
        await updateDoc(userRef, updateData);
        toast({ title: "🎉 Mission Accomplished!", description: `Earned ${result.reward} AI Credits.` });
        
        if (result.warning) {
          setAbuseWarning(result.warning);
        }
      } else if (result.error) {
        toast({ variant: "destructive", title: "Claim Failed", description: result.error });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Could not process rewards." });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
      <CardHeader className="bg-muted/30 p-4 md:p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Target className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl md:text-2xl font-black tracking-tight">Daily Mission</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Master the curriculum</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-primary px-4 py-2 rounded-2xl shadow-lg shadow-primary/20">
            <Flame className="w-5 h-5 text-primary-foreground fill-current" />
            <div className="text-primary-foreground">
              <p className="text-lg font-black leading-none">{user?.streakCount || 0}</p>
              <p className="text-[10px] font-bold opacity-80 uppercase">Streak</p>
            </div>
          </div>
        </div>
        
        {abuseWarning && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 animate-pulse">
            <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-[10px] font-black text-destructive uppercase tracking-widest leading-tight">{abuseWarning}</p>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Daily Progress</span>
            <span className="text-primary">{Math.round(totalProgress)}%</span>
          </div>
          <Progress value={totalProgress} className="h-3 rounded-full bg-muted" />
        </div>
      </CardHeader>
      
      <CardContent className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 gap-3">
          {tasks.map((task) => {
            const isComplete = task.current >= task.goal;
            const progress = Math.min((task.current / task.goal) * 100, 100);
            return (
              <div key={task.id} className={cn(
                "p-4 rounded-2xl border-2 transition-all",
                task.isClaimed ? "opacity-50 bg-muted/20 border-transparent" : isComplete ? "bg-accent/10 border-accent/20" : "bg-muted/10 border-border"
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shadow-sm", task.bgColor, task.color)}>{task.icon}</div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-foreground">{task.title}</p>
                      <p className="text-[10px] font-medium text-muted-foreground line-clamp-1">{task.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 bg-yellow-500/10 px-2 py-0.5 rounded-lg border border-yellow-500/20">
                      <Coins className="w-3 h-3 text-yellow-600" />
                      <span className="text-[10px] font-black text-yellow-700">+{task.reward}</span>
                    </div>
                    {task.isClaimed ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-1" /> : isComplete ? <Star className="w-5 h-5 text-amber-500 fill-current mt-1" /> : <span className="text-xs font-medium text-muted-foreground mt-1">{task.current}/{task.goal}</span>}
                  </div>
                </div>
                {!task.isClaimed && <div className="mt-3"><Progress value={progress} className="h-1.5 rounded-full" /></div>}
              </div>
            );
          })}
        </div>
        <Button 
          onClick={handleClaimReward} 
          disabled={!user || claiming || !canClaimAny} 
          className="w-full h-14 rounded-2xl font-black text-lg gap-3 shadow-xl shadow-primary/30"
        >
          {claiming ? <Loader2 className="w-5 h-5 animate-spin" /> : canClaimAny ? <Gift className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
          {claiming ? 'Synchronizing...' : canClaimAny ? `Claim ${totalEarnedToday} Credits` : 'Keep Practicing'}
        </Button>
      </CardContent>
    </Card>
  );
}
