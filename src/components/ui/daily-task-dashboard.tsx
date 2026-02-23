'use client';

import React, { useState } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Coins, Zap, Trophy, Flame, Loader2, BookOpen } from "lucide-react";
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from '@/firebase';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

interface Task {
  id: string;
  title: string;
  reward: number;
  goal: number;
  current: number;
  isClaimed: boolean;
  icon: React.ReactNode;
}

export function DailyTaskDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [claiming, setClaiming] = useState(false);

  const tasks: Task[] = [
    { 
      id: 'questions', 
      title: 'Practice 20 Questions', 
      reward: 5, 
      goal: 20, 
      current: user?.dailyQuestionsAnswered || 0,
      isClaimed: !!user?.taskQuestionsClaimed,
      icon: <Zap className="w-4 h-4 text-primary" />
    },
    { 
      id: 'mock', 
      title: 'Finish 1 Mock Test', 
      reward: 10, 
      goal: 1, 
      current: user?.dailyTestsFinished || 0,
      isClaimed: !!user?.taskMockClaimed,
      icon: <Trophy className="w-4 h-4 text-yellow-500" />
    },
    { 
      id: 'mistakes', 
      title: 'Review 10 Wrong Answers', 
      reward: 5, 
      goal: 10, 
      current: user?.mistakesReviewed || 0,
      isClaimed: !!user?.taskMistakesClaimed,
      icon: <BookOpen className="w-4 h-4 text-red-500" />
    }
  ];

  const canClaimAny = tasks.some(t => t.current >= t.goal && !t.isClaimed);

  const handleClaimReward = async () => {
    if (!user || !firestore || claiming) return;
    setClaiming(true);

    try {
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
          taskQuestionsClaimed: !!user.taskQuestionsClaimed,
          taskMockClaimed: !!user.taskMockClaimed,
          taskMistakesClaimed: !!user.taskMistakesClaimed
        }),
      });
      
      const result = await response.json();
      
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Claim Process",
          description: result.error,
        });
      } else if (result.reward > 0) {
        // Perform the mutation on the client side to ensure firestore instance is valid
        const userRef = doc(firestore, 'users', user.uid);
        const updates: any = {
          credits: increment(result.reward),
          dailyCreditEarned: increment(result.reward),
          lastActiveDate: serverTimestamp()
        };

        // Track which tasks were claimed based on the server response
        if (result.tasksCompleted.includes('questions')) {
          updates.taskQuestionsClaimed = true;
        }
        if (result.tasksCompleted.includes('mock')) {
          updates.taskMockClaimed = true;
        }
        if (result.tasksCompleted.includes('mistakes')) {
          updates.taskMistakesClaimed = true;
        }

        // Update streak if milestone achieved
        if (result.tasksCompleted.includes('streak_3') || result.tasksCompleted.includes('streak_7')) {
          updates.lastTaskReset = serverTimestamp();
        }

        await updateDoc(userRef, updates);

        // Build reward description
        let rewardDescription = `You earned ${result.reward} AI Credits`;
        if (result.streakBonus > 0) {
          rewardDescription += ` (including ${result.streakBonus} streak bonus)`;
        }

        toast({
          title: "Rewards Claimed!",
          description: rewardDescription,
        });
      } else {
        toast({
          title: "Missions Update",
          description: "No new rewards available to claim yet. Finish your tracks to earn more!",
        });
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Could not connect to the rewards server.",
      });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Card className="border-none shadow-lg rounded-2xl bg-white overflow-hidden">
      <CardHeader className="bg-slate-50/50 p-4 md:p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg md:text-xl font-black tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> Daily Missions
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">Earn credits daily</CardDescription>
          </div>
          <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100 w-fit">
             <Flame className="w-4 h-4 text-orange-500 fill-current" />
             <span className="text-sm font-black">{user?.streakCount || 0} Day Streak</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 gap-3">
          {tasks.map((task) => {
            const isComplete = task.current >= task.goal;
            const progress = Math.min((task.current / task.goal) * 100, 100);

            return (
              <div key={task.id} className={cn(
                "p-4 rounded-2xl border-2 transition-all flex flex-col gap-3",
                task.isClaimed ? "bg-slate-50 opacity-60 border-slate-200" : (isComplete ? "bg-emerald-50/30 border-emerald-100" : "bg-white border-slate-100")
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white shadow-sm border flex items-center justify-center shrink-0">
                      {task.icon}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{task.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">+{task.reward} Credits</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-slate-500">{task.current}/{task.goal}</span>
                    {task.isClaimed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className={cn("w-5 h-5", isComplete ? "text-emerald-500 animate-pulse" : "text-slate-200")} />
                    )}
                  </div>
                </div>
                <Progress value={progress} className="h-2 rounded-full" />
              </div>
            );
          })}
        </div>

        <div className="pt-2">
          <Button 
            onClick={handleClaimReward} 
            disabled={!user || claiming} 
            variant={canClaimAny ? 'default' : 'outline'}
            className={cn(
              "w-full h-12 rounded-xl font-bold text-sm md:text-base gap-2",
              canClaimAny ? "bg-primary text-primary-foreground" : "text-slate-400"
            )}
          >
            {claiming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...

              </>
            ) : (canClaimAny ? 'Claim Rewards' : 'Check Rewards')}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
          <div className="text-center p-3 bg-orange-50/50 rounded-xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-orange-600 mb-1">3-Day</p>
            <p className="text-sm font-black text-orange-700">+15 Credits</p>
          </div>
          <div className="text-center p-3 bg-purple-50/50 rounded-xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-purple-600 mb-1">7-Day</p>
            <p className="text-sm font-black text-purple-700">+30 Credits</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
